import { useState } from 'react';
import { Modal } from './Modal';
import { acceptInvite } from '../services/supabase/store';

interface RedeemInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccepted: (workspaceId: string) => void;
}

export function RedeemInviteModal({ isOpen, onClose, onAccepted }: RedeemInviteModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const workspaceId = await acceptInvite(code.trim());
      onAccepted(workspaceId);
      setCode('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join Workspace">
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-400 mb-4">
          Enter the invite code someone shared with you.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Invite Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g., a1b2c3d4e5f6..."
            autoFocus
            className="w-full h-10 bg-dark-elevated border border-dark-border rounded-lg px-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary transition-colors font-mono"
          />
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
        </div>
      </form>
    </Modal>
  );
}