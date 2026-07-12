import type { User } from '@supabase/supabase-js';
import type { Folder, Tab, Workspace, WorkspaceColor } from '../../types';
import { getSupabaseClient } from './client';

interface WorkspaceRow {
  id: string;
  user_id: string;
  name: string;
  tab_count: number | null;
  folders: unknown;
  created_at?: string;
}

function defaultWorkspaceColor(): WorkspaceColor {
  return 'purple';
}

function sanitizeTab(raw: unknown): Tab | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = typeof value.id === 'string' ? value.id : crypto.randomUUID();
  const title = typeof value.title === 'string' ? value.title : 'Untitled Tab';
  const url = typeof value.url === 'string' ? value.url : '#';
  const domain = typeof value.domain === 'string' ? value.domain : 'unknown';
  const sourceTag = typeof value.sourceTag === 'string' ? value.sourceTag : 'Misc';
  const sourceColor =
    typeof value.sourceColor === 'string' ? (value.sourceColor as Tab['sourceColor']) : 'purple';
  const favicon = typeof value.favicon === 'string' ? value.favicon : undefined;

  return {
    id,
    title,
    url,
    domain,
    sourceTag,
    sourceColor,
    favicon,
  };
}

function sanitizeFolder(raw: unknown): Folder | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = typeof value.id === 'string' ? value.id : crypto.randomUUID();
  const name = typeof value.name === 'string' ? value.name : 'Folder';
  const color = typeof value.color === 'string' ? (value.color as Folder['color']) : 'purple';

  const tabsRaw = Array.isArray(value.tabs) ? value.tabs : [];
  const tabs = tabsRaw.map(sanitizeTab).filter((tab): tab is Tab => Boolean(tab));

  return {
    id,
    name,
    color,
    tabCount: tabs.length,
    tabs,
  };
}

function toWorkspaceModel(row: WorkspaceRow): Workspace {
  const foldersRaw = Array.isArray(row.folders) ? row.folders : [];
  const folders = foldersRaw.map(sanitizeFolder).filter((folder): folder is Folder => Boolean(folder));

  const computedTabCount = folders.reduce((sum, folder) => sum + folder.tabs.length, 0);

  return {
    id: row.id,
    name: row.name,
    color: defaultWorkspaceColor(),
    folderCount: folders.length,
    tabCount: computedTabCount,
    folders,
  };
}

async function fetchWorkspaceById(user: User, workspaceId: string): Promise<Workspace | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select('id,user_id,name,tab_count,folders,created_at')
    .eq('user_id', user.id)
    .eq('id', workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toWorkspaceModel(data as WorkspaceRow);
}

async function persistWorkspace(user: User, workspace: Workspace): Promise<void> {
  const supabase = getSupabaseClient();

  const tabCount = workspace.folders.reduce((sum, folder) => sum + folder.tabs.length, 0);

  const payloadFolders = workspace.folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    color: folder.color,
    tabCount: folder.tabs.length,
    tabs: folder.tabs,
  }));

  const { error } = await supabase
    .from('workspaces')
    .update({
      name: workspace.name,
      folders: payloadFolders,
      tab_count: tabCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspace.id)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}

export async function fetchWorkspaces(user: User): Promise<Workspace[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select('id,user_id,name,tab_count,folders,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as WorkspaceRow[];
  return rows.map(toWorkspaceModel);
}

export async function createWorkspaceRow(user: User, name: string, _color: WorkspaceColor): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('workspaces').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    name,
    tab_count: 0,
    folders: [],
  });

  if (error) {
    throw error;
  }
}

export async function renameWorkspaceRow(user: User, workspaceId: string, newName: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('workspaces')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', workspaceId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}

export async function deleteWorkspaceRow(user: User, workspaceId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}

export async function createFolderRow(
  user: User,
  workspaceId: string,
  name: string,
  color: Folder['color'],
  _position: number,
): Promise<void> {
  const workspace = await fetchWorkspaceById(user, workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  workspace.folders.push({
    id: crypto.randomUUID(),
    name,
    color,
    tabCount: 0,
    tabs: [],
  });

  workspace.folderCount = workspace.folders.length;

  await persistWorkspace(user, workspace);
}

export async function renameFolderRow(user: User, folderId: string, newName: string): Promise<void> {
  const workspaces = await fetchWorkspaces(user);
  const workspace = workspaces.find((w) => w.folders.some((f) => f.id === folderId));

  if (!workspace) {
    throw new Error('Folder not found');
  }

  workspace.folders = workspace.folders.map((folder) =>
    folder.id === folderId ? { ...folder, name: newName } : folder,
  );

  workspace.folderCount = workspace.folders.length;

  await persistWorkspace(user, workspace);
}

export async function deleteFolderRow(user: User, folderId: string): Promise<void> {
  const workspaces = await fetchWorkspaces(user);
  const workspace = workspaces.find((w) => w.folders.some((f) => f.id === folderId));

  if (!workspace) {
    throw new Error('Folder not found');
  }

  workspace.folders = workspace.folders.filter((folder) => folder.id !== folderId);
  workspace.folderCount = workspace.folders.length;

  await persistWorkspace(user, workspace);
}

export async function createTabRow(
  user: User,
  workspaceId: string,
  folderId: string,
  tab: Omit<Tab, 'id'>,
  _position: number,
): Promise<void> {
  const workspace = await fetchWorkspaceById(user, workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  workspace.folders = workspace.folders.map((folder) => {
    if (folder.id !== folderId) {
      return folder;
    }

    const tabs = [...folder.tabs, { ...tab, id: crypto.randomUUID() }];
    return { ...folder, tabs, tabCount: tabs.length };
  });

  await persistWorkspace(user, workspace);
}

export async function deleteTabRow(user: User, tabId: string): Promise<void> {
  const workspaces = await fetchWorkspaces(user);
  const workspace = workspaces.find((w) => w.folders.some((f) => f.tabs.some((t) => t.id === tabId)));

  if (!workspace) {
    throw new Error('Tab not found');
  }

  workspace.folders = workspace.folders.map((folder) => {
    const tabs = folder.tabs.filter((tab) => tab.id !== tabId);
    return { ...folder, tabs, tabCount: tabs.length };
  });

  await persistWorkspace(user, workspace);
}

export async function replaceWorkspaceFoldersAndTabs(
  user: User,
  workspaceId: string,
  folders: Folder[],
): Promise<void> {
  const workspace = await fetchWorkspaceById(user, workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  workspace.folders = folders.map((folder) => ({
    ...folder,
    tabCount: folder.tabs.length,
  }));
  workspace.folderCount = workspace.folders.length;

  await persistWorkspace(user, workspace);
}
