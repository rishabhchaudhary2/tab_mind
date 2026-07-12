import { useEffect, useRef, type ReactNode } from 'react';

interface ContextMenuOption {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  options: ContextMenuOption[];
}

export function ContextMenu({ isOpen, onClose, position, options }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-dark-card border border-dark-border rounded-lg shadow-xl py-1 min-w-[160px] z-50"
      style={{ left: position.x, top: position.y }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => {
            option.onClick();
            onClose();
          }}
          className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
            option.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-dark-hover'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
