import { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Folder } from '../types/index';
import { ContextMenu } from './ContextMenu';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { NewFolderModal } from './NewFolderModal';
import { RenameModal } from './RenameModal';

const folderColors: Record<string, { bg: string; icon: string; activeBg: string }> = {
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', activeBg: 'bg-purple-500/15 border-l-2 border-purple-500' },
  blue:   { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   activeBg: 'bg-blue-500/15 border-l-2 border-blue-500' },
  red:    { bg: 'bg-red-500/10',    icon: 'text-red-400',    activeBg: 'bg-red-500/15 border-l-2 border-red-500' },
  orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', activeBg: 'bg-orange-500/15 border-l-2 border-orange-500' },
  yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', activeBg: 'bg-yellow-500/15 border-l-2 border-yellow-500' },
  green:  { bg: 'bg-green-500/10',  icon: 'text-green-400',  activeBg: 'bg-green-500/15 border-l-2 border-green-500' },
  cyan:   { bg: 'bg-cyan-500/10',   icon: 'text-cyan-400',   activeBg: 'bg-cyan-500/15 border-l-2 border-cyan-500' },
  pink:   { bg: 'bg-pink-500/10',   icon: 'text-pink-400',   activeBg: 'bg-pink-500/15 border-l-2 border-pink-500' },
};

interface FolderTreeNodeProps {
  folder: Folder;
  depth: number;                          // how deep in the tree, for indentation
  activeFolderId: string | undefined;     // currently selected folder
  expanded: Set<string>;                  // ids of folders that are open
  toggleExpanded: (id: string) => void;
  onSelect: (folder: Folder) => void;
  onContextMenu: (e: React.MouseEvent, folder: Folder) => void;
  canEdit: boolean;
}

function FolderTreeNode({
  folder,
  depth,
  activeFolderId,
  expanded,
  toggleExpanded,
  onSelect,
  onContextMenu,
  canEdit,
}: FolderTreeNodeProps) {
  const isActive = folder.id === activeFolderId;
  const isExpanded = expanded.has(folder.id);
  const hasChildren = folder.children.length > 0;
  const colors = folderColors[folder.color] || folderColors.purple;

  // Total tabs = own tabs + all descendant tabs, computed recursively.
  const totalTabs = (() => {
    const count = (f: Folder): number =>
      f.tabs.length + f.children.reduce((sum, c) => sum + count(c), 0);
    return count(folder);
  })();

  return (
    <div className="relative group">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(folder)}
        onContextMenu={(e) => {
          if (canEdit) onContextMenu(e, folder);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(folder);
        }}
        className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
          isActive ? colors.activeBg : 'hover:bg-dark-hover'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {/* Expand/collapse chevron — only for folders with children */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(folder.id);
            }}
            className="p-0.5 hover:bg-dark-hover rounded transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <div className={`w-7 h-7 rounded-md ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <FolderIcon className={`w-4 h-4 ${colors.icon}`} />
        </div>

        <span className={`text-sm flex-1 text-left truncate ${isActive ? 'text-gray-100' : 'text-gray-400'}`}>
          {folder.name}
        </span>

        <span className="text-xs px-1.5 py-0.5 rounded-full bg-dark-card text-gray-500 flex-shrink-0">
          {totalTabs}
        </span>

        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e, folder);
            }}
            className="p-0.5 hover:bg-dark-hover rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-200"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Recurse into children when expanded */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderList() {
  const {
    activeWorkspace,
    activeFolder,
    selectFolder,
    createFolder,
    deleteFolder,
    renameFolder,
    canEdit,
  } = useApp();

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    folder: Folder | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, folder: null });

  if (!activeWorkspace) {
    return (
      <aside className="w-[280px] bg-dark-elevated border-r border-dark-border flex items-center justify-center">
        <p className="text-sm text-gray-500">Select a workspace</p>
      </aside>
    );
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, folder });
  };

  const handleDeleteClick = (folder: Folder) => {
    setFolderToDelete(folder);
    setShowDeleteConfirm(true);
  };

  const handleRenameClick = (folder: Folder) => {
    setFolderToRename(folder);
    setShowRename(true);
  };

  return (
    <>
      <aside className="w-[280px] bg-dark-elevated border-r border-dark-border flex flex-col">
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => selectFolder(null)}
              className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-white flex-1 truncate">{activeWorkspace.name}</h2>
            {canEdit && (
              <button
                onClick={() => setShowNewFolder(true)}
                className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 ml-10">{activeWorkspace.tabCount} tabs</p>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-3 space-y-1">
            {activeWorkspace.folders.map((folder) => (
              <FolderTreeNode
                key={folder.id}
                folder={folder}
                depth={0}
                activeFolderId={activeFolder?.id}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
                onSelect={selectFolder}
                onContextMenu={handleContextMenu}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>

        {canEdit && (
          <div className="p-3 border-t border-dark-border">
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full py-2 px-3 rounded-lg border border-dashed border-gray-600 text-gray-400 text-sm font-medium hover:bg-dark-hover hover:border-gray-500 hover:text-gray-300 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Folder
            </button>
          </div>
        )}
      </aside>

      <NewFolderModal
        isOpen={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        onCreate={(name, color) => createFolder(activeWorkspace.id, name, color)}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (folderToDelete) deleteFolder(activeWorkspace.id, folderToDelete.id);
        }}
        title="Delete Folder"
        message={`Are you sure you want to delete "${folderToDelete?.name}"? All ${folderToDelete?.tabCount || 0} tabs will be permanently removed, along with any nested folders.`}
      />

      <RenameModal
        isOpen={showRename}
        onClose={() => setShowRename(false)}
        onRename={(newName) => {
          if (folderToRename) renameFolder(activeWorkspace.id, folderToRename.id, newName);
        }}
        currentName={folderToRename?.name || ''}
        title="Rename Folder"
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        position={contextMenu.position}
        options={[
          {
            label: 'Rename',
            icon: <Pencil className="w-3.5 h-3.5" />,
            onClick: () => {
              if (contextMenu.folder) handleRenameClick(contextMenu.folder);
            },
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            onClick: () => {
              if (contextMenu.folder) handleDeleteClick(contextMenu.folder);
            },
            danger: true,
          },
        ]}
      />
    </>
  );
}
