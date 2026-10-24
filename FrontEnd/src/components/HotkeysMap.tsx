import { X, Keyboard } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

interface HotkeysMapProps {
  isOpen: boolean;
  onClose: () => void;
}

const hotkeys = [
  { key: 'Space', action: 'Play / Pause' },
  { key: '→ / ←', action: 'Next / Prev Track' },
  { key: '↑ / ↓', action: 'Volume Up / Down' },
  { key: 'M', action: 'Toggle Mute' },
  { key: 'F', action: 'Search Database' },
  { key: 'Ctrl + `', action: 'Open Terminal' },
  { key: 'H', action: 'Toggle Hotkeys Map' },
  { key: 'Esc', action: 'Close Modals / Exit Zen' },
];

export function HotkeysMap({ isOpen, onClose }: HotkeysMapProps) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-black/90 border border-[var(--accent)]/50 shadow-[0_0_30px_rgba(var(--accent-rgb),0.15)] animate-in zoom-in-95 fade-in duration-300">
        
        {/* Cyberpunk Decorative Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--accent)] -translate-x-1 -translate-y-1" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--accent)] translate-x-1 translate-y-1" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--text-secondary)]/20 bg-black/50">
          <div className="flex items-center gap-3">
            <Keyboard className="text-[var(--accent)]" size={20} />
            <h2 className="text-sm font-bold tracking-[0.3em] font-mono uppercase text-[var(--accent)]">
              SYSTEM_HOTKEYS_MAP
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
            aria-label="Close hotkeys map"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
            {hotkeys.map((hotkey, index) => (
              <div key={index} className="flex items-center justify-between group">
                <span className="kbd text-[10px] min-w-[80px] text-center group-hover:border-[var(--accent)]/60 group-hover:bg-[var(--accent)]/15 transition-all">
                  {hotkey.key}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--text-secondary)]/20 to-transparent mx-4 opacity-50" />
                <div className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors text-right">
                  {hotkey.action}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-[var(--text-secondary)]/60">
              Press <span className="kbd">H</span> anywhere to toggle
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
