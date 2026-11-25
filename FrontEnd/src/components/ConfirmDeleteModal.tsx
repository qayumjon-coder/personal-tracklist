import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  songTitle?: string;
  count?: number;
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, songTitle, count }: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBulk = count && count > 1;

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm deletion" className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[var(--bg-main)] border-2 border-[var(--danger)] max-w-md w-full shadow-[0_0_40px_rgba(255,0,85,0.3)] animate-in zoom-in-95 duration-200">
        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--danger)]"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--danger)]"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--danger)]"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--danger)]"></div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30">
              <AlertTriangle className="text-[var(--danger)]" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold font-mono tracking-wider text-[var(--danger)] uppercase mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                {isBulk ? (
                  <>Are you sure you want to delete <span className="text-[var(--accent)] font-bold">{count} tracks</span> from the playlist?</>
                ) : (
                  <>Are you sure you want to delete <span className="text-[var(--accent)] font-bold">"{songTitle}"</span> from the playlist?</>
                )}
              </p>
              <p className="text-xs text-[var(--text-secondary)]/60 font-mono mt-2 uppercase tracking-wider">
                This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:text-white hover:border-white transition-all font-mono text-sm uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-6 py-2 bg-[var(--danger)] text-black font-bold hover:bg-white transition-all shadow-[0_0_15px_rgba(255,0,85,0.3)] hover:shadow-[0_0_20px_white] font-mono text-sm uppercase tracking-wider"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
