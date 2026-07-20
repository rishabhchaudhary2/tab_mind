export interface Tab {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  sourceTag: string;
  sourceColor: TagColor;
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
