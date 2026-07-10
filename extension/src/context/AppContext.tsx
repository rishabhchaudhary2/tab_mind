import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import type { Folder, LiveTab, Tab, Workspace } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import {
  createFolderRow,
  createTabRow,
  createWorkspaceRow,
  deleteFolderRow,
  deleteTabRow,
  deleteWorkspaceRow,
  fetchWorkspaces,
  renameFolderRow,
  renameWorkspaceRow,
  replaceWorkspaceFoldersAndTabs,
} from '../services/supabase/store';

interface AppContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeFolder: Folder | null;
  searchQuery: string;
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
  authError: string | null;
  /** Live browser tabs grouped by domain, auto-refreshed on every tab event */
  liveGroupedTabs: Record<string, LiveTab[]>;
  liveTabsLoading: boolean;
  selectWorkspace: (workspace: Workspace | null) => void;
  selectFolder: (folder: Folder | null) => void;
  createWorkspace: (name: string, color: string) => void;
  deleteWorkspace: (workspaceId: string) => void;
  renameWorkspace: (workspaceId: string, newName: string) => void;
  createFolder: (workspaceId: string, name: string, color: string) => void;
  deleteFolder: (workspaceId: string, folderId: string) => void;
  renameFolder: (workspaceId: string, folderId: string, newName: string) => void;
  addTab: (workspaceId: string, folderId: string, tab: Omit<Tab, 'id'>) => void;
  removeTab: (workspaceId: string, folderId: string, tabId: string) => void;
  openAllTabs: (folder: Folder) => void;
  setSearchQuery: (query: string) => void;
  moveFolderTabs: (sourceFolder: Folder, targetFolderId: string, targetWorkspaceId: string) => void;
  clusterTabsByDomain: (workspaceId: string) => void;
  clusterTabsByTag: (workspaceId: string) => void;
  clusterTabsSmart: (workspaceId: string) => void;
  /** Save current live browser tabs as a named Supabase workspace */
  saveCurrentTabsAsWorkspace: (name: string, color: string) => Promise<void>;
  /** Manually refresh live tabs from the background */
  refreshLiveTabs: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const folderColorOptions: Folder['color'][] = [
  'purple',
  'blue',
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'pink',
];

