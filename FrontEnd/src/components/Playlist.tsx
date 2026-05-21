import { useState, useEffect, useRef } from "react";
import type { Song } from "../types/Song";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { Trash2, MoreVertical, Check, Square, CheckSquare2, X, LayoutGrid, List, FolderPlus, Disc } from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { updateSong } from "../services/musicApi";

interface PlaylistProps {
  songs: Song[];
  currentSong: Song;
  onSelectSong: (song: Song) => void;
  onRemove?: (id: number) => void;
  onBulkRemove?: (ids: number[]) => void;
  localFilesInfo?: {
    requestAccess: () => void;
    restoreAccess: () => void;
    removeLocalFiles: () => void;
    hasStoredHandle: boolean;
    isScanning: boolean;
  }
}

export function Playlist({ songs, currentSong, onSelectSong, onRemove, onBulkRemove, localFilesInfo }: PlaylistProps) {
  const { playClick, playHover } = useSoundEffects();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', id?: number, title?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Auto-heal missing track durations
  const [dynamicDurations, setDynamicDurations] = useState<Record<number, number>>({});
  const fetchedDurations = useRef<Set<number>>(new Set());

  useEffect(() => {
    songs.forEach(song => {
      // If the song has no duration and hasn't been fetched yet
      if (!song.duration && song.url && !fetchedDurations.current.has(song.id)) {
        fetchedDurations.current.add(song.id);
        const audio = new Audio(song.url);
        audio.onloadedmetadata = () => {
          if (audio.duration && isFinite(audio.duration)) {
             setDynamicDurations(prev => ({ ...prev, [song.id]: audio.duration }));
             updateSong(song.id, { duration: audio.duration }).catch(console.error);
          }
          // Cleanup to prevent memory leaks
          audio.src = '';
          audio.remove();
        };
        audio.onerror = () => {
             console.warn("Failed to load metadata for track ID:", song.id);
             audio.src = '';
             audio.remove();
        };
      }
    });
  }, [songs]);

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
      setDeleteTarget({ type: 'bulk' });
      setDeleteModalOpen(true);
    }
  };

  const handleSingleDelete = (id: number, title: string) => {
    setDeleteTarget({ type: 'single', id, title });
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'bulk' && onBulkRemove) {
      onBulkRemove(Array.from(selectedIds));
      setSelectedIds(new Set());
    } else if (deleteTarget.type === 'single' && deleteTarget.id && onRemove) {
      onRemove(deleteTarget.id);
    }
    
    setDeleteTarget(null);
    setActiveMenuId(null);
  };

  const selectAll = () => {
    if (selectedIds.size === songs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(songs.map(s => s.id)));
    }
  };

  const isSelectionMode = selectedIds.size > 0;

  function formatDuration(d?: number) {
    if (!d || !isFinite(d)) return '--:--';
    const mins = Math.floor(d / 60);
    const secs = Math.floor(d % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  return (
    <div className="flex flex-col h-full bg-black/20 font-mono w-full overflow-hidden">
      {/* Playlist Header/Actions */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--text-secondary)]/10 bg-black/30 backdrop-blur-md sticky top-0 z-30 w-full">
        <div className="flex items-center gap-2 overflow-hidden">
            {isSelectionMode ? (
                <button 
                  onClick={() => { playClick(); selectAll(); }}
                  className="flex items-center gap-2 p-1 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors border border-[var(--accent)]/30 px-2 shrink-0"
                >
                  <CheckSquare2 size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">
                      {selectedIds.size === songs.length ? 'NONE' : 'ALL'}
                  </span>
                </button>
            ) : (
                <div className="flex items-center gap-2 pl-1 truncate">
                    <div className="w-1 h-1 bg-[var(--accent)] animate-pulse shrink-0"></div>
                    <span className="text-[9px] text-[var(--accent)]/60 tracking-widest uppercase truncate flex items-center gap-3">
                        {songs.length} TRACKS
                    </span>
                    <div className="flex bg-black/50 rounded-sm border border-[var(--text-secondary)]/20 ml-2 shrink-0">
                      <button onClick={() => { playClick(); setViewMode('list'); }} className={`p-1 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="List View"><List size={12} /></button>
                      <button onClick={() => { playClick(); setViewMode('grid'); }} className={`p-1 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Grid View"><LayoutGrid size={12} /></button>
                    </div>

                    {localFilesInfo && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--text-secondary)]/20">
                            {localFilesInfo.isScanning ? (
                                <span className="text-[9px] text-[var(--accent)] font-bold animate-pulse uppercase">Scanning...</span>
                            ) : (
                                <>
                                    {localFilesInfo.hasStoredHandle && songs.filter(s => s.category === 'Local').length === 0 && (
                                        <button onClick={() => { playClick(); localFilesInfo.restoreAccess(); }} className="p-1 px-2 border border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black uppercase text-[8px] font-bold tracking-widest transition-colors flex items-center gap-1" title="Restore Local Library">
                                            Restore Local
                                        </button>
                                    )}
                                    {!localFilesInfo.hasStoredHandle && (
                                        <button onClick={() => { playClick(); localFilesInfo.requestAccess(); }} className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1" title="Add Local Folder">
                                            <FolderPlus size={14} />
                                            <span className="text-[8px] uppercase font-bold tracking-widest hidden sm:inline">Add Local</span>
                                        </button>
                                    )}
                                    {localFilesInfo.hasStoredHandle && (
                                        <button onClick={() => { playClick(); localFilesInfo.removeLocalFiles(); }} className="p-1 px-2 text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 text-[8px] uppercase tracking-widest font-bold transition-all flex items-center gap-1 border border-transparent hover:border-[var(--danger)]/50" title="Disconnect Local Folder">
                                            <Disc size={12} /> Eject
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
            {isSelectionMode && onBulkRemove && (
                <button
                  onClick={() => { playClick(); handleBulkDelete(); }}
                  className="p-1.5 bg-[var(--danger)] text-black hover:bg-white transition-all shadow-[0_0_10px_rgba(255,0,85,0.3)] shrink-0"
                  title="Purge Selected"
                >
                  <Trash2 size={12} />
                </button>
            )}
            {isSelectionMode && (
                 <button 
                    onClick={() => { playClick(); setSelectedIds(new Set()); }}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
            )}
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className={`flex-1 p-1 w-full overflow-y-auto custom-scrollbar ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 px-2 pb-4 pt-2 content-start' : 'flex flex-col gap-0.5'}`}
      >
        {songs.map((song) => {
          const isActive = song.id === currentSong?.id;
          const isSelected = selectedIds.has(song.id);
          const isMenuOpen = activeMenuId === song.id;

          if (viewMode === 'grid') {
            return (
              <div 
                key={song.id} 
                data-active={isActive}
                className={`relative group/item aspect-square border transition-all duration-300 ${isActive ? 'border-[var(--accent)] shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'border-[var(--text-secondary)]/20 hover:border-[var(--accent)]/50'}`}
              >
                {/* Selection Checkbox */}
                {(isSelectionMode || isSelected) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); playClick(); toggleSelect(song.id); }}
                    className={`absolute top-2 left-2 z-20 p-1 bg-black/60 rounded-sm backdrop-blur-sm transition-colors ${isSelected ? 'text-[var(--accent)]' : 'text-white/50 hover:text-white'}`}
                  >
                    {isSelected ? <CheckSquare2 size={16} /> : <Square size={16} />}
                  </button>
                )}

                {/* More Actions Toggle */}
                <div className="absolute right-2 top-2 z-20" ref={isMenuOpen ? menuRef : null}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playClick();
                      setActiveMenuId(isMenuOpen ? null : song.id);
                    }}
                    className={`p-1 bg-black/60 rounded-sm backdrop-blur-sm transition-colors ${isMenuOpen ? 'text-[var(--accent)]' : 'text-white/50 hover:text-[var(--accent)] opacity-0 group-hover/item:opacity-100'}`}
                  >
                    <MoreVertical size={14} />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--bg-main)] border border-[var(--text-secondary)]/30 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
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
                          handleSingleDelete(song.id, song.title);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { 
                    if (isSelectionMode) {
                      toggleSelect(song.id);
                    } else {
                      playClick(); onSelectSong(song); 
                    }
                  }}
                  onMouseEnter={playHover}
                  className="w-full h-full relative block overflow-hidden"
                >
                  <img 
                    src={song.coverUrl} 
                    className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110 brightness-50 blur-[2px]' : 'group-hover/item:scale-110 group-hover/item:brightness-50 group-hover/item:blur-[2px]'}`} 
                    alt={song.title}
                  />
                  <div className={`absolute inset-0 flex flex-col items-center justify-center p-3 bg-black/40 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                    <div className={`text-[11px] font-bold text-center truncate w-full tracking-wider uppercase ${isActive ? 'text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]' : 'text-white'}`}>
                      {song.title}
                    </div>
                    <div className="text-[9px] text-center truncate w-full mt-1.5 text-white/70 uppercase">
                      {song.artist}
                    </div>
                  </div>
                </button>
              </div>
            );
          }

          return (
            <div 
                key={song.id} 
                data-active={isActive}
                className={`relative group/item flex items-center w-full transition-all duration-300 ${isActive ? 'playlist-active-bg' : 'hover:bg-white/5'} ${isSelected ? 'bg-[var(--accent)]/10' : ''}`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] z-10"></div>
              )}

              {/* Selection Checkbox */}
              {(isSelectionMode || isSelected) && (
                <button
                  onClick={() => { playClick(); toggleSelect(song.id); }}
                  className={`pl-2 pr-1 py-4 transition-colors shrink-0 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]/30 hover:text-[var(--accent)]'}`}
                >
                  {isSelected ? <CheckSquare2 size={16} /> : <Square size={16} />}
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
                className={`flex-1 flex flex-col items-start gap-0.5 py-3 pr-8 pl-3 transition-all duration-300 overflow-hidden text-left ${isActive ? 'pl-4' : ''}`}
              >
                {/* Title Row */}
                <div className={`w-full truncate text-[10px] font-bold font-mono tracking-tight uppercase ${isActive ? 'text-[var(--accent)] text-glow' : 'text-[var(--text-secondary)] group-hover/item:text-[var(--text-primary)]'}`}>
                  {song.title}
                </div>
                
                {/* Artist & Info Row */}
                <div className="flex items-center justify-between w-full gap-2">
                  <div className={`text-[8px] truncate font-mono uppercase tracking-wider flex-1 ${isActive ? 'opacity-80' : 'opacity-30 group-hover/item:opacity-60'}`}>
                    {song.artist}
                  </div>
                  <div className={`text-[8px] font-mono shrink-0 opacity-40 ${isActive ? 'text-[var(--accent)] opacity-80' : ''}`}>
                    {formatDuration(song.duration || dynamicDurations[song.id])}
                  </div>
                </div>
              </button>
              
              {/* More Actions Toggle */}
              <div 
                className="absolute right-1 top-1/2 -translate-y-1/2 z-20" 
                ref={isMenuOpen ? menuRef : null}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    setActiveMenuId(isMenuOpen ? null : song.id);
                  }}
                  className={`p-1.5 transition-colors ${
                    isMenuOpen 
                      ? 'text-[var(--accent)]' 
                      : 'text-[var(--text-secondary)]/20 hover:text-[var(--accent)]'
                  }`}
                >
                  <MoreVertical size={14} />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--bg-main)] border border-[var(--text-secondary)]/30 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
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
                        handleSingleDelete(song.id, song.title);
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

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        songTitle={deleteTarget?.title}
        count={deleteTarget?.type === 'bulk' ? selectedIds.size : undefined}
      />
    </div>
  );
}
