export interface Settings {
  expandedFolders: Record<string, boolean>;
}

export interface Workspace {
  id: string;

  name: string;

  folders: Folder[];
  createdAt: number;
  updatedAt: number;
}
export interface Folder {
  id: string;

  name: string;

  parentId?: string;

//   color?: string;

  tabs: TabItem[];
}
export interface TabItem {
  id: number;

  title: string;

  url: string;

  favIconUrl?: string;

  pinned: boolean;
  lastAccessed?: number;
}
export interface Metadata {
  lru: Record<number, number>;
}

export interface AppState {
  workspaces: Workspace[];

  currentWorkspaceId: string | null;

  settings: Settings;

  metadata: Metadata;
}
export const defaultState: AppState = {
  workspaces: [],

  currentWorkspaceId: null,

  settings: {
    expandedFolders: {},
  },

  metadata: {
    lru: {},
  },
};
