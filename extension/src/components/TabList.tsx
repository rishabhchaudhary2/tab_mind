import { useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  ChevronsRight,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Tab } from '../types/index';
import { ContextMenu } from './ContextMenu';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export function TabList() {
  const { activeWorkspace, activeFolder, searchQuery, removeTab, openAllTabs, deleteFolder, selectFolder,canEdit } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<Tab | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    tab: Tab | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, tab: null });

  const tagColors: Record<string, { bg: string; text: string }> = {
    purple: { bg: 'bg-badge-purple-bg', text: 'text-badge-purple-text' },
    blue: { bg: 'bg-badge-blue-bg', text: 'text-badge-blue-text' },
    red: { bg: 'bg-badge-red-bg', text: 'text-badge-red-text' },
    orange: { bg: 'bg-badge-orange-bg', text: 'text-badge-orange-text' },
    yellow: { bg: 'bg-badge-yellow-bg', text: 'text-badge-yellow-text' },
    green: { bg: 'bg-badge-green-bg', text: 'text-badge-green-text' },
    cyan: { bg: 'bg-badge-cyan-bg', text: 'text-badge-cyan-text' },
    pink: { bg: 'bg-badge-pink-bg', text: 'text-badge-pink-text' },
  };

  const folderIconColors: Record<string, { bg: string; text: string }> = {
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  };

  const folderMarker: Record<string, string> = {
    LeetCode: 'LC',
    YouTube: 'YT',
    Codeforces: 'CF',
    'C++/STL': 'C++',
    System: 'SD',
    Papers: 'P',
    Courses: 'C',
    Kubernetes: 'K8',
    Docker: 'DK',
    CS50: '50',
  };

  if (!activeWorkspace || !activeFolder) {
    return (
      <main className="flex-1 bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-dark-card mx-auto mb-4 flex items-center justify-center text-gray-400 text-xl">
            F
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Select a folder</h3>
          <p className="text-sm text-gray-500">Choose a folder from the middle column to view its tabs</p>
        </div>
      </main>
    );
  }

  const iconColors = folderIconColors[activeFolder.color] || folderIconColors.purple;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleTabs = activeFolder.tabs.filter((tab) => {
    if (!normalizedSearch) {
      return true;
    }

    return (
      tab.title.toLowerCase().includes(normalizedSearch) ||
      tab.url.toLowerCase().includes(normalizedSearch) ||
      tab.domain.toLowerCase().includes(normalizedSearch) ||
      tab.sourceTag.toLowerCase().includes(normalizedSearch)
    );
  });

  const getFaviconColor = (domain: string) => {
    const colors = ['purple', 'blue', 'cyan', 'orange', 'green', 'pink'];
    const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleOpenTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenAll = () => {
    openAllTabs(activeFolder);
  };

  const handleSaveTabs = () => {
    // Placeholder for save-tab workflow.
  };

  const handleMoveTo = () => {
    // Placeholder for move-tab workflow.
  };

  const handleContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      tab,
    });
  };

  const handleDeleteTab = (tab: Tab) => {
    setTabToDelete(tab);
    setShowDeleteConfirm(true);
  };

  return (
    <>
      <main className="flex-1 bg-dark-bg flex flex-col min-w-0">
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <span>{activeWorkspace.name}</span>
            <ChevronsRight className="w-3 h-3" />
            <span className="text-gray-400">{activeFolder.name}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-xl ${iconColors.bg} flex items-center justify-center`}>
                <span className="text-sm font-semibold text-gray-100">
                  {folderMarker[activeFolder.name] ||
                    activeFolder.name
                      .replace(/[^a-zA-Z0-9]/g, '')
                      .slice(0, 2)
                      .toUpperCase() ||
                    'FD'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white truncate">{activeFolder.name}</h2>
                { canEdit && (  
                  <button
                    onClick={() => handleOpenTab(activeFolder.tabs[0]?.url || '#')}
                    disabled={activeFolder.tabs.length === 0}
                    className="p-1 hover:bg-dark-hover rounded transition-colors text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>)}
                </div>
                <p className="text-xs text-gray-500">
                  {visibleTabs.length} of {activeFolder.tabs.length} tabs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAll}
                disabled={visibleTabs.length === 0}
                className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                Open All
              </button>
              <button className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {visibleTabs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-dark-card mx-auto mb-3 flex items-center justify-center">
                  <Bookmark className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-sm text-gray-400 mb-1">
                  {activeFolder.tabs.length === 0 ? 'No tabs in this folder' : 'No matching tabs'}
                </p>
                <p className="text-xs text-gray-500">
                  {activeFolder.tabs.length === 0 ? 'Save tabs to organize them here' : 'Try another search query'}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-4 space-y-1">
              {visibleTabs.map((tab) => {
                const faviconColor = getFaviconColor(tab.domain);
                const tagStyle = tagColors[tab.sourceColor] || tagColors.purple;

                return (
                  <div
                    key={tab.id}
                    className="group px-3 py-2.5 rounded-lg flex items-center gap-3 hover:bg-dark-card transition-colors cursor-pointer"
                    onClick={() => handleOpenTab(tab.url)}
                    onContextMenu={(e) => {
                              if (canEdit) handleContextMenu(e, tab);
                            }}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium overflow-hidden ${
                        folderIconColors[faviconColor].bg
                      } ${folderIconColors[faviconColor].text}`}
                    >
                      {tab.favicon ? (
                        <img
                          src={tab.favicon}
                          alt=""
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              e.currentTarget.style.display = 'none';
                              parent.textContent = tab.domain.charAt(0).toUpperCase();
                            }
                          }}
                        />
                      ) : (
                        tab.domain.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-200 truncate">{tab.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 truncate">{tab.domain}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tagStyle.bg} ${tagStyle.text}`}>
                          {tab.sourceTag}
                        </span>
                      </div>
                    </div>

                    {canEdit && (
                      <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                    )}
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTab(tab.url);
                        }}
                        className="p-1.5 hover:bg-dark-hover rounded transition-colors text-gray-400 hover:text-gray-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTab(tab);
                          }}
                          className="p-1.5 hover:bg-dark-hover rounded transition-colors text-gray-400 hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-dark-border bg-dark-card">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-gray-400">
              {visibleTabs.length} visible of {activeFolder.tabs.length} tabs
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOpenAll}
                disabled={visibleTabs.length === 0}
                className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                Open All
              </button>
              {canEdit && (
                  <>
                    <button
                      onClick={handleSaveTabs}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      Save Tabs
                    </button>

                    <button
                      onClick={handleMoveTo}
                      disabled={visibleTabs.length === 0}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Move To...
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Folder
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      </main>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTabToDelete(null);
        }}
        onConfirm={() => {
          if (tabToDelete) {
            removeTab(activeWorkspace.id, activeFolder.id, tabToDelete.id);
          } else if (activeFolder) {
            deleteFolder(activeWorkspace.id, activeFolder.id);
            selectFolder(null);
          }
        }}
        title={tabToDelete ? 'Delete Tab' : 'Delete Folder'}
        message={
          tabToDelete
            ? `Are you sure you want to remove "${tabToDelete.title}" from this folder?`
            : `Are you sure you want to delete "${activeFolder?.name}"? All ${activeFolder?.tabs.length || 0} tabs will be permanently removed.`
        }
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        position={contextMenu.position}
        options={[
          {
            label: 'Open',
            icon: <ExternalLink className="w-3.5 h-3.5" />,
            onClick: () => {
              if (contextMenu.tab) {
                handleOpenTab(contextMenu.tab.url);
              }
            },
          },
          {
            label: 'Remove',
            icon: <X className="w-3.5 h-3.5" />,
            onClick: () => {
              if (contextMenu.tab) {
                handleDeleteTab(contextMenu.tab);
              }
            },
            danger: true,
          },
        ]}
      />
    </>
  );
}