function makeId() {
  return crypto.randomUUID();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [liveGroupedTabs, setLiveGroupedTabs] = useState<Record<string, LiveTab[]>>({});
  const [liveTabsLoading, setLiveTabsLoading] = useState(false);

  const client = useMemo(() => {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!client || !user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setActiveFolder(null);
      return;
    }

    setDataLoading(true);
    try {
      const nextWorkspaces = await fetchWorkspaces(user);
      setWorkspaces(nextWorkspaces);

      setActiveWorkspace((prev) => {
        if (!prev) {
          return nextWorkspaces[0] ?? null;
        }

        return nextWorkspaces.find((w) => w.id === prev.id) ?? (nextWorkspaces[0] ?? null);
      });

      setActiveFolder((prev) => {
        if (!prev) {
          return null;
        }

        for (const ws of nextWorkspaces) {
          const found = ws.folders.find((f) => f.id === prev.id);
          if (found) {
            return found;
          }
        }

        return null;
      });
    } catch (error) {
      console.error(error);
      setAuthError(error instanceof Error ? error.message : 'Failed to load workspace data');
    } finally {
      setDataLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    if (!client) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setAuthError(error.message);
        }

        setUser(data.session?.user ?? null);
        setAuthLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setAuthError(error instanceof Error ? error.message : 'Failed to initialize authentication');
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthError(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    void refreshWorkspaces();
  }, [refreshWorkspaces]);

  // ─── Live Tab Fetching ───────────────────────────────────────────────────────

  const refreshLiveTabs = useCallback(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

    setLiveTabsLoading(true);
    chrome.runtime
      .sendMessage({ type: 'GET_GROUPED_TABS' })
      .then((response: Record<string, LiveTab[]> | undefined) => {
        if (response) {
          // Attach domain key onto each tab object for convenience
          const enriched: Record<string, LiveTab[]> = {};
          for (const [domain, tabs] of Object.entries(response)) {
            enriched[domain] = tabs.map((t) => ({ ...t, domain }));
          }
          setLiveGroupedTabs(enriched);
        }
      })
      .catch((err: unknown) => {
        console.warn('Failed to fetch grouped tabs:', err);
      })
      .finally(() => {
        setLiveTabsLoading(false);
      });
  }, []);

  // Fetch live tabs immediately when the panel opens
  useEffect(() => {
    refreshLiveTabs();
  }, [refreshLiveTabs]);

  // Listen for real-time tab updates broadcast by the background service worker
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handleMessage = (message: { type: string; payload?: Record<string, LiveTab[]> }) => {
      if (message.type === 'TABS_UPDATED' && message.payload) {
        const enriched: Record<string, LiveTab[]> = {};
        for (const [domain, tabs] of Object.entries(message.payload)) {
          enriched[domain] = tabs.map((t) => ({ ...t, domain }));
        }
        setLiveGroupedTabs(enriched);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const selectWorkspace = useCallback((workspace: Workspace | null) => {
    setActiveWorkspace(workspace);
    setActiveFolder(null);
  }, []);

  const selectFolder = useCallback((folder: Folder | null) => {
    setActiveFolder(folder);
  }, []);

  const createWorkspace = useCallback(
    (name: string, color: string) => {
      if (!user) {
        return;
      }

      void (async () => {
        try {
          await createWorkspaceRow(user, name, color as Workspace['color']);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to create workspace');
        }
      })();
    },
    [refreshWorkspaces, user],
  );

  const deleteWorkspace = useCallback(
    (workspaceId: string) => {
      if (!user) {
        return;
      }

      void (async () => {
        try {
          await deleteWorkspaceRow(user, workspaceId);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to delete workspace');
        }
      })();
    },
    [refreshWorkspaces, user],
  );

  const renameWorkspace = useCallback(
    (workspaceId: string, newName: string) => {
      if (!user) {
        return;
      }

      void (async () => {
        try {
          await renameWorkspaceRow(user, workspaceId, newName);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to rename workspace');
        }
      })();
    },
    [refreshWorkspaces, user],
  );

  const createFolder = useCallback(
    (workspaceId: string, name: string, color: string) => {
      if (!user) {
        return;
      }

      const workspace = workspaces.find((w) => w.id === workspaceId);
      const position = workspace?.folders.length ?? 0;

      void (async () => {
        try {
          await createFolderRow(user, workspaceId, name, color as Folder['color'], position);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to create folder');
        }
      })();
    },
    [refreshWorkspaces, user, workspaces],
  );

  const deleteFolder = useCallback(
    (workspaceId: string, folderId: string) => {
      if (!user) {
        return;
      }

      void workspaceId;

      void (async () => {
        try {
          await deleteFolderRow(user, folderId);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to delete folder');
        }
      })();
    },
    [refreshWorkspaces, user],
  );

  const renameFolder = useCallback(
    (workspaceId: string, folderId: string, newName: string) => {
      if (!user) {
        return;
      }

      void workspaceId;

      void (async () => {
        try {
          await renameFolderRow(user, folderId, newName);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to rename folder');
        }
      })();
    },
    [refreshWorkspaces, user],
  );

  const addTab = useCallback(
    (workspaceId: string, folderId: string, tab: Omit<Tab, 'id'>) => {
      if (!user) {
        return;
      }

      const position =
        workspaces
          .find((w) => w.id === workspaceId)
          ?.folders.find((f) => f.id === folderId)
          ?.tabs.length ?? 0;

      void (async () => {
        try {
          await createTabRow(user, workspaceId, folderId, tab, position);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to add tab');
        }
      })();
    },
    [refreshWorkspaces, user, workspaces],
  );

  const removeTab = useCallback(
    (_workspaceId: string, _folderId: string, tabId: string) => {
      if (!user) {
        return;
      }

      void (async () => {
        try {
          await deleteTabRow(user, tabId);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to remove tab');
        }
      })();
    },
    [refreshWorkspaces, user],
  );

  const openAllTabs = useCallback((folder: Folder) => {
    folder.tabs.forEach((tab) => {
      window.open(tab.url, '_blank', 'noopener,noreferrer');
    });
  }, []);

  const moveFolderTabs = useCallback(
    (_sourceFolder: Folder, _targetFolderId: string, _targetWorkspaceId: string) => {
      // TODO: Implement move-tab flow.
    },
    [],
  );

  // ─── Save Live Tabs as Workspace ─────────────────────────────────────────────

  const saveCurrentTabsAsWorkspace = useCallback(
    async (name: string, color: string) => {
      if (!user) return;

      // Convert live grouped tabs into Supabase Folder objects
      const folders: Folder[] = Object.entries(liveGroupedTabs).map(([domain, tabs], idx) => {
        const colorOptions: Folder['color'][] = [
          'purple', 'blue', 'red', 'orange', 'yellow', 'green', 'cyan', 'pink',
        ];
        const folderColor = colorOptions[idx % colorOptions.length];
        const folderTabs: Tab[] = tabs.map((t) => ({
          id: crypto.randomUUID(),
          title: t.title,
          url: t.url,
          domain: t.domain,
          favicon: t.favIconUrl,
          sourceTag: domain.charAt(0).toUpperCase() + domain.slice(1),
          sourceColor: folderColor,
        }));
        return {
          id: crypto.randomUUID(),
          name: domain.charAt(0).toUpperCase() + domain.slice(1),
          color: folderColor,
          tabCount: folderTabs.length,
          tabs: folderTabs,
        };
      });

      // Create the workspace row in Supabase with all folders embedded
      await createWorkspaceRow(user, name, color as Workspace['color']);

      // Fetch the newly created (empty) workspace so we can write folders into it
      const nextWorkspaces = await fetchWorkspaces(user);
      const newWs = nextWorkspaces.find((w) => w.name === name);
      if (newWs) {
        await replaceWorkspaceFoldersAndTabs(user, newWs.id, folders);
      }

      await refreshWorkspaces();
    },
    [user, liveGroupedTabs, refreshWorkspaces],
  );

  const clusterFolders = useCallback(
    (workspaceId: string, groupingFn: (tab: Tab) => { key: string; color: Folder['color'] }) => {
      if (!user) {
        return;
      }

      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) {
        return;
      }

      const allTabs = workspace.folders.flatMap((f) => f.tabs);
      const groups: Record<string, { tabs: Tab[]; color: Folder['color'] }> = {};

      allTabs.forEach((tab) => {
        const { key, color } = groupingFn(tab);
        if (!groups[key]) {
          groups[key] = { tabs: [], color };
        }
        groups[key].tabs.push(tab);
      });

      const newFolders: Folder[] = Object.entries(groups).map(([key, data]) => ({
        id: makeId(),
        name: key,
        color: data.color,
        tabCount: data.tabs.length,
        tabs: data.tabs.map((tab) => ({ ...tab, id: makeId() })),
      }));

      void (async () => {
        try {
          await replaceWorkspaceFoldersAndTabs(user, workspaceId, newFolders);
          await refreshWorkspaces();
        } catch (error) {
          console.error(error);
          setAuthError(error instanceof Error ? error.message : 'Failed to cluster tabs');
        }
      })();
    },
    [refreshWorkspaces, user, workspaces],
  );

  const clusterTabsByDomain = useCallback(
    (workspaceId: string) => {
      clusterFolders(workspaceId, (tab) => {
        const rootDomain = tab.domain.split('.')[0] || tab.domain;
        const name = rootDomain.charAt(0).toUpperCase() + rootDomain.slice(1);
        const colorIndex = Math.abs(rootDomain.charCodeAt(0)) % folderColorOptions.length;
        return { key: name, color: folderColorOptions[colorIndex] };
      });
    },
    [clusterFolders],
  );

  const clusterTabsByTag = useCallback(
    (workspaceId: string) => {
      clusterFolders(workspaceId, (tab) => {
        const colorIndex = Math.abs(tab.sourceTag.charCodeAt(0)) % folderColorOptions.length;
        return { key: tab.sourceTag, color: folderColorOptions[colorIndex] };
      });
    },
    [clusterFolders],
  );

  const clusterTabsSmart = useCallback(
    (workspaceId: string) => {
      clusterFolders(workspaceId, (tab) => {
        const domain = tab.domain.toLowerCase();
        const tag = tab.sourceTag.toLowerCase();

        if (domain.includes('leetcode') || tag.includes('array') || tag.includes('dp') || tag.includes('hashing')) {
          return { key: 'LeetCode', color: 'purple' };
        }
        if (domain.includes('codeforces') || tag.includes('codeforces') || tag.includes('bfs')) {
          return { key: 'Codeforces', color: 'blue' };
        }
        if (domain.includes('youtube') || tag.includes('youtube') || tag.includes('video')) {
          return { key: 'YouTube', color: 'red' };
        }
        if (domain.includes('github') || tag.includes('github') || tag.includes('repo')) {
          return { key: 'GitHub', color: 'green' };
        }
        if (domain.includes('stackoverflow') || tag.includes('stackoverflow')) {
          return { key: 'StackOverflow', color: 'orange' };
        }
        if (domain.includes('arxiv') || tag.includes('paper') || tag.includes('ai/ml')) {
          return { key: 'Papers', color: 'pink' };
        }
        if (tag.includes('c++') || tag.includes('stl')) {
          return { key: 'C++/STL', color: 'yellow' };
        }
        if (
          domain.includes('.edu') ||
          domain.includes('stanford') ||
          domain.includes('harvard') ||
          tag.includes('course')
        ) {
          return { key: 'Courses', color: 'cyan' };
        }
        if (domain.includes('kubernetes') || tag.includes('devops')) {
          return { key: 'DevOps', color: 'blue' };
        }
        if (tag.includes('system') || tag.includes('design')) {
          return { key: 'System Design', color: 'orange' };
        }
        if (domain.includes('cppreference')) {
          return { key: 'C++/STL', color: 'yellow' };
        }

        return { key: 'Misc', color: 'orange' };
      });
    },
    [clusterFolders],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      setAuthError(null);
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!client) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await client.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      setAuthError(null);
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) {
      return;
    }

    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  }, [client]);

  return (
    <AppContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeFolder,
        searchQuery,
        user,
        authLoading,
        dataLoading,
        authError,
        liveGroupedTabs,
        liveTabsLoading,
        selectWorkspace,
        selectFolder,
        createWorkspace,
        deleteWorkspace,
        renameWorkspace,
        createFolder,
        deleteFolder,
        renameFolder,
        addTab,
        removeTab,
        openAllTabs,
        setSearchQuery,
        moveFolderTabs,
        clusterTabsByDomain,
        clusterTabsByTag,
        clusterTabsSmart,
        saveCurrentTabsAsWorkspace,
        refreshLiveTabs,
        signIn,
        signUp,
        signOut,
        refreshWorkspaces,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
