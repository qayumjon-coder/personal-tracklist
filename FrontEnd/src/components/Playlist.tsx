import { useState, useEffect, useRef } from "react";
import type { Song } from "../types/Song";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { Trash2, MoreVertical, Check, Square, CheckSquare2, X } from "lucide-react";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to active song
  useEffect(() => {
    if (currentSong && scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSong?.id]);

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

  const selectAll = () => {
    if (selectedIds.size === songs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(songs.map(s => s.id)));
    }
  };

  const isSelectionMode = selectedIds.size > 0;

  return (
    <div className="flex flex-col h-full bg-black/20 font-mono">
      {/* Playlist Header/Actions */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--text-secondary)]/10 bg-black/30 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
            {isSelectionMode ? (
                <>
                  <button 
                    onClick={() => { playClick(); selectAll(); }}
                    className="flex items-center gap-2 p-1 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors border border-[var(--accent)]/30 px-2"
                  >
                    <CheckSquare2 size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                        {selectedIds.size === songs.length ? 'DESELECT ALL' : 'SELECT ALL'}
                    </span>
                  </button>
                </>
            ) : (
                <div className="flex items-center gap-2 pl-1">
                    <div className="w-1.5 h-1.5 bg-[var(--accent)] animate-pulse"></div>
                    <span className="text-[10px] text-[var(--accent)]/60 tracking-[0.3em] uppercase">
                        {songs.length} TRACKS_READY
                    </span>
                </div>
            )}
        </div>

        <div className="flex items-center gap-2">
            {isSelectionMode && onBulkRemove && (
                <button
                  onClick={() => { playClick(); handleBulkDelete(); }}
                  className="flex items-center gap-2 px-4 py-1.5 bg-[var(--danger)] text-black text-[10px] font-black hover:bg-white transition-all uppercase tracking-tighter shadow-[0_0_15px_rgba(255,0,85,0.3)] hover:shadow-[0_0_20px_white]"
                >
                  <Trash2 size={14} />
                  <span>Purge Selection</span>
                </button>
            )}
            {isSelectionMode && (
                 <button 
                    onClick={() => { playClick(); setSelectedIds(new Set()); }}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors"
                    title="Exit Selection Mode"
                  >
                    <X size={18} />
                  </button>
            )}
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex flex-col gap-0.5 overflow-y-auto custom-scrollbar flex-1 p-1"
      >
        {songs.map((song, index) => {
          const isActive = song.id === currentSong?.id;
          const isSelected = selectedIds.has(song.id);
          const isMenuOpen = activeMenuId === song.id;

          return (
            <div 
                key={song.id} 
                data-active={isActive}
                className={`relative group/item flex items-center transition-all duration-300 ${isActive ? 'playlist-active-bg' : ''} ${isSelected ? 'bg-[var(--accent)]/10' : ''}`}
            >
              {/* Selection Checkbox */}
              {(isSelectionMode || isSelected) && (
                <button
                  onClick={() => { playClick(); toggleSelect(song.id); }}
                  className={`pl-2 pr-1 py-3 transition-colors ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]/30 hover:text-[var(--accent)]'}`}
                >
                  {isSelected ? <CheckSquare2 size={18} /> : <Square size={18} />}
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
                className={`flex-1 flex items-center justify-between gap-2 py-3 px-3 transition-all duration-500 relative border-l-2 ${
                  isActive 
                    ? 'border-[var(--accent)]' 
                    : 'hover:bg-white/5 border-transparent hover:border-white/20'
                }`}
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

                <div className="flex flex-col flex-1 text-left overflow-hidden min-w-0 py-0.5">
                  {/* Track Info */}
                  <div className={`w-full min-w-0 ${song.title.length > 18 ? 'hover-marquee' : ''}`}>
                    <div className="overflow-hidden whitespace-nowrap">
                      <div className={`marquee-inner text-[10px] md:text-[11px] font-bold font-mono tracking-tight uppercase inline-block transition-colors duration-300 ${isActive ? 'text-[var(--accent)] text-glow' : 'text-[var(--text-secondary)] group-hover/item:text-[var(--text-primary)]'}`}>
                        {song.title}
                        {song.title.length > 18 && (
                          <span className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                             &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {song.title} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline justify-between gap-2 mt-0.5">
                    <div className={`text-[8px] truncate font-mono uppercase tracking-[0.1em] transition-opacity duration-300 flex-1 ${isActive ? 'opacity-80' : 'opacity-30 group-hover/item:opacity-60'}`}>
                      {song.artist}
                    </div>
                    <div className={`text-[8px] font-mono shrink-0 opacity-40 group-hover/item:opacity-80 transition-opacity ${isActive ? 'text-[var(--accent)] opacity-80' : ''}`}>
                       {formatDuration(song.duration)}
                    </div>
                  </div>
                </div>
              </button>
              
              {/* More Actions Toggle */}
              <div className="relative shrink-0" ref={isMenuOpen ? menuRef : null}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    setActiveMenuId(isMenuOpen ? null : song.id);
                  }}
                  className={`p-1.5 text-[var(--text-secondary)]/40 hover:text-[var(--accent)] transition-colors ${isMenuOpen ? 'text-[var(--accent)]' : ''}`}
                >
                  <MoreVertical size={14} />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--bg-main)] border border-[var(--text-secondary)]/30 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
