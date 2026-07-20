// src/services/realtime.ts
//
// Subscribes to a workspace's changes on Supabase and calls whatever
// handlers you register whenever a folder or tab row changes. Only one
// workspace can be subscribed at a time — call leaveWorkspace() before
// switching.

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase/client"; // your existing Supabase client

const supabase=getSupabaseClient();
// ---------- Types ----------

export type FolderRow = {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  position_key: string;
  is_deleted: boolean;
  version: number;
  updated_at: string;
  updated_by: string | null;
};

export type TabRow = {
  id: string;
  workspace_id: string;
  folder_id: string;
  url: string;
  title: string;
  favicon_url: string | null;
  position_key: string;
  is_deleted: boolean;
  version: number;
  updated_at: string;
  updated_by: string | null;
};

export type Change<T> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  row: T;
  // true when this event is an echo of a write this same client just made.
  // Handy for clearing "pending" flags without re-applying the change.
  isOwnWrite: boolean;
};

type FolderHandler = (change: Change<FolderRow>) => void;
type TabHandler = (change: Change<TabRow>) => void;

// ---------- Module state ----------

let currentChannel: RealtimeChannel | null = null;
let currentUserId: string | null = null;

const folderHandlers = new Set<FolderHandler>();
const tabHandlers = new Set<TabHandler>();

// ---------- Public API ----------

/** Call this once at app start (after auth) so we can detect own-writes. */
export function setCurrentUser(userId: string) {
  currentUserId = userId;
}

/** Subscribe to one workspace. Leaves any previous subscription first. */
export function joinWorkspace(workspaceId: string) {
  leaveWorkspace();

  currentChannel = supabase
    .channel(`workspace:${workspaceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "custom_folders",
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => dispatchFolder(payload as RealtimePostgresChangesPayload<FolderRow>)
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "folder_tabs",
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => dispatchTab(payload as RealtimePostgresChangesPayload<TabRow>)
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error(`[realtime] channel error for workspace ${workspaceId}`);
      }
    });
}

export function leaveWorkspace() {
  if (currentChannel) {
    supabase.removeChannel(currentChannel);
    currentChannel = null;
  }
}

/** Register a handler for folder changes. Returns an unsubscribe function. */
export function onFolderChange(handler: FolderHandler): () => void {
  folderHandlers.add(handler);
  return () => {
    folderHandlers.delete(handler);
  };
}

export function onTabChange(handler: TabHandler): () => void {
  tabHandlers.add(handler);
  return () => {
    tabHandlers.delete(handler);
  };
}

// ---------- Internals ----------

function dispatchFolder(payload: RealtimePostgresChangesPayload<FolderRow>) {
  const row = (payload.new ?? payload.old) as FolderRow;
  const isOwnWrite = row?.updated_by === currentUserId;
  const change: Change<FolderRow> = {
    eventType: payload.eventType as Change<FolderRow>["eventType"],
    row,
    isOwnWrite,
  };
  folderHandlers.forEach((h) => h(change));
}

function dispatchTab(payload: RealtimePostgresChangesPayload<TabRow>) {
  const row = (payload.new ?? payload.old) as TabRow;
  const isOwnWrite = row?.updated_by === currentUserId;
  const change: Change<TabRow> = {
    eventType: payload.eventType as Change<TabRow>["eventType"],
    row,
    isOwnWrite,
  };
  tabHandlers.forEach((h) => h(change));
}