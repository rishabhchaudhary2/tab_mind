// src/services/supabase/store.ts
//
// Read + write layer for workspaces, folders, and tabs.
//
// Writes go directly to Supabase for now. When we add sync.ts (step 6),
// mutations will be routed through an outbox with version-conditional
// updates. Until then, AppContext calls refreshWorkspaces() after every
// write to reload state — inefficient but simple and correct.

import type { User } from '@supabase/supabase-js';
import type {
  Folder,
  FolderColor,
  Tab,
  TagColor,
  Workspace,
  WorkspaceColor,
} from '../../types';
import { generateKeyBetween } from '../Fractionalindex';
import { getSupabaseClient } from './client';

// ---------- Row types (mirror the schema) ----------

interface WorkspaceRow {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
}

interface FolderRow {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  position_key: string;
  is_deleted: boolean;
  version: number;
  created_by: string;
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
}

interface TabRow {
  id: string;
  workspace_id: string;
  folder_id: string;
  url: string;
  title: string;
  favicon_url: string | null;
  position_key: string;
  is_deleted: boolean;
  version: number;
  created_by: string;
  updated_by: string | null;
  added_at?: string;
  updated_at?: string;
}

// Shape callers use when creating a new tab — the DB fields we need,
// nothing else. sourceTag/sourceColor aren't stored; they're derived
// at read time.
export type NewTabInput = {
  title: string;
  url: string;
  favicon?: string;
};

// ---------- Small helpers ----------

function defaultWorkspaceColor(): WorkspaceColor {
  return 'purple';
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function folderColorOrDefault(raw: string | null): FolderColor {
  const allowed: FolderColor[] = [
    'purple', 'blue', 'red', 'orange', 'yellow', 'green', 'cyan', 'pink',
  ];
  return (allowed as string[]).includes(raw ?? '')
    ? (raw as FolderColor)
    : 'purple';
}

function tagColorFor(_domain: string): TagColor {
  return 'purple';
}

// ---------- Row → view-model reshaping ----------

function tabRowToModel(row: TabRow): Tab {
  const domain = extractDomain(row.url);
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    domain,
    favicon: row.favicon_url ?? undefined,
    sourceTag: domain,
    sourceColor: tagColorFor(domain),
    folderId: row.folder_id,
    workspaceId: row.workspace_id,
    positionKey: row.position_key,
    version: row.version,
  };
}

function folderRowToModel(row: FolderRow, tabs: Tab[]): Folder {
  return {
    id: row.id,
    name: row.name,
    color: folderColorOrDefault(row.color),
    tabCount: tabs.length,
    tabs,
    workspaceId: row.workspace_id,
    positionKey: row.position_key,
    version: row.version,
  };
}

function assembleWorkspace(
  workspaceRow: WorkspaceRow,
  folderRows: FolderRow[],
  tabRows: TabRow[],
): Workspace {
  const tabsByFolder = new Map<string, Tab[]>();
  for (const row of tabRows) {
    const list = tabsByFolder.get(row.folder_id) ?? [];
    list.push(tabRowToModel(row));
    tabsByFolder.set(row.folder_id, list);
  }

  const folders = folderRows.map((row) =>
    folderRowToModel(row, tabsByFolder.get(row.id) ?? []),
  );

  const tabCount = folders.reduce((sum, f) => sum + f.tabs.length, 0);

  return {
    id: workspaceRow.id,
    name: workspaceRow.name,
    color: defaultWorkspaceColor(),
    folderCount: folders.length,
    tabCount,
    folders,
  };
}

// ---------- Reads ----------

