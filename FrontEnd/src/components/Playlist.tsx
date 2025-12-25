import { useState, useEffect, useRef } from "react";
import type { Song } from "../types/Song";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { Trash2, MoreVertical, Check, Circle, CheckCircle2, X } from "lucide-react";

interface PlaylistProps {
  songs: Song[];
  currentSong: Song;
  onSelectSong: (song: Song) => void;
  onRemove?: (id: number) => void;
  onBulkRemove?: (ids: number[]) => void;
}

export function Playlist({ songs, currentSong, onSelectSong, onRemove, onBulkRemove }: PlaylistProps) {
  const { playClick, playHover } = useSoundEffects();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setActiveMenuId(null);
  };

  const handleBulkDelete = () => {
    if (onBulkRemove && selectedIds.size > 0) {
      onBulkRemove(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const isSelectionMode = selectedIds.size > 0;

  return (
    <div className="flex flex-col h-full bg-black/20">
      {/* Playlist Header/Actions */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--text-secondary)]/10 bg-black/10">
        <div className="flex items-center gap-2">
            {isSelectionMode ? (
                <>
                  <button 
                    onClick={() => { playClick(); setSelectedIds(new Set()); }}
                    className="p-1 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <span className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase">
                    {selectedIds.size} SELECTED
                  </span>
                </>
            ) : (
                <span className="text-[10px] font-mono text-[var(--text-secondary)]/60 tracking-widest uppercase pl-2">
                    {songs.length} TRACKS_TOTAL
                </span>
            )}
        </div>

        {isSelectionMode && onBulkRemove && (
            <button
              onClick={() => { playClick(); handleBulkDelete(); }}
              className="flex items-center gap-2 px-3 py-1 bg-[var(--danger)]/20 border border-[var(--danger)]/50 text-[var(--danger)] text-[9px] font-mono font-bold hover:bg-[var(--danger)] hover:text-white transition-all uppercase tracking-tighter"
            >
              <Trash2 size={12} />
              <span>Delete Selected</span>
            </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 overflow-y-auto custom-scrollbar flex-1">
        {songs.map((song, index) => {
          const isActive = song.id === currentSong?.id;
          const isSelected = selectedIds.has(song.id);
          const isMenuOpen = activeMenuId === song.id;

          return (
            <div key={song.id} className="relative group/item flex items-center border-b border-[var(--text-secondary)]/5 last:border-0">
              {/* Selection Checkbox (Only visible in selection mode or hover if you want, but user said 'select bosilganda ... ro'yxatdagi barcha element tanlanadigan bo'lsin') */}
              {isSelectionMode && (
                <button
                  onClick={() => { playClick(); toggleSelect(song.id); }}
                  className={`pl-3 pr-1 py-3 transition-colors ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]/30 hover:text-[var(--accent)]/60'}`}
                >
                  {isSelected ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
              )}

              <button
                onClick={() => { 
                  if (isSelectionMode) {
                    toggleSelect(song.id);
                  } else {
                    playClick(); onSelectSong(song); 
                  }
                }}
                onMouseEnter={playHover}
                className={`flex-1 flex items-center justify-between gap-4 py-3 px-4 transition-all duration-300 relative border-l-2 ${
                  isActive 
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]' 
                    : 'hover:bg-[var(--text-secondary)]/5 border-transparent hover:border-[var(--text-secondary)]/30'
                } ${isSelected ? 'bg-[var(--accent)]/5' : ''}`}
                style={{ 
                  animation: 'fadeIn 0.5s ease-out forwards', 
                  animationDelay: `${index * 0.05}s`, 
                  opacity: 0 
                }}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"></div>
                )}

                <div className="flex items-center gap-4 flex-1 text-left overflow-hidden min-w-0">
                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate font-mono tracking-tight uppercase ${isActive ? 'text-[var(--accent)] text-glow' : 'text-[var(--text-secondary)] group-hover/item:text-[var(--text-primary)]'}`}>
                      {song.title}
                    </div>
                    <div className="text-[9px] truncate font-mono uppercase tracking-[0.2em] opacity-40 mt-0.5">
                      {song.artist}
                    </div>
                  </div>
                </div>

                <div className={`text-[9px] font-mono shrink-0 opacity-40 group-hover/item:opacity-100 transition-opacity flex items-center gap-4 ${isActive ? 'text-[var(--accent)] opacity-100' : ''}`}>
                   {formatDuration(song.duration)}
                </div>
              </button>
              
              {/* More Actions Toggle */}
              <div className="relative" ref={isMenuOpen ? menuRef : null}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    setActiveMenuId(isMenuOpen ? null : song.id);
                  }}
                  className={`p-3 text-[var(--text-secondary)]/40 hover:text-[var(--accent)] transition-colors ${isMenuOpen ? 'text-[var(--accent)]' : ''}`}
                >
                  <MoreVertical size={16} />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-2 top-full -mt-2 w-32 bg-[var(--bg-main)] border border-[var(--text-secondary)]/30 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(song.id); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors border-b border-[var(--text-secondary)]/10"
                    >
                      <Check size={12} />
                      <span>{isSelected ? 'Unselect' : 'Select'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                        if (onRemove) onRemove(song.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDuration(d?: number) {
  if (!d) return '--:--';
  const mins = Math.floor(d / 60);
  const secs = Math.floor(d % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}
