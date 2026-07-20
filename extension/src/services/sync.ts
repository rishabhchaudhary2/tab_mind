// src/services/sync.ts
//
// Every write to Supabase goes through here instead of calling
// supabase.from(...).update(...) directly from your UI or other services.
//
// Why: this gives us three things for free —
//   1. Offline safety: if Chrome is offline, the write sits in a queue
//      in chrome.storage.local and flushes when connectivity returns.
//   2. Conflict handling: writes are conditional on a version number,
//      so two people editing the same row can't silently clobber each
//      other. The loser's client self-corrects via realtime.ts.
//   3. Ordering: mutations flush in the order they were queued.

import { getSupabaseClient } from "./supabase/client"; // your existing Supabase client

const supabase=getSupabaseClient();

// ---------- Types ----------

type MutationTable = "custom_folders" | "folder_tabs";

type QueuedMutation = {
  id: string;              // client-side uuid, used to dedupe echoes
  table: MutationTable;
  rowId: string;
  patch: Record<string, unknown>;
  expectedVersion: number; // version of the row this mutation was based on
  createdAt: number;
};

// ---------- Module state ----------

const OUTBOX_KEY = "tabmind_outbox";
let flushing = false;

// Flush again whenever connectivity comes back.
if (typeof self !== "undefined" && "addEventListener" in self) {
  self.addEventListener("online", () => {
    void flushOutbox();
  });
}

// ---------- Public API ----------

/**
 * Queue a mutation. Returns the client-side mutation id.
 * Call this AFTER you've already updated local state optimistically.
 */
export async function queueMutation(m: {
  table: MutationTable;
  rowId: string;
  patch: Record<string, unknown>;
  expectedVersion: number;
}): Promise<string> {
  const mutation: QueuedMutation = {
    id: crypto.randomUUID(),
    table: m.table,
    rowId: m.rowId,
    patch: m.patch,
    expectedVersion: m.expectedVersion,
    createdAt: Date.now(),
  };

  const outbox = await readOutbox();
  outbox.push(mutation);
  await writeOutbox(outbox);

  // Fire and forget — UI already updated optimistically.
  void flushOutbox();

  return mutation.id;
}

/** Move a folder or tab: change its position_key, optionally its parent folder. */
export async function moveItem(params: {
  table: MutationTable;
  rowId: string;
  newPositionKey: string;
  newFolderId?: string; // only used when moving a tab into a different folder
  currentVersion: number;
}) {
  const patch: Record<string, unknown> = { position_key: params.newPositionKey };
  if (params.newFolderId) patch.folder_id = params.newFolderId;

  return queueMutation({
    table: params.table,
    rowId: params.rowId,
    patch,
    expectedVersion: params.currentVersion,
  });
}

/** Rename a folder or tab. */
export async function renameItem(
  table: MutationTable,
  rowId: string,
  newName: string,
  currentVersion: number
) {
  const patch = table === "custom_folders" ? { name: newName } : { title: newName };
  return queueMutation({ table, rowId, patch, expectedVersion: currentVersion });
}

/**
 * Soft-delete: sets is_deleted=true instead of a hard DELETE.
 * This avoids foreign-key errors when someone else edits a row
 * that's being deleted concurrently.
 */
export async function deleteItem(
  table: MutationTable,
  rowId: string,
  currentVersion: number
) {
  return queueMutation({
    table,
    rowId,
    patch: { is_deleted: true },
    expectedVersion: currentVersion,
  });
}

// ---------- Internals ----------

async function readOutbox(): Promise<QueuedMutation[]> {
  const result = await chrome.storage.local.get(OUTBOX_KEY);

  return (result[OUTBOX_KEY] as QueuedMutation[]) ?? [];
}

async function writeOutbox(outbox: QueuedMutation[]) {
  await chrome.storage.local.set({ [OUTBOX_KEY]: outbox });
}

async function flushOutbox() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  flushing = true;
  try {
    let outbox = await readOutbox();

    while (outbox.length > 0) {
      const mutation = outbox[0];
      const ok = await sendMutation(mutation);

      if (!ok) {
        // Network or auth error — leave it in the queue, try again later.
        break;
      }

      outbox = outbox.slice(1);
      await writeOutbox(outbox);
    }
  } finally {
    flushing = false;
  }
}

async function sendMutation(mutation: QueuedMutation): Promise<boolean> {
  const supabase=getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Conditional update: only apply if the row is still at the version
  // this mutation was based on. If a concurrent write already bumped
  // the version, this affects 0 rows — that's fine, we drop the
  // mutation and let the incoming realtime event bring the local
  // client back in sync with the winning write.
  const { data, error } = await supabase
    .from(mutation.table)
    .update({
      ...mutation.patch,
      // version: mutation.expectedVersion + 1,
      // updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", mutation.rowId)
    .eq("version", mutation.expectedVersion)
    .select();

  if (error) {
    console.error("[sync] mutation failed, will retry:", error.message);
    return false;
  }

  if (!data || data.length === 0) {
    // Lost the race. Treat as success so we move on to the next mutation.
    // realtime.ts will deliver the winning row and our store will update.
    return true;
  }

  return true;
}