export async function fetchWorkspaceById(
  _user: User,
  workspaceId: string,
): Promise<Workspace | null> {
  const supabase = getSupabaseClient();

  const workspaceResp = await supabase
    .from('workspaces')
    .select('id, user_id, name, created_at')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspaceResp.error) throw workspaceResp.error;
  if (!workspaceResp.data) return null;

  const [foldersResp, tabsResp] = await Promise.all([
    supabase
      .from('custom_folders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('position_key', { ascending: true }),
    supabase
      .from('folder_tabs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('position_key', { ascending: true }),
  ]);

  if (foldersResp.error) throw foldersResp.error;
  if (tabsResp.error) throw tabsResp.error;

  return assembleWorkspace(
    workspaceResp.data as WorkspaceRow,
    (foldersResp.data ?? []) as FolderRow[],
    (tabsResp.data ?? []) as TabRow[],
  );
}

export async function fetchWorkspaces(_user: User): Promise<Workspace[]> {
  const supabase = getSupabaseClient();

  const workspacesResp = await supabase
    .from('workspaces')
    .select('id, user_id, name, created_at')
    .order('created_at', { ascending: true });

  if (workspacesResp.error) throw workspacesResp.error;

  const workspaceRows = (workspacesResp.data ?? []) as WorkspaceRow[];
  if (workspaceRows.length === 0) return [];

  const workspaceIds = workspaceRows.map((w) => w.id);

  const [foldersResp, tabsResp] = await Promise.all([
    supabase
      .from('custom_folders')
      .select('*')
      .in('workspace_id', workspaceIds)
      .eq('is_deleted', false)
      .order('position_key', { ascending: true }),
    supabase
      .from('folder_tabs')
      .select('*')
      .in('workspace_id', workspaceIds)
      .eq('is_deleted', false)
      .order('position_key', { ascending: true }),
  ]);

  if (foldersResp.error) throw foldersResp.error;
  if (tabsResp.error) throw tabsResp.error;

  const foldersByWorkspace = new Map<string, FolderRow[]>();
  for (const row of (foldersResp.data ?? []) as FolderRow[]) {
    const list = foldersByWorkspace.get(row.workspace_id) ?? [];
    list.push(row);
    foldersByWorkspace.set(row.workspace_id, list);
  }

  const tabsByWorkspace = new Map<string, TabRow[]>();
  for (const row of (tabsResp.data ?? []) as TabRow[]) {
    const list = tabsByWorkspace.get(row.workspace_id) ?? [];
    list.push(row);
    tabsByWorkspace.set(row.workspace_id, list);
  }

  return workspaceRows.map((w) =>
    assembleWorkspace(
      w,
      foldersByWorkspace.get(w.id) ?? [],
      tabsByWorkspace.get(w.id) ?? [],
    ),
  );
}

// ---------- Workspace writes ----------

/** Returns the new workspace's id so callers can add folders/tabs to it. */
export async function createWorkspaceRow(
  user: User,
  name: string,
  _color: WorkspaceColor,
): Promise<string> {
  const supabase = getSupabaseClient();

  console.log("User passed into function:", user);

const {
  data: { user: authUser },
} = await supabase.auth.getUser();

console.log("Supabase auth user:", authUser);

const {
  data: { session },
} = await supabase.auth.getSession();

console.log("Session:", session);

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      name,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function renameWorkspaceRow(
  _user: User,
  workspaceId: string,
  newName: string,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('workspaces')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', workspaceId);

  if (error) throw error;
}

export async function deleteWorkspaceRow(
  _user: User,
  workspaceId: string,
): Promise<void> {
  const supabase = getSupabaseClient();

  // Hard delete for now — cascades to folders/tabs via FK.
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId);

  if (error) throw error;
}

// ---------- Folder writes ----------

/**
 * Insert a new folder at the end of the workspace's folder list.
 * `lastPositionKey` is the position_key of the current last folder
 * (null if none) — we generate a key after it. Returns { id, positionKey }
 * so callers that need to insert tabs into the just-created folder can.
 */
export async function createFolderRow(
  user: User,
  workspaceId: string,
  name: string,
  color: FolderColor,
  lastPositionKey: string | null,
): Promise<{ id: string; positionKey: string }> {
  const supabase = getSupabaseClient();
  const positionKey = generateKeyBetween(lastPositionKey, null);

  const { data, error } = await supabase
    .from('custom_folders')
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      name,
      color,
      position_key: positionKey,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id, positionKey };
}

