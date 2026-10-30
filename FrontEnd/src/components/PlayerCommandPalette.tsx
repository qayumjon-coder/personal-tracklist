import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Search, 
  X, 
  Play, 
  Pause, 
  Heart, 
  ListPlus, 
  Clock, 
  Plus, 
  Minus
} from "lucide-react";
import type { Song } from "../types/Song";
import { getAllSongs } from "../services/musicApi";
import { toast } from "sonner";

export interface PlayerCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  allDbSongs?: Song[];
  currentSong?: Song;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onQueueSong: (song: Song) => void;
  onToggleLike: (songId: number) => void;
  likedIds: Set<number>;
  onAddToPlaylist?: (song: Song) => void | Promise<any>;
  onRemoveFromPlaylist?: (song: Song) => void;
}

export function PlayerCommandPalette({
  isOpen,
  onClose,
  songs,
  allDbSongs = [],
  currentSong,
  isPlaying,
  onPlaySong,
  onQueueSong,
  onToggleLike,
  likedIds,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}: PlayerCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Database songs state (loads all DB songs immediately if not passed)
  const [dbSongs, setDbSongs] = useState<Song[]>(allDbSongs);
  const [loadingDb, setLoadingDb] = useState(false);

  // Scope: 'playlist' or 'database'
  // If playlist has 0 songs, automatically default to 'database' so it's never empty!
  const [scope, setScope] = useState<'playlist' | 'database'>('database');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Keep dbSongs in sync with allDbSongs prop
  useEffect(() => {
    if (allDbSongs && allDbSongs.length > 0) {
      setDbSongs(allDbSongs);
    }
  }, [allDbSongs]);

  // Load all DB songs when palette opens (or if empty)
  useEffect(() => {
    if (isOpen && dbSongs.length === 0) {
      setLoadingDb(true);
      getAllSongs()
        .then(data => {
          setDbSongs(data);
        })
        .catch(err => {
          console.error("Failed to fetch all DB songs for palette:", err);
        })
        .finally(() => {
          setLoadingDb(false);
        });
    }
  }, [isOpen, dbSongs.length]);

  // Auto-focus input when opened & set default scope ONLY when opening
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      setScope(songs.length === 0 ? 'database' : 'playlist');
      return () => clearTimeout(timer);
    } else {
      setQuery("");
      setDurationFilter('all');
      setSelectedIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Effective scope: if playlist is empty, always use 'database'
  const effectiveScope: 'playlist' | 'database' = songs.length === 0 ? 'database' : scope;

  // Active source songs list
  const activeSourceSongs = useMemo(() => {
    if (effectiveScope === 'database') {
      return dbSongs.length > 0 ? dbSongs : songs;
    }
    return songs;
  }, [effectiveScope, dbSongs, songs]);

  // Format duration in mm:ss
  const formatDuration = (d?: number) => {
    if (!d || isNaN(d)) return "--:--";
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Filtered search results - shows ALL songs in pool (sorted by popularity)
  const searchResults = useMemo(() => {
    const pool = (activeSourceSongs.length > 0 ? activeSourceSongs : (dbSongs.length > 0 ? dbSongs : songs))
      .slice()
      .sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    
    return pool.filter(song => {
      // Query match (title, artist, category)
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matchesQuery = 
          (song.title && song.title.toLowerCase().includes(q)) ||
          (song.artist && song.artist.toLowerCase().includes(q)) ||
          (song.category && song.category.toLowerCase().includes(q));

        if (!matchesQuery) return false;
      }

      // Duration filter
      const dur = song.duration || 0;
      if (durationFilter === 'short' && dur >= 120) return false;
      if (durationFilter === 'medium' && (dur < 120 || dur >= 300)) return false;
      if (durationFilter === 'long' && dur < 300) return false;

      return true;
    });
  }, [query, activeSourceSongs, dbSongs, songs, durationFilter]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, durationFilter, effectiveScope]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside Command Palette
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const targetSong = searchResults[selectedIndex];
        if (targetSong) {
          onPlaySong(targetSong);
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, searchResults, selectedIndex, onPlaySong, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-2xl bg-[#0a0d14]/98 border-2 border-[var(--accent)] shadow-[0_0_50px_rgba(var(--accent-rgb),0.35)] flex flex-col max-h-[84vh] overflow-hidden font-mono"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header / Search Bar */}
        <div className="relative border-b border-[var(--accent)]/30 p-3 sm:p-4 bg-black/60 flex items-center gap-3">
          <Search className="w-5 h-5 text-[var(--accent)] shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Musiqa, ijrochi yoki janr..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/40 border-0 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 font-mono font-medium tracking-wide shadow-none focus:shadow-none focus-visible:shadow-none"
            style={{ outline: 'none', boxShadow: 'none' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-white/40 hover:text-white transition-colors"
              title="Tozalash"
            >
              <X size={16} />
            </button>
          )}
          <kbd 
            onClick={onClose}
            className="px-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 text-white/70 border border-white/20 rounded cursor-pointer transition-colors shrink-0"
          >
            ESC
          </kbd>
        </div>

        {/* Filter Chips Bar + Source Scope Selector */}
        <div className="px-3 sm:px-4 py-1.5 bg-[rgba(var(--accent-rgb),0.06)] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
          {/* Duration Filters */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Vaqt:</span>
            {(['all', 'short', 'medium', 'long'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationFilter(d)}
                className={`px-2 py-0.5 text-[9px] font-mono border transition-all ${
                  durationFilter === d
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/15 font-bold shadow-[0_0_8px_rgba(var(--accent-rgb),0.25)]'
                    : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                }`}
              >
                {d === 'all' ? 'Hammasi' : d === 'short' ? '< 2m' : d === 'medium' ? '2-5m' : '> 5m'}
              </button>
            ))}
          </div>

          {/* Right Action: Scope Switcher */}
          <div className="flex items-center">
            {songs.length > 0 ? (
              <div className="flex items-center border border-white/15 bg-black/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setScope('playlist')}
                  className={`px-2.5 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase transition-all ${
                    effectiveScope === 'playlist'
                      ? 'bg-[var(--accent)] text-black shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Shaxsiy pleylistim"
                >
                  Pleylist ({songs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('database')}
                  className={`px-2.5 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase transition-all ${
                    effectiveScope === 'database'
                      ? 'bg-[var(--accent)] text-black shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Barcha musiqa bazasi"
                >
                  Baza ({dbSongs.length || '...'})
                </button>
              </div>
            ) : (
              <span className="text-[9px] font-mono text-[var(--accent)] font-bold tracking-wider uppercase">
                Baza ({dbSongs.length || '...'})
              </span>
            )}
          </div>
        </div>

        {/* Results Info Sub-bar */}
        <div className="px-3 sm:px-4 py-1 bg-black/40 border-b border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span>
              {query.trim() 
                ? `"${query}" • ${searchResults.length} ta topildi` 
                : `${searchResults.length} ta trek`}
            </span>
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 custom-scrollbar max-h-[55vh]"
        >
          {loadingDb && dbSongs.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--accent)] font-mono animate-pulse">
              Baza ma'lumotlari yuklanmoqda...
            </div>
          )}

          {searchResults.map((song, idx) => {
            const isSelected = selectedIndex === idx;
            const isCurrentPlaying = currentSong?.id === song.id;
            const isLiked = likedIds.has(song.id);
            const inPlaylist = songs.some(s => s.id === song.id);

            return (
              <div
                key={song.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between gap-3 p-2.5 border transition-all group ${
                  isSelected
                    ? 'bg-[var(--accent)]/15 border-[var(--accent)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.2)]'
                    : isCurrentPlaying
                    ? 'bg-white/[0.04] border-[var(--accent)]/50'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                }`}
              >
                {/* Left: Cover + Title + Artist */}
                <div 
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    onPlaySong(song);
                    onClose();
                  }}
                >
                  <div className="relative w-10 h-10 shrink-0">
                    <img
                      src={song.coverUrl || song.cover_url || '/placeholder.png'}
                      alt=""
                      className={`w-10 h-10 object-cover border transition-all ${
                        isCurrentPlaying ? 'border-[var(--accent)] shadow-[0_0_8px_var(--accent)]' : 'border-white/10'
                      }`}
                    />
                    {isCurrentPlaying && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 bg-[var(--accent)] h-full animate-[bounce_0.6s_ease-in-out_infinite]" />
                          <span className="w-0.5 bg-[var(--accent)] h-2/3 animate-[bounce_0.8s_ease-in-out_infinite]" />
                          <span className="w-0.5 bg-[var(--accent)] h-4/5 animate-[bounce_0.7s_ease-in-out_infinite]" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`text-xs sm:text-sm font-bold truncate flex items-center gap-2 ${
                      isCurrentPlaying ? 'text-[var(--accent)] font-black' : isSelected ? 'text-white' : 'text-white/90'
                    }`}>
                      <span className="truncate">{song.title}</span>
                      {isCurrentPlaying && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-[var(--accent)] text-black font-black uppercase tracking-wider shrink-0">
                          {isPlaying ? 'PLAYING' : 'PAUSED'}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[var(--text-secondary)] truncate flex items-center gap-2 mt-0.5">
                      <span className="truncate">{song.artist || 'Unknown Artist'}</span>
                      {/* Genre Chips (Max 2 + extra count) */}
                      {(() => {
                        const rawCat = song.category || 'General';
                        const cats = rawCat
                          .split(/[,&/|+]+|\band\b/i)
                          .map(c => c.trim().replace(/^#+/, ''))
                          .filter(Boolean);
                        const displayCats = cats.length > 0 ? cats : ['General'];
                        const visible = displayCats.slice(0, 2);
                        const extraCount = displayCats.length - 2;

                        return (
                          <span className="inline-flex items-center gap-1 shrink-0">
                            {visible.map((cat, i) => (
                              <span
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuery(cat);
                                }}
                                className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 bg-black/60 border border-[var(--accent)]/40 text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/20 font-semibold uppercase tracking-wider shadow-sm max-w-[90px] sm:max-w-[120px] truncate cursor-pointer transition-all"
                                title={`#${cat} bo'yicha qidirish`}
                              >
                                #{cat}
                              </span>
                            ))}
                            {extraCount > 0 && (
                              <span
                                className="text-[7.5px] sm:text-[8px] font-mono px-1.5 py-0.5 bg-black/60 border border-white/20 text-white/70 hover:border-white/40 hover:text-white font-bold tracking-wider cursor-help transition-all"
                                title={displayCats.slice(2).map(c => `#${c}`).join(', ')}
                              >
                                +{extraCount}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] text-white/40 shrink-0 flex items-center gap-0.5">
                        <Clock size={10} /> {formatDuration(song.duration)}
                      </span>
                      {song.play_count !== undefined && song.play_count > 0 && (
                        <span className="text-[9px] font-mono text-[var(--accent)]/70 shrink-0 hidden sm:inline" title={`${song.play_count} marta tinglangan`}>
                          ▶ {song.play_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions Bar */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(song.id);
                    }}
                    className={`p-2 border transition-all ${
                      isLiked 
                        ? 'border-pink-500/60 bg-pink-500/15 text-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]' 
                        : 'border-white/10 text-white/50 hover:text-pink-400 hover:border-pink-500/40'
                    }`}
                    title={isLiked ? "Sevimlilardan o'chirish" : "Sevimlilarga qo'shish"}
                  >
                    <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
                  </button>

                  {/* Add to Queue Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQueueSong(song);
                      toast.success(`"${song.title}" ijro navbatiga qo'shildi!`);
                    }}
                    className="p-2 border border-white/10 text-white/60 hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
                    title="Navbatga qo'shish"
                  >
                    <ListPlus size={13} />
                  </button>

                  {/* Add/Remove Playlist Button */}
                  {onAddToPlaylist && onRemoveFromPlaylist && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (inPlaylist) {
                          onRemoveFromPlaylist(song);
                        } else {
                          onAddToPlaylist(song);
                        }
                      }}
                      className={`p-2 border transition-all ${
                        inPlaylist
                          ? 'border-[var(--accent)] text-[var(--accent)] hover:text-red-400 hover:border-red-500'
                          : 'border-white/10 text-white/60 hover:text-[var(--accent)] hover:border-[var(--accent)]'
                      }`}
                      title={inPlaylist ? "Pleylistdan o'chirish" : "Pleylistga qo'shish"}
                    >
                      {inPlaylist ? <Minus size={13} /> : <Plus size={13} />}
                    </button>
                  )}

                  {/* Direct Play/Pause Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onPlaySong(song);
                      onClose();
                    }}
                    className={`p-2 border transition-all ${
                      isCurrentPlaying && isPlaying
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_10px_var(--accent)]'
                        : 'border-white/10 text-white/70 hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-black hover:shadow-[0_0_10px_var(--accent)]'
                    }`}
                    title={isCurrentPlaying && isPlaying ? "Pauza" : "Ijro etish"}
                  >
                    {isCurrentPlaying && isPlaying ? (
                      <Pause size={13} fill="currentColor" />
                    ) : (
                      <Play size={13} fill="currentColor" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {query.trim() && searchResults.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--text-secondary)] font-mono">
              <Search className="w-8 h-8 mx-auto mb-2 text-white/20" />
              &quot;{query}&quot; bo&apos;yicha hech qanday trek topilmadi
              {effectiveScope === 'playlist' && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setScope('database')}
                    className="px-3 py-1.5 bg-[var(--accent)]/15 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black text-xs font-bold transition-all uppercase"
                  >
                    Butun bazadan qidirish
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-white/10 bg-black/60 flex items-center justify-between text-[10px] text-white/40 font-mono">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.2 bg-white/10 text-white/70">↑↓</kbd> Tanlash</span>
            <span><kbd className="px-1 py-0.2 bg-white/10 text-white/70">Enter</kbd> Ijro</span>
            <span><kbd className="px-1 py-0.2 bg-white/10 text-white/70">ESC</kbd> Yopish</span>
          </div>

          <span className="text-[var(--accent)]/50 text-[9px] uppercase tracking-wider hidden sm:inline">
            COMMAND PALETTE
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
