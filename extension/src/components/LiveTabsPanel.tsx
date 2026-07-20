import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LiveTab } from '../types/index';
import { NewWorkspaceModal } from './NewWorkspaceModal';

const domainColors: string[] = [
  'purple', 'blue', 'red', 'orange', 'yellow', 'green', 'cyan', 'pink',
];

const colorMap: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500', border: 'border-purple-500/20' },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-500',   border: 'border-blue-500/20' },
  red:    { bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-500',    border: 'border-red-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-500', border: 'border-orange-500/20' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500', border: 'border-yellow-500/20' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-500',  border: 'border-green-500/20' },
  cyan:   { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   dot: 'bg-cyan-500',   border: 'border-cyan-500/20' },
  pink:   { bg: 'bg-pink-500/10',   text: 'text-pink-400',   dot: 'bg-pink-500',   border: 'border-pink-500/20' },
};

function FaviconOrFallback({ tab, colorKey }: { tab: LiveTab; colorKey: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const colors = colorMap[colorKey] || colorMap.purple;

  if (tab.favIconUrl && !imgFailed) {
    return (
      <img
        src={tab.favIconUrl}
        alt=""
        className="w-4 h-4 rounded-sm flex-shrink-0"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${colors.bg} ${colors.text}`}
    >
      {tab.domain.charAt(0).toUpperCase()}
    </span>
  );
}

export function LiveTabsPanel() {
  const { liveGroupedTabs, liveTabsLoading, refreshLiveTabs, searchQuery, saveCurrentTabsAsWorkspace } = useApp();
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [showSaveModal, setShowSaveModal] = useState(false);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  const isDomainExpanded = (domain: string) => {
    return expandedDomains[domain] ?? false;
  };

  const handleOpenTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const entries = Object.entries(liveGroupedTabs);

  const filteredEntries = entries
    .map(([domain, tabs]) => {
      if (!normalizedSearch) return [domain, tabs] as [string, LiveTab[]];
      const matchedTabs = tabs.filter(
        (t) =>
          t.title.toLowerCase().includes(normalizedSearch) ||
          t.url.toLowerCase().includes(normalizedSearch) ||
          domain.toLowerCase().includes(normalizedSearch),
      );
      return [domain, matchedTabs] as [string, LiveTab[]];
    })
    .filter(([, tabs]) => tabs.length > 0);

  const totalTabCount = entries.reduce((sum, [, tabs]) => sum + tabs.length, 0);

  return (
    <>
      <main className="flex-1 bg-dark-bg flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border bg-dark-card flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="text-base font-semibold text-white">Live Browser Tabs</h2>
              {liveTabsLoading && (
                <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {entries.length} domain{entries.length !== 1 ? 's' : ''} &middot; {totalTabCount} tab{totalTabCount !== 1 ? 's' : ''} currently open
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshLiveTabs}
              className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              title="Refresh live tabs"
            >
              <RefreshCw className={`w-4 h-4 ${liveTabsLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={entries.length === 0}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              Save as Workspace
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-1.5">
          {liveTabsLoading && entries.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-gray-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading live tabs...</p>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-card mx-auto mb-4 flex items-center justify-center">
                  <Globe className="w-7 h-7 text-gray-600" />
                </div>
                <h3 className="text-base font-medium text-gray-300 mb-2">
                  {totalTabCount === 0 ? 'No open tabs detected' : 'No matching tabs'}
                </h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  {totalTabCount === 0
                    ? 'Open some browser tabs and click refresh to see them grouped by domain.'
                    : 'Try a different search query.'}
                </p>
                {totalTabCount === 0 && (
                  <button
                    onClick={refreshLiveTabs}
                    className="mt-4 px-4 py-2 rounded-lg bg-dark-card border border-dark-border text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-all flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredEntries.map(([domain, tabs], idx) => {
              const colorKey = domainColors[idx % domainColors.length];
              const colors = colorMap[colorKey] || colorMap.purple;
              const expanded = isDomainExpanded(domain);

              return (
                <div
                  key={domain}
                  className={`rounded-xl border ${colors.border} bg-dark-card overflow-hidden`}
                >
                  {/* Domain header row */}
                  <button
                    onClick={() => toggleDomain(domain)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-hover transition-colors text-left"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <span className={`text-sm font-semibold flex-1 truncate ${colors.text}`}>
                      {domain.charAt(0).toUpperCase() + domain.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500 bg-dark-elevated px-2 py-0.5 rounded-full mr-1">
                      {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
                    </span>
                    {expanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>

                  {/* Tabs list */}
                  {expanded && (
                    <div className="border-t border-dark-border divide-y divide-dark-border/50">
                      {tabs.map((tab) => (
                        <div
                          key={tab.id}
                          onClick={() => handleOpenTab(tab.url)}
                          className="group px-4 py-2.5 flex items-center gap-3 hover:bg-dark-elevated cursor-pointer transition-colors"
                        >
                          <FaviconOrFallback tab={tab} colorKey={colorKey} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate leading-5">{tab.title || 'Untitled'}</p>
                            <p className="text-xs text-gray-500 truncate">{tab.url}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {filteredEntries.length > 0 && (
          <div className="px-6 py-3 border-t border-dark-border bg-dark-card flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-gray-500">
              Auto-updates when tabs open or close
            </span>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3 h-3" />
              Save as Workspace
            </button>
          </div>
        )}
      </main>

      <NewWorkspaceModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onCreate={(name, color) => {
          void saveCurrentTabsAsWorkspace(name, color).then(() => {
            setShowSaveModal(false);
          });
        }}
      />
    </>
  );
}
