import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Modal } from './Modal';
import { createInvite } from '../services/supabase/store';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export function InviteModal({ isOpen, onClose, workspaceId, workspaceName }: InviteModalProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { code } = await createInvite(workspaceId, role);
      // Build a URL the invitee can paste back into the extension. We use
      // the extension's own URL scheme; the AppProvider watches for a
      // ?invite=<code> query string and auto-accepts.
      setInviteUrl(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setInviteUrl(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Invite to "${workspaceName}"`}>
      {!inviteUrl ? (
        <>
          <p className="text-sm text-gray-400 mb-4">
            Generate a shareable link. Anyone with the link can join this workspace at the role you choose. The link expires in 7 days.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <div className="flex gap-2">
              <button
                onClick={() => setRole('editor')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  role === 'editor'
                    ? 'bg-primary text-white'
                    : 'bg-dark-elevated text-gray-400 hover:text-gray-200'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setRole('viewer')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  role === 'viewer'
                    ? 'bg-primary text-white'
                    : 'bg-dark-elevated text-gray-400 hover:text-gray-200'
                }`}
              >
                Viewer
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            Share this code with the person you want to invite. Anyone who opens it while signed in will join as a <span className="text-gray-200 font-medium">{role}</span>.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Invite Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 h-10 bg-dark-elevated border border-dark-border rounded-lg px-3 text-sm text-gray-200 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3 rounded-lg bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
            >
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}