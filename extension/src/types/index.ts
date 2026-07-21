// src/types/index.ts

export interface Tab {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  sourceTag: string;
  sourceColor: TagColor;

  // ---- Fields added for collaboration ----
  // These come from the folder_tabs table and are needed so that
  // realtime events can locate this tab in state, and so that sync.ts
  // can do a version check when we update it.
  folderId: string;
  workspaceId: string;
  positionKey: string;
  version: number;
}

/** A live browser tab as returned by the background service worker */
export interface LiveTab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  pinned: boolean;
  domain: string;
}

export interface Folder {
  id: string;
  name: string;
  color: FolderColor;
  tabCount: number;
  tabs: Tab[];

  // Collaboration
  workspaceId: string;
  positionKey: string;
  version: number;

  // Nesting
  parentFolderId: string | null;   // null → root folder in the workspace
  children: Folder[];              // sub-folders, ordered by positionKey
}

export interface Workspace {
  id: string;
  name: string;
  color: WorkspaceColor;
  folderCount: number;
  tabCount: number;
  folders: Folder[];
}

export type FolderColor =
  | 'purple'
  | 'blue'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'pink';

export type WorkspaceColor =
  | 'purple'
  | 'blue'
  | 'red'
  | 'orange'
  | 'green'
  | 'cyan'
  | 'pink';

export type TagColor =
  | 'purple'
  | 'blue'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'pink';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
}