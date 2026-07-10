import { AuthScreen } from './components/AuthScreen';
import { FolderList } from './components/FolderList';
import { LiveTabsPanel } from './components/LiveTabsPanel';
import { TabList } from './components/TabList';
import { TopBar } from './components/TopBar';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
import { isSupabaseConfigured } from './services/supabase/client';

function AppLayout() {
  const { authLoading, dataLoading, user, signOut, activeWorkspace, activeFolder } = useApp();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-dark-bg text-gray-200 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-dark-card border border-dark-border rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2">Supabase configuration is missing</h1>
          <p className="text-sm text-gray-400">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart Vite.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-gray-200 flex items-center justify-center">
        <p className="text-sm text-gray-400">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Show the folder list (middle column) only when a saved workspace is active
  const showFolderList = activeWorkspace !== null;
  // Show live tabs when: no saved workspace is active, OR a workspace is active but no folder selected
  const showLiveTabs = !activeFolder;

  return (
    <div className="h-screen bg-dark-bg text-foreground flex overflow-hidden min-w-[980px]">
      <WorkspaceSidebar />
      {showFolderList && <FolderList />}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="h-10 px-4 border-b border-dark-border bg-dark-card flex items-center justify-between">
          <span className="text-xs text-gray-400">{user.email}</span>
          <div className="flex items-center gap-3">
            {dataLoading && <span className="text-xs text-gray-500">Syncing...</span>}
            <button
              onClick={() => void signOut()}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        <TopBar />
        {showLiveTabs ? <LiveTabsPanel /> : <TabList />}
      </section>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

export default App;