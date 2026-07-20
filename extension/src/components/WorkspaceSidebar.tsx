import { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Workspace } from '../types/index';
import { ClusterModal } from './ClusterModal';
import { ContextMenu } from './ContextMenu';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { NewWorkspaceModal } from './NewWorkspaceModal';
import { RenameModal } from './RenameModal';

export function WorkspaceSidebar() {
  const {
    workspaces,
    activeWorkspace,
    selectWorkspace,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    clusterTabsByDomain,
    clusterTabsByTag,
    clusterTabsSmart,
    saveCurrentTabsAsWorkspace,
    refreshLiveTabs,
  } = useApp();

  const [quickActionsExpanded, setQuickActionsExpanded] = useState(true);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showSaveLiveTabs, setShowSaveLiveTabs] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showCluster, setShowCluster] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [workspaceToRename, setWorkspaceToRename] = useState<Workspace | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    workspace: Workspace | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, workspace: null });

  const getWorkspaceColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { bg: string; dot: string }> = {
      purple: {
        bg: isActive ? 'bg-primary-bg border-primary/30' : 'hover:bg-dark-hover',
        dot: 'bg-purple-500',
      },
      blue: {
        bg: isActive ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-dark-hover',
        dot: 'bg-blue-500',
      },
      green: {
        bg: isActive ? 'bg-green-500/10 border-green-500/30' : 'hover:bg-dark-hover',
        dot: 'bg-green-500',
      },
      cyan: {
        bg: isActive ? 'bg-cyan-500/10 border-cyan-500/30' : 'hover:bg-dark-hover',
        dot: 'bg-cyan-500',
      },
      orange: {
        bg: isActive ? 'bg-orange-500/10 border-orange-500/30' : 'hover:bg-dark-hover',
        dot: 'bg-orange-500',
      },
      red: {
        bg: isActive ? 'bg-red-500/10 border-red-500/30' : 'hover:bg-dark-hover',
        dot: 'bg-red-500',
      },
      pink: {
        bg: isActive ? 'bg-pink-500/10 border-pink-500/30' : 'hover:bg-dark-hover',
        dot: 'bg-pink-500',
      },
    };
    return colors[color] || colors.purple;
  };

  const quickActions = [
    { id: 'save', label: 'Save Current Tabs', icon: Bookmark },
    { id: 'open', label: 'Open Last Workspace', icon: Clock },
    { id: 'search', label: 'Search All Tabs', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'save') {
      setShowSaveLiveTabs(true);
    } else if (actionId === 'open') {
      refreshLiveTabs();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, workspace: Workspace) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      workspace,
    });
  };

  const handleDeleteClick = (workspace: Workspace) => {
    setWorkspaceToDelete(workspace);
    setShowDeleteConfirm(true);
  };

  const handleRenameClick = (workspace: Workspace) => {
    setWorkspaceToRename(workspace);
    setShowRename(true);
  };

  const handleCluster = () => {
    if (activeWorkspace) {
      setShowCluster(true);
    }
  };

  const contextMenuOptions = contextMenu.workspace
    ? [
        {
          label: 'Rename',
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => handleRenameClick(contextMenu.workspace!),
        },
        {
          label: 'Cluster Tabs',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          onClick: () => {
            selectWorkspace(contextMenu.workspace!);
            setShowCluster(true);
          },
        },
        {
          label: 'Delete',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          onClick: () => handleDeleteClick(contextMenu.workspace!),
          danger: true,
        },
      ]
    : [];

  return (
    <>
      <aside className="w-[220px] bg-dark-card border-r border-dark-border flex flex-col">
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-semibold text-sm">T</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">TabMind</h1>
              <p className="text-xs text-gray-500">Tab Workspace Manager</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-3 mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Workspaces</h2>
            <button
              onClick={() => setShowNewWorkspace(true)}
              className="p-1 hover:bg-dark-hover rounded transition-colors text-gray-400 hover:text-gray-200"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-2 space-y-1">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id;
              const colorClasses = getWorkspaceColorClasses(workspace.color, isActive);

              return (
                <div key={workspace.id} className="relative group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => selectWorkspace(workspace)}
                    onContextMenu={(e) => handleContextMenu(e, workspace)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        selectWorkspace(workspace);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all border border-transparent cursor-pointer ${colorClasses.bg}`}
                  >
                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${colorClasses.dot}`} />
                    <span className={`text-sm flex-1 text-left truncate ${isActive ? 'text-gray-100' : 'text-gray-400'}`}>
                      {workspace.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-dark-elevated text-gray-500">
                      {workspace.tabCount}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, workspace);
                      }}
                      className="p-0.5 hover:bg-dark-hover rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-200"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-3 mt-6 mb-2">
            <button
              onClick={() => setQuickActionsExpanded(!quickActionsExpanded)}
              className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              {quickActionsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              Quick Actions
            </button>
          </div>

          {quickActionsExpanded && (
            <div className="px-2 space-y-1">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors hover:bg-dark-hover text-gray-400 hover:text-gray-200"
                >
                  <action.icon className="w-4 h-4" />
                  <span className="text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-dark-border space-y-2">
          <button
            onClick={handleCluster}
            disabled={!activeWorkspace}
            className="w-full py-2 px-3 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Cluster Tabs
          </button>
          <button
            onClick={() => setShowNewWorkspace(true)}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-gray-600 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
        </div>
      </aside>

      <NewWorkspaceModal
        isOpen={showNewWorkspace}
        onClose={() => setShowNewWorkspace(false)}
        onCreate={createWorkspace}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (workspaceToDelete) {
            deleteWorkspace(workspaceToDelete.id);
          }
        }}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${workspaceToDelete?.name}"? All folders and tabs will be permanently removed.`}
      />

      <RenameModal
        isOpen={showRename}
        onClose={() => setShowRename(false)}
        onRename={(newName) => {
          if (workspaceToRename) {
            renameWorkspace(workspaceToRename.id, newName);
          }
        }}
        currentName={workspaceToRename?.name || ''}
        title="Rename Workspace"
      />

      <ClusterModal
        isOpen={showCluster}
        onClose={() => setShowCluster(false)}
        onClusterByDomain={() => {
          if (activeWorkspace) {
            clusterTabsByDomain(activeWorkspace.id);
          }
        }}
        onClusterByTag={() => {
          if (activeWorkspace) {
            clusterTabsByTag(activeWorkspace.id);
          }
        }}
        onClusterSmart={() => {
          if (activeWorkspace) {
            clusterTabsSmart(activeWorkspace.id);
          }
        }}
      />

      <NewWorkspaceModal
        isOpen={showSaveLiveTabs}
        onClose={() => setShowSaveLiveTabs(false)}
        onCreate={(name, color) => {
          void saveCurrentTabsAsWorkspace(name, color).then(() => {
            setShowSaveLiveTabs(false);
          });
        }}
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        position={contextMenu.position}
        options={contextMenuOptions}
      />
    </>
  );
}
