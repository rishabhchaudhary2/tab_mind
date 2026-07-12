import { Expand, Filter, MoreHorizontal, RefreshCw, Search, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function TopBar() {
  const { searchQuery, setSearchQuery, refreshLiveTabs } = useApp();

  const openFullscreen = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL && chrome.tabs?.create) {
      void chrome.tabs.create({ url: chrome.runtime.getURL('fullscreen.html') });
      return;
    }

    window.open('/fullscreen.html', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-6">
      <div className="flex-1 flex justify-center">
        <div className="relative w-96 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tabs..."
            className="w-full h-9 bg-dark-elevated border border-dark-border rounded-lg pl-10 pr-16 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-dark-hover px-2 py-0.5 rounded">
            Ctrl+K
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={openFullscreen}
          className="px-2.5 h-8 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors flex items-center gap-1.5"
        >
          <Expand className="w-3.5 h-3.5" />
          Fullscreen
        </button>
        <button
          onClick={refreshLiveTabs}
          title="Refresh live tabs"
          className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200">
          <Filter className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200">
          <Settings className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

