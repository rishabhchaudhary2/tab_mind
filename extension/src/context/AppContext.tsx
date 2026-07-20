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
} from '../services/supabase/store';
import {
  joinWorkspace,
  leaveWorkspace,
  onFolderChange,
  onTabChange,
  setCurrentUser,
} from '../services/realtime';


// Shape UI callers pass when adding a tab — only the fields they know.
// The store fills in workspace_id, folder_id, position_key, version.
type NewTabInput = Pick<Tab, 'title' | 'url' | 'favicon'>;

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
  addTab: (workspaceId: string, folderId: string, tab: NewTabInput) => void;
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
    if (!isSupabaseConfigured) return null;
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
        if (!prev) return nextWorkspaces[0] ?? null;
        return nextWorkspaces.find((w) => w.id === prev.id) ?? (nextWorkspaces[0] ?? null);
      });

      setActiveFolder((prev) => {
        if (!prev) return null;
        for (const ws of nextWorkspaces) {
          const found = ws.folders.find((f) => f.id === prev.id);
          if (found) return found;
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

  // Subscribe to realtime updates for the currently active workspace.
// Log-only for now — we're just verifying events arrive.
useEffect(() => {
  if (!activeWorkspace) {
    leaveWorkspace();
    return;
  }

  joinWorkspace(activeWorkspace.id);

 const unsubFolder = onFolderChange((change) => {
  if (change.isOwnWrite) return; // handled by our own optimistic path later

  setWorkspaces((prev) => {
    return prev.map((ws) => {
      if (ws.id !== change.row.workspace_id) return ws;

      if (change.eventType === 'DELETE' || change.row.is_deleted) {
        // Remove the folder from state
        const folders = ws.folders.filter((f) => f.id !== change.row.id);
        return { ...ws, folders, folderCount: folders.length };
      }

      // INSERT or UPDATE — upsert into folders, sorted by positionKey
      const existing = ws.folders.find((f) => f.id === change.row.id);
      const nextFolder: Folder = {
        id: change.row.id,
        name: change.row.name,
        color: (change.row.color ?? 'purple') as Folder['color'],
        tabCount: existing?.tabCount ?? 0,
        tabs: existing?.tabs ?? [],
        workspaceId: change.row.workspace_id,
        positionKey: change.row.position_key,
        version: change.row.version,
      };

      const others = ws.folders.filter((f) => f.id !== change.row.id);
      const folders = [...others, nextFolder].sort((a, b) =>
        a.positionKey.localeCompare(b.positionKey),
      );
      return { ...ws, folders, folderCount: folders.length };
    });
  });
});

const unsubTab = onTabChange((change) => {
  if (change.isOwnWrite) return;

  setWorkspaces((prev) => {
    return prev.map((ws) => {
      if (ws.id !== change.row.workspace_id) return ws;

      const folders = ws.folders.map((f) => {
        if (f.id !== change.row.folder_id) return f;

        if (change.eventType === 'DELETE' || change.row.is_deleted) {
          const tabs = f.tabs.filter((t) => t.id !== change.row.id);
          return { ...f, tabs, tabCount: tabs.length };
        }

        const nextTab: Tab = {
          id: change.row.id,
          title: change.row.title,
          url: change.row.url,
          domain: (() => {
            try { return new URL(change.row.url).hostname.replace(/^www\./, ''); }
            catch { return 'unknown'; }
          })(),
          favicon: change.row.favicon_url ?? undefined,
          sourceTag: 'purple',
          sourceColor: 'purple',
          folderId: change.row.folder_id,
          workspaceId: change.row.workspace_id,
          positionKey: change.row.position_key,
          version: change.row.version,
        };

        const others = f.tabs.filter((t) => t.id !== change.row.id);
        const tabs = [...others, nextTab].sort((a, b) =>
          a.positionKey.localeCompare(b.positionKey),
        );
        return { ...f, tabs, tabCount: tabs.length };
      });

      return {
        ...ws,
        folders,
        tabCount: folders.reduce((sum, f) => sum + f.tabs.length, 0),
      };
    });
  });

  // If the active folder is the one that just changed, refresh the
  // activeFolder reference so the TabList re-renders.
  setActiveFolder((prev) => {
    if (!prev || prev.id !== change.row.folder_id) return prev;
    // We'll refresh via the workspaces update below on the next render.
    // Force a fresh reference by shallow-copying:
    return { ...prev };
  });
});

  return () => {
    unsubFolder();
    unsubTab();
    leaveWorkspace();
  };
}, [activeWorkspace]);



  useEffect(() => {
    if (!client) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) setAuthError(error.message);
        setUser(data.session?.user ?? null);
        if (data.session?.user) setCurrentUser(data.session.user.id);
        setAuthLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setAuthError(error instanceof Error ? error.message : 'Failed to initialize authentication');
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthError(null);
      // ADD THIS LINE:
  if (session?.user) setCurrentUser(session.user.id);
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

  useEffect(() => {
    refreshLiveTabs();
  }, [refreshLiveTabs]);

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

  // ─── Selection ────────────────────────────────────────────────────────────────

  const selectWorkspace = useCallback((workspace: Workspace | null) => {
    setActiveWorkspace(workspace);
    setActiveFolder(null);
  }, []);

  const selectFolder = useCallback((folder: Folder | null) => {
    setActiveFolder(folder);
  }, []);

  // ─── Workspace CRUD ──────────────────────────────────────────────────────────

  // const createWorkspace = useCallback(
  //   (name: string, color: string) => {
  //     if (!user) return;
  //     void (async () => {
  //       try {
  //         await createWorkspaceRow(user, name, color as Workspace['color']);
  //         await refreshWorkspaces();
  //       } catch (error) {
  //         console.error(error);
  //         setAuthError(error instanceof Error ? error.message : 'Failed to create workspace');
  //       }
  //     })();
  //   },
  //   [refreshWorkspaces, user],
  // );
  const createWorkspace = useCallback(
  (name: string, color: string) => {
    console.log("Create workspace clicked", name, color);

    if (!user) {
      console.log("No user");
      return;
    }

    void (async () => {
      try {
        await createWorkspaceRow(user, name, color as Workspace['color']);
        console.log("Workspace created");
        await refreshWorkspaces();
      } catch (error) {
        console.error(error);
        setAuthError(
          error instanceof Error
            ? error.message
            : "Failed to create workspace"
        );
      }
    })();
  },
  [refreshWorkspaces, user],
);

  const deleteWorkspace = useCallback(
    (workspaceId: string) => {
      if (!user) return;
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
      if (!user) return;
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

  // ─── Folder CRUD ─────────────────────────────────────────────────────────────

  const createFolder = useCallback(
    (workspaceId: string, name: string, color: string) => {
      if (!user) return;

      // Find the current last folder's position_key so we can insert
      // after it. Null = workspace has no folders yet.
      const workspace = workspaces.find((w) => w.id === workspaceId);
      const lastFolder = workspace?.folders[workspace.folders.length - 1];
      const lastPositionKey = lastFolder?.positionKey ?? null;

      void (async () => {
        try {
          await createFolderRow(user, workspaceId, name, color as Folder['color'], lastPositionKey);
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
  (_workspaceId: string, folderId: string) => {
    if (!user) return;

    let currentVersion = 0;
    for (const ws of workspaces) {
      const folder = ws.folders.find((f) => f.id === folderId);
      if (folder) {
        currentVersion = folder.version;
        break;
      }
    }

    void (async () => {
      try {
        await deleteFolderRow(user, folderId, currentVersion);
        await refreshWorkspaces();
      } catch (error) {
        console.error(error);
        setAuthError(error instanceof Error ? error.message : 'Failed to delete folder');
      }
    })();
  },
  [refreshWorkspaces, user, workspaces],
);

  const renameFolder = useCallback(
  (_workspaceId: string, folderId: string, newName: string) => {
    if (!user) return;

    // Find the current version of this folder from local state.
    let currentVersion = 0;
    for (const ws of workspaces) {
      const folder = ws.folders.find((f) => f.id === folderId);
      if (folder) {
        currentVersion = folder.version;
        break;
      }
    }

    void (async () => {
      try {
        await new Promise((r) => setTimeout(r, 3000));
        await renameFolderRow(user, folderId, newName, currentVersion);
        await refreshWorkspaces();
      } catch (error) {
        console.error(error);
        setAuthError(error instanceof Error ? error.message : 'Failed to rename folder');
      }
    })();
  },
  [refreshWorkspaces, user, workspaces],
);

  // ─── Tab CRUD ─────────────────────────────────────────────────────────────────

  const addTab = useCallback(
    (workspaceId: string, folderId: string, tab: NewTabInput) => {
      if (!user) return;

      const workspace = workspaces.find((w) => w.id === workspaceId);
      const folder = workspace?.folders.find((f) => f.id === folderId);
      const lastTab = folder?.tabs[folder.tabs.length - 1];
      const lastPositionKey = lastTab?.positionKey ?? null;

      void (async () => {
        try {
          await createTabRow(user, workspaceId, folderId, tab, lastPositionKey);
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
    if (!user) return;

    // Tabs live inside folders, so we have to walk two levels to find it.
    let currentVersion = 0;
    outer: for (const ws of workspaces) {
      for (const f of ws.folders) {
        const tab = f.tabs.find((t) => t.id === tabId);
        if (tab) {
          currentVersion = tab.version;
          break outer;
        }
      }
    }

    void (async () => {
      try {
        await deleteTabRow(user, tabId, currentVersion);
        await refreshWorkspaces();
      } catch (error) {
        console.error(error);
        setAuthError(error instanceof Error ? error.message : 'Failed to remove tab');
      }
    })();
  },
  [refreshWorkspaces, user, workspaces],
);


  // ─── Misc ────────────────────────────────────────────────────────────────────

  const openAllTabs = useCallback((folder: Folder) => {
    folder.tabs.forEach((tab) => {
      window.open(tab.url, '_blank', 'noopener,noreferrer');
    });
  }, []);

  const moveFolderTabs = useCallback(
    (_sourceFolder: Folder, _targetFolderId: string, _targetWorkspaceId: string) => {
      // TODO: Rebuild on top of sync.ts.
    },
    [],
  );

  // ─── Save Live Tabs as Workspace ─────────────────────────────────────────────

  const saveCurrentTabsAsWorkspace = useCallback(
    async (name: string, color: string) => {
      if (!user) return;

      try {
        // 1. Create the workspace and get its id.
        const workspaceId = await createWorkspaceRow(user, name, color as Workspace['color']);

        // 2. Walk each domain group, inserting one folder + its tabs.
        //    Sequential inserts for simplicity — a workspace with many
        //    tabs will be slower to save, but correctness is trivial
        //    to verify and errors leave a partial workspace the user
        //    can delete and retry.
        const domainEntries = Object.entries(liveGroupedTabs);
        let lastFolderKey: string | null = null;

        for (let i = 0; i < domainEntries.length; i++) {
          const [domain, tabs] = domainEntries[i];
          const folderColor = folderColorOptions[i % folderColorOptions.length];
          const folderName = domain.charAt(0).toUpperCase() + domain.slice(1);

          const folder = await createFolderRow(
            user,
            workspaceId,
            folderName,
            folderColor,
            lastFolderKey,
          );
          lastFolderKey = folder.positionKey;

          let lastTabKey: string | null = null;
          for (const t of tabs) {
            const tabResult = await createTabRow(
              user,
              workspaceId,
              folder.id,
              {
                title: t.title || 'Untitled',
                url: t.url,
                favicon: t.favIconUrl,
              },
              lastTabKey,
            );
            lastTabKey = tabResult.positionKey;
          }
        }

        await refreshWorkspaces();
      } catch (error) {
        console.error(error);
        setAuthError(
          error instanceof Error ? error.message : 'Failed to save live tabs as workspace',
        );
      }
    },
    [user, liveGroupedTabs, refreshWorkspaces],
  );

  // ─── Clustering — stubbed until sync.ts lands ────────────────────────────────
  //
  // Clustering does bulk delete-then-insert. Without transactional
  // batching in sync.ts, a partial failure would leave the workspace
  // in a broken state. Better to build it once we have that layer.

  const clusterNotYet = useCallback(() => {
    setAuthError(
      'Clustering will be rebuilt on top of sync.ts. Coming soon.',
    );
  }, []);

  const clusterTabsByDomain = useCallback((_workspaceId: string) => clusterNotYet(), [clusterNotYet]);
  const clusterTabsByTag = useCallback((_workspaceId: string) => clusterNotYet(), [clusterNotYet]);
  const clusterTabsSmart = useCallback((_workspaceId: string) => clusterNotYet(), [clusterNotYet]);

  // ─── Auth ────────────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) throw new Error('Supabase is not configured');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthError(null);
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!client) throw new Error('Supabase is not configured');
      const { error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      setAuthError(null);
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
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