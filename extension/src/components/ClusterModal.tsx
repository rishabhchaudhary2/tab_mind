import { Globe, Sparkles, Tag } from 'lucide-react';
import { Modal } from './Modal';

interface ClusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClusterByDomain: () => void;
  onClusterByTag: () => void;
  onClusterSmart: () => void;
}

export function ClusterModal({
  isOpen,
  onClose,
  onClusterByDomain,
  onClusterByTag,
  onClusterSmart,
}: ClusterModalProps) {
  const clusterOptions = [
    {
      id: 'domain',
      title: 'Cluster by Domain',
      description: 'Group tabs by website (LeetCode, YouTube, GitHub, etc.)',
      icon: Globe,
      action: onClusterByDomain,
      color: 'blue',
    },
    {
      id: 'tag',
      title: 'Cluster by Tag',
      description: 'Group tabs by source tags (Array, DP, Hashing, etc.)',
      icon: Tag,
      action: onClusterByTag,
      color: 'purple',
    },
    {
      id: 'smart',
      title: 'Smart Clustering',
      description: 'AI-powered grouping based on content and context',
      icon: Sparkles,
      action: onClusterSmart,
      color: 'green',
      recommended: true,
    },
  ];

  const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', hover: 'hover:bg-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', hover: 'hover:bg-purple-500/20' },
    green: { bg: 'bg-green-500/10', icon: 'text-green-400', hover: 'hover:bg-green-500/20' },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cluster Tabs">
      <div className="space-y-3">
        <p className="text-sm text-gray-400 mb-4">
          Automatically organize tabs into folders based on different clustering algorithms. This will
          reorganize all folders in the current workspace.
        </p>

        {clusterOptions.map((option) => {
          const colors = colorClasses[option.color as keyof typeof colorClasses];
          return (
            <button
              key={option.id}
              onClick={() => {
                option.action();
                onClose();
              }}
              className={`w-full p-4 rounded-xl ${colors.bg} ${colors.hover} transition-colors text-left group relative`}
            >
              {option.recommended && (
                <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  Recommended
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                  <option.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${colors.icon}`}>{option.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
