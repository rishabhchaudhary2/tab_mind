import { useState } from 'react';
import { Modal } from './Modal';

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

const colors = [
  { name: 'Purple', value: 'purple' },
  { name: 'Blue', value: 'blue' },
  { name: 'Orange', value: 'orange' },
  { name: 'Green', value: 'green' },
  { name: 'Cyan', value: 'cyan' },
  { name: 'Pink', value: 'pink' },
];

const colorClasses: Record<string, string> = {
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  cyan: 'bg-cyan-500',
  pink: 'bg-pink-500',
};

export function NewWorkspaceModal({ isOpen, onClose, onCreate }: NewWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('purple');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), selectedColor);
      setName('');
      setSelectedColor('purple');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Workspace">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Workspace Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter workspace name..."
            className="w-full h-10 bg-dark-elevated border border-dark-border rounded-lg px-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
          <div className="flex gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                className={`w-8 h-8 rounded-full ${colorClasses[color.value]} transition-transform ${
                  selectedColor === color.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-card scale-110'
                    : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Workspace
          </button>
        </div>
      </form>
    </Modal>
  );
}