export async function renameFolderRow(
  user: User,
  folderId: string,
  newName: string,
  currentVersion: number,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('custom_folders')
    .update({ name: newName, updated_by: user.id })
    .eq('id', folderId)
    .eq('version', currentVersion)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    // No rows updated — either the row is gone, or someone bumped the version
    // before us. Not an error: realtime will bring us the winning state.
    console.warn('[store] renameFolderRow: no rows updated (conflict or missing row)', {
      folderId,
      expectedVersion: currentVersion,
    });
  }
}

/** Soft delete: sets is_deleted=true so concurrent edits don't hit FK errors. */
// removed soft delete for now — we can re-add it later if we want to support undo. For now, just hard delete.
export async function deleteFolderRow(
  user: User,
  folderId: string,
  currentVersion: number,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('custom_folders')
    .update({ is_deleted: true, updated_by: user.id })
    .eq('id', folderId)
    .eq('version', currentVersion)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    console.warn('[store] deleteFolderRow: no rows updated (conflict or missing row)', {
      folderId,
      expectedVersion: currentVersion,
    });
    return; // don't cascade if the delete itself didn't apply
  }

  // Cascade soft-delete to this folder's tabs. No version check on these —
  // they weren't the direct target of the user action, they're just collateral.
  // Phase 5b will route each tab through sync.ts individually.
  const { error: tabsErr } = await supabase
    .from('folder_tabs')
    .update({ is_deleted: true, updated_by: user.id })
    .eq('folder_id', folderId);

  if (tabsErr) throw tabsErr;
}

// ---------- Tab writes ----------

export async function createTabRow(
  user: User,
  workspaceId: string,
  folderId: string,
  tab: NewTabInput,
  lastPositionKey: string | null,
): Promise<{ id: string; positionKey: string }> {
  const supabase = getSupabaseClient();
  const positionKey = generateKeyBetween(lastPositionKey, null);

  const { data, error } = await supabase
    .from('folder_tabs')
    .insert({
      workspace_id: workspaceId,
      folder_id: folderId,
      created_by: user.id,
      title: tab.title || 'Untitled',
      url: tab.url,
      favicon_url: tab.favicon ?? null,
      position_key: positionKey,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id, positionKey };
}

// export async function deleteTabRow(
//   _user: User,
//   tabId: string,
// ): Promise<void> {
//   const supabase = getSupabaseClient();
//   const { error } = await supabase
//     .from('folder_tabs')
//     .delete()
//     .eq('id', tabId);
//   if (error) throw error;
// }

export async function deleteTabRow(
  user: User,
  tabId: string,
  currentVersion: number,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('folder_tabs')
    .update({ is_deleted: true, updated_by: user.id })
    .eq('id', tabId)
    .eq('version', currentVersion)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    console.warn('[store] deleteTabRow: no rows updated (conflict or missing row)', {
      tabId,
      expectedVersion: currentVersion,
    });
  }
}

// ---------- Bulk-replace / clustering — still stubbed ----------
//
// These do bulk delete-then-insert. Doing that without transactions
// or sync.ts is fragile (partial failure leaves the workspace in a
// broken state). Build these after sync.ts lands so we can batch
// mutations properly and roll back on error.

export async function replaceWorkspaceFoldersAndTabs(
  _user: User,
  _workspaceId: string,
  _folders: Folder[],
): Promise<void> {
  throw new Error(
    '[store.ts] replaceWorkspaceFoldersAndTabs is disabled — clustering ' +
    'will be rebuilt on top of sync.ts. Use saveCurrentTabsAsWorkspace or ' +
    'create folders/tabs individually for now.',
  );
}