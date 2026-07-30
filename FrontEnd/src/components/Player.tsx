import type { Song } from "../types/Song";
import SEO from "./SEO";

import { useSettings } from "../contexts/SettingsContext";
import { Heart, Mic2, X, Upload, Search, Plus, Loader2, Check, Send, AlertTriangle, ListMusic, ChevronDown, Share2, Moon, Clock, Minus, QrCode } from "lucide-react";
import { Pagination } from "./Pagination";
import { Link, useLocation } from "react-router-dom";
import { searchSongs, getTrendingSongs, incrementPlayCount } from "../services/musicApi";
import { toast } from "sonner";

import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { Playlist } from "./Playlist";
import { SkeletonPlaylist } from "./SkeletonPlaylist";
import { TrackProgress } from "./TrackProgress";
import { PlaybackControls } from "./PlaybackControls";
import { VolumeControl } from "./VolumeControl";
import { Visualizer, FadeVisualizer, useBeatScale, AmbientBackground, ConcentricWavesVisualizer } from "./Visualizer";
import { LyricsView } from "./LyricsView";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useScrollLock } from "../hooks/useScrollLock";
import { EqualizerPanel } from './EqualizerPanel';
import { HotkeysMap } from './HotkeysMap';

import { useSoundEffects } from "../hooks/useSoundEffects";
import { useUploadPermission } from "../hooks/useUploadPermission";
import { UploadRequestModal } from "./UploadRequestModal";

interface PlayerProps {
  songs: Song[];
  loading: boolean;
  error?: string | null;
  player: ReturnType<typeof useAudioPlayer>;
  onOpenSettings: () => void;
  onAddToPlaylist: (song: Song) => Promise<{ success: boolean; message: string }>;
  onRemoveFromPlaylist: (id: number) => void;
  onBulkRemove: (ids: number[]) => void;
  onReorderPlaylist: (startIndex: number, endIndex: number) => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  localFilesInfo?: {
    requestAccess: () => void;
    restoreAccess: () => void;
    removeLocalFiles: () => void;
    hasStoredHandle: boolean;
    isScanning: boolean;
    scanProgress?: { current: number; total: number; filename: string } | null;
    error: string | null;
  };
}

export function Player({ songs, loading, error, player, onOpenSettings, onAddToPlaylist, onRemoveFromPlaylist, onBulkRemove, onReorderPlaylist, loadingMore, hasMore, onLoadMore, localFilesInfo }: PlayerProps) {
  const { playClick, playHover } = useSoundEffects();
  const { visualizerMode, zenMode, setZenMode } = useSettings();
  const location = useLocation();
  // Removed beatScale from state to avoid 60fps re-renders of the entire Player component
  const coverImgRef = useRef<HTMLImageElement>(null);
  useBeatScale(player.playing, player.analyser, coverImgRef, visualizerMode === 'scale');

  // Show toast if redirected from Upload due to expired/missing permission
  useEffect(() => {
    const state = location.state as { uploadRedirect?: string } | null;
    if (state?.uploadRedirect === 'expired') {
      toast.error('Upload ruxsatingiz muddati tugagan yoki bekor qilingan.', { duration: 5000 });
    } else if (state?.uploadRedirect === 'pending') {
      toast.info("So'rovingiz hali ko'rib chiqilmagan. Ruxsat berilguncha kuting.", { duration: 5000 });
    }
    // Clear state so toast doesn't repeat on re-renders
    window.history.replaceState({}, '', location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isKaraokeOpen, setIsKaraokeOpen] = useState(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [isSleepTimerMenuOpen, setIsSleepTimerMenuOpen] = useState(false);
  // Upload permission
  const uploadPerm = useUploadPermission();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  // Likes stored in localStorage — instant, no network, no auth needed
  const [likedIds, setLikedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('fronto_liked_ids');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });
  const [showVolumeHUD, setShowVolumeHUD] = useState(false);
  const volumeTimerRef = useRef<any>(null);
  const safeIndex = Math.min(Math.max(0, player.index), Math.max(0, songs.length - 1));
  const current: Song | undefined = songs[safeIndex];

  // Trending songs from full DB
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);

  useEffect(() => {
    getTrendingSongs(10).then(setTrendingSongs).catch(console.error);
  }, []);

  // Increment play count when song starts playing
  useEffect(() => {
    if (player.playing && current) {
      incrementPlayCount(current.id).catch(console.error);
    }
  }, [player.playing, current?.id]);

  // C3: Now Playing Toast Notification on track change
  const prevTrackIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (current && player.playing && prevTrackIdRef.current !== current.id) {
      prevTrackIdRef.current = current.id;
      toast.custom(() => (
        <div className="bg-black/90 border border-[var(--accent)] text-white p-3 backdrop-blur-xl shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)] font-mono flex items-center gap-3 w-80 animate-in slide-in-from-bottom-5 duration-300">
          <img src={current.coverUrl || '/default-cover.png'} alt={`${current.title} cover`} className="w-10 h-10 object-cover border border-[var(--accent)]/40 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[8px] text-[var(--accent)] tracking-[0.2em] uppercase font-bold">NOW PLAYING</div>
            <div className="text-xs font-bold truncate uppercase">{current.title}</div>
            <div className="text-[9px] text-[var(--text-secondary)] truncate uppercase">{current.artist || 'Unknown'}</div>
          </div>
        </div>
      ), { duration: 3500 });
    }
  }, [current, player.playing]);

  // Mobile Drawer State
  const [isMobilePlaylistOpen, setIsMobilePlaylistOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchCurrentX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchCurrentX(e.targetTouches[0].clientX);
  };

  const onTouchEndEvent = () => {
    if (touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }
    const distance = touchStartX - touchCurrentX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      player.next(); // swipe left -> next
    } else if (isRightSwipe) {
      player.prev(); // swipe right -> prev
    }
    
    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  const coverDragDistance = (touchStartX !== null && touchCurrentX !== null) ? touchCurrentX - touchStartX : 0;

  // Track change animation state
  const [coverFading, setCoverFading] = useState(false);
  const prevIndexRef = useRef(safeIndex);
  useEffect(() => {
    if (prevIndexRef.current !== safeIndex) {
      setCoverFading(true);
      const timer = setTimeout(() => setCoverFading(false), 50);
      prevIndexRef.current = safeIndex;
      return () => clearTimeout(timer);
    }
  }, [safeIndex]);
  
  // Drawer Gestures
  const [drawerTouchStartY, setDrawerTouchStartY] = useState<number | null>(null);
  const [drawerTouchCurrentY, setDrawerTouchCurrentY] = useState<number | null>(null);

  const onDrawerTouchStart = (e: React.TouchEvent) => {
    setDrawerTouchCurrentY(null);
    setDrawerTouchStartY(e.targetTouches[0].clientY);
  };

  const onDrawerTouchMove = (e: React.TouchEvent) => {
    if (drawerTouchStartY !== null) {
      const currentY = e.targetTouches[0].clientY;
      if (currentY > drawerTouchStartY) { // Only drag down
        setDrawerTouchCurrentY(currentY);
      }
    }
  };

  const onDrawerTouchEnd = () => {
    if (drawerTouchStartY === null || drawerTouchCurrentY === null) {
      setDrawerTouchStartY(null);
      setDrawerTouchCurrentY(null);
      return;
    }
    const distance = drawerTouchCurrentY - drawerTouchStartY;
    if (distance > 80) { // Close if dragged down sufficiently
      setIsMobilePlaylistOpen(false);
    }
    setDrawerTouchStartY(null);
    setDrawerTouchCurrentY(null);
  };

  const drawerDragDistance = (drawerTouchStartY !== null && drawerTouchCurrentY !== null) ? drawerTouchCurrentY - drawerTouchStartY : 0;

  // Show volume HUD when volume changes
  useEffect(() => {
    setShowVolumeHUD(true);
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    volumeTimerRef.current = setTimeout(() => setShowVolumeHUD(false), 2000);
    return () => {
      if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    };
  }, [player.volume]);

  const isLiked = (id: number) => likedIds.has(id);

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = songs[player.index];
    if (!current) return;

    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(current.id)) {
        next.delete(current.id);
      } else {
        next.add(current.id);
      }
      // Persist to localStorage
      localStorage.setItem('fronto_liked_ids', JSON.stringify([...next]));
      return next;
    });
  };

  // Search Logic with History

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [zenMode, setZenMode]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  useScrollLock(isSearchOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const itemsPerSearchPage = 10;
  const searchScrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when page changes
  useEffect(() => {
    if (searchScrollRef.current) {
      searchScrollRef.current.scrollTop = 0;
    }
  }, [searchPage]);

  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("");
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Lock body scroll when modals are open
  useScrollLock(isSearchOpen || isKaraokeOpen || isConfigMenuOpen || isMobilePlaylistOpen || isEqOpen || isHotkeysOpen);

  // Load last search from localStorage on mount
  useEffect(() => {
    const savedSearch = localStorage.getItem('lastSearchQuery');
    if (savedSearch) {
      setLastSearchQuery(savedSearch);
    }
  }, []);

  const clearSearchHistory = () => {
    localStorage.removeItem('lastSearchQuery');
    setLastSearchQuery("");
    setSearchQuery("");
    setSearchResults([]);
  };

  // Only search when the debounced query changes
  useEffect(() => {
    const runSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchSongs(debouncedSearchQuery);
        setSearchResults(results);
        setSearchPage(1); // Reset page on new search
        localStorage.setItem('lastSearchQuery', debouncedSearchQuery);
        setLastSearchQuery(debouncedSearchQuery);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };
    runSearch();
  }, [debouncedSearchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Populate search results with suggestions from DB on open/clear
  useEffect(() => {
    if (isSearchOpen && !searchQuery.trim()) {
      setIsSearching(true);
      searchSongs('').then(results => {
        setSearchResults(results);
        setSearchPage(1);
      }).catch(err => {
        console.error("Failed to load suggestions", err);
      }).finally(() => {
        setIsSearching(false);
      });
    }
  }, [isSearchOpen, searchQuery]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea or select
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      switch (e.code) {
        case 'Space':
          if (!isSearchOpen && !isKaraokeOpen) {
            e.preventDefault();
            player.playing ? player.pause() : player.play();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.prev();
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.setVolume(Math.min(100, player.volume + 5));
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.setVolume(Math.max(0, player.volume - 5));
          break;
        case 'KeyM':
          player.toggleMute();
          break;
        case 'KeyF':
          if (!isSearchOpen) {
            e.preventDefault();
            setIsSearchOpen(true);
          }
          break;
        case 'Escape':
          if (isSearchOpen) setIsSearchOpen(false);
          if (isKaraokeOpen) setIsKaraokeOpen(false);
          if (isHotkeysOpen) setIsHotkeysOpen(false);
          break;
        case 'KeyH':
        case 'Slash': // '?' is often 'Slash' with shift
          // Only trigger if we're not inside the search bar or typing
          if (!isSearchOpen) {
             e.preventDefault();
             setIsHotkeysOpen(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, isSearchOpen, isKaraokeOpen, isHotkeysOpen]);



  const handleAddSong = async (song: Song) => {
    // Check if already in playlist (locally)
    if (songs.some(s => s.id === song.id)) {
      toast.error('Song already in playlist');
      return;
    }

    const res = await onAddToPlaylist(song);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleRemoveSong = (song: Song) => {
    onRemoveFromPlaylist(song.id);
    toast.info(`${song.title} removed from playlist`);
  };

  const copyShareLink = () => {
    if (!current) return;
    const url = new URL(window.location.href);
    url.searchParams.set('track', current.id.toString());
    navigator.clipboard.writeText(url.toString());
    toast.success("Link copied to clipboard!");
  };

  const shareToTelegram = () => {
    if (!current) return;
    const url = new URL(window.location.href);
    url.searchParams.set('track', current.id.toString());
    const text = encodeURIComponent(`${current.title} — ${current.artist || 'Unknown'}`);
    const shareUrl = encodeURIComponent(url.toString());
    window.open(`https://t.me/share/url?url=${shareUrl}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const categoriesList = Array.from(new Set(songs.map(s => s.category || "General"))).filter(c => c !== "Trending");
  const likedCount = songs.filter(s => likedIds.has(s.id)).length;
  const categories = [
    "All",
    "Trending",
    ...(likedCount > 0 ? ["Favorites"] : []),
    ...categoriesList,
  ];

  const filteredSongs =
    selectedCategory === "All" ? songs :
      selectedCategory === "Trending" ? trendingSongs :
        selectedCategory === "Favorites" ? songs.filter(s => likedIds.has(s.id)) :
          songs.filter(s => (s.category || "General") === selectedCategory);

  if (loading) {
    return (
      <>
        <AmbientBackground playing={false} analyser={null} />
        <div className="w-full max-w-6xl mx-auto px-3 md:px-6 py-3 md:py-8">
          <div className="relative w-full flex flex-col md:flex-row overflow-hidden min-h-[500px] border border-[var(--text-secondary)] bg-[var(--bg-main)] shadow-[0_0_40px_rgba(var(--accent-rgb),0.05)]">
            {/* Left: big cover shimmer */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 border-r border-[var(--text-secondary)]/20">
              <div className="w-56 h-56 md:w-60 md:h-60 bg-[var(--text-secondary)]/8 animate-pulse" />
              <div className="w-full max-w-xs space-y-3">
                <div className="h-4 bg-[var(--text-secondary)]/10 animate-pulse rounded-sm w-4/5 mx-auto" />
                <div className="h-2.5 bg-[var(--text-secondary)]/6 animate-pulse rounded-sm w-3/5 mx-auto" />
                <div className="h-1 bg-[var(--text-secondary)]/8 animate-pulse rounded-sm w-full mt-4" />
                <div className="flex justify-center gap-4 pt-2">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-8 h-8 rounded-full bg-[var(--text-secondary)]/8 animate-pulse" />)}
                </div>
              </div>
            </div>
            {/* Right: playlist shimmer */}
            <div className="w-full md:w-64 lg:w-80">
              <SkeletonPlaylist count={10} />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AmbientBackground playing={player.playing} analyser={player.analyser} />
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
          <div className="flex flex-col items-center justify-center p-16 md:p-32 border border-red-500/50 bg-red-950/20 backdrop-blur-sm relative overflow-hidden group max-w-2xl text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.1)_0,transparent_100%)]"></div>
            <AlertTriangle className="w-16 h-16 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] animate-pulse" />
            <h2 className="text-2xl font-black text-red-500 tracking-[0.3em] font-mono uppercase mb-4 text-glow px-4">
              SYSTEM ERROR
            </h2>
            <div className="px-6 py-3 border border-red-500/30 bg-red-900/20 font-mono text-sm tracking-wider text-red-300">
              {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 px-8 py-3 bg-red-500/10 border border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-bold font-mono tracking-widest text-xs uppercase transition-all shadow-[0_0_15px_rgba(255,0,0,0.2)] hover:shadow-[0_0_25px_rgba(255,0,0,0.4)]"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!songs.length) {
    return (
      <>
        <AmbientBackground playing={player.playing} analyser={player.analyser} />
        <div className="w-full min-h-screen flex items-center justify-center p-4">
          <div className="flex flex-col items-center justify-center w-full max-w-lg p-8 border border-[var(--text-secondary)]/30 bg-[var(--bg-main)]/50 backdrop-blur-xl relative group">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)]"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)]"></div>

            <div className="w-16 h-16 mb-6 border border-[var(--accent)] flex items-center justify-center animate-pulse">
              <Search className="text-[var(--accent)]" size={32} />
            </div>

            <h2 className="text-2xl font-bold text-white mb-4 tracking-widest font-mono uppercase text-glow drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">Playlist Empty</h2>
            <p className="text-white font-bold text-sm font-mono mb-8 uppercase tracking-[0.2em] leading-relaxed drop-shadow-md">
              Your personal frequency stack is currently offline. <br /> Access the database to synchronize local tracks.
            </p>

            <button
              onClick={() => { playClick(); setIsSearchOpen(true); }}
              className="px-8 py-3 border border-[var(--accent)] text-[var(--accent)] font-bold font-mono text-xs uppercase tracking-[0.3em] hover:bg-[var(--accent)] hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)] hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)]"
            >
              Access Database
            </button>
          </div>
        </div>

        {/* Search Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[var(--bg-main)] border border-[var(--text-secondary)] p-6 relative max-h-[80vh] flex flex-col">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold font-mono tracking-widest text-[var(--accent)] mb-6 uppercase">
                Search Database
              </h2>

              {lastSearchQuery && (
                <div className="mb-4 flex items-center justify-between p-2 bg-black/30 border border-[var(--text-secondary)]/20">
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <span className="text-[9px] text-[var(--text-secondary)]/60 uppercase tracking-wider shrink-0">Last:</span>
                    <span className="text-[10px] text-[var(--accent)]/80 font-mono truncate">{lastSearchQuery}</span>
                  </div>
                  <button
                    onClick={clearSearchHistory}
                    className="p-1 text-[var(--text-secondary)]/40 hover:text-[var(--danger)] transition-colors shrink-0"
                    title="Clear History"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH ARTIST OR TITLE..."
                  className="flex-1 bg-black/50 border border-[var(--text-secondary)] p-3 text-sm font-mono focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 bg-[var(--accent)] text-black font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </form>

              <div ref={searchScrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[300px]">
                {searchResults.length === 0 && !isSearching && searchQuery && (
                  <div className="text-center text-[var(--text-secondary)] text-xs font-mono mt-10">
                    NO DATA FOUND IN SECTOR
                  </div>
                )}

                {searchResults.map((song) => {
                  const inPlaylist = songs.some(s => s.id === song.id);
                  return (
                    <div key={song.id} className="flex items-center justify-between p-3 border border-[var(--text-secondary)]/20 hover:border-[var(--text-secondary)]/50 bg-black/30 group transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={song.coverUrl} alt={`${song.title} cover`} className="w-10 h-10 object-cover border border-[var(--text-secondary)]/30" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text-primary)] truncate font-mono">{song.title}</div>
                          <div className="text-[9px] text-[var(--text-secondary)] truncate font-mono uppercase tracking-wider">{song.artist}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddSong(song)}
                        disabled={inPlaylist}
                        className={`p-2 transition-all ${inPlaylist ? 'text-green-500 cursor-default' : 'text-[var(--text-secondary)] hover:text-[var(--accent)] border border-transparent hover:border-[var(--accent)]'}`}
                      >
                        {inPlaylist ? <Check size={18} /> : <Plus size={18} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const seoTitle = current
    ? `${player.playing ? '▶' : '⏸'} ${current.title} - ${current.artist}`
    : 'Music Player - Fronto';
  const seoDesc = current
    ? `Listen to ${current.title} by ${current.artist} on Fronto.`
    : 'Experience music in a futuristic cyberpunk interface.';

  return (
    <div className="w-full flex-1 flex flex-col relative">
      <SEO
        title={seoTitle}
        description={seoDesc}
        image={current?.coverUrl || '/default-cover.png'}
      />
      {/* Global Atmospheric Background */}
      <AmbientBackground playing={player.playing} analyser={player.analyser} />

      {player.audioError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-900/40 border border-red-500 text-red-400 px-6 py-2 text-xs font-mono uppercase animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <AlertTriangle size={14} />
          {player.audioError}
        </div>
      )}

      {/* Global Esc listener for Zen Mode */}
      {zenMode && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-[105] pointer-events-none" />
          
          <div className="absolute top-24 z-[110] text-center pointer-events-none">
            <h2 className="text-4xl md:text-6xl font-mono text-white font-bold tracking-[0.2em] drop-shadow-[0_0_20px_rgba(var(--accent-rgb),1)]">{current?.title || 'NO TRACK'}</h2>
            <p className="text-xl md:text-2xl font-mono text-[var(--accent)] mt-6 tracking-widest drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]">{current?.artist || 'UNKNOWN'}</p>
          </div>
          
          <div className="absolute inset-0 opacity-90 pointer-events-none">
             <Visualizer playing={player.playing} analyser={player.analyser} />
          </div>

          <div className="absolute bottom-12 z-[110] text-[var(--text-secondary)] opacity-40 text-xs font-mono uppercase tracking-[0.4em]">
             Press ESC or type 'zen' to exit Zen Mode
          </div>

          {/* Mobile exit button — ESC yo'q mobilda */}
          <button
            onClick={() => setZenMode(false)}
            className="absolute top-4 right-4 z-[120] md:hidden flex items-center gap-2 px-4 py-2 bg-black/60 border border-white/20 text-white/60 text-xs font-mono uppercase tracking-widest hover:text-white hover:border-white/40 transition-all backdrop-blur-sm"
          >
            <X size={14} /> Exit
          </button>
        </div>
      )}

      {/* Responsive Page Wrapper */}
      <div className="w-full max-w-[1400px] mx-auto px-2 md:px-6 py-2 md:py-8 flex flex-col gap-4 md:gap-12 items-center">

        {/* Main Player Display */}
        <div className="flex-1 w-full">
          {/* Volume HUD */}
          {showVolumeHUD && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
              <div className="bg-black/80 backdrop-blur-xl border border-[var(--accent)]/30 px-6 py-2 shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)]">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-[var(--accent)] tracking-[0.3em] uppercase">VOLUME</span>
                  <div className="w-32 h-1 bg-white/5 relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] transition-all duration-300"
                      style={{ width: `${player.volume}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--accent)] w-6">{player.volume}%</span>
                </div>
              </div>
            </div>
          )}
          <div className="relative w-full flex flex-col md:flex-row overflow-hidden min-h-[420px] md:h-[600px] lg:h-[650px] border border-[var(--text-secondary)] bg-[var(--bg-main)] shadow-[0_0_40px_rgba(var(--accent-rgb),0.1)] text-base md:text-lg">
            {/* Decorative Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)] z-20"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--accent)] z-20"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--accent)] z-20"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)] z-20"></div>

            {/* Top Toolbar - Global */}
            <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-[var(--bg-main)]/80 backdrop-blur-md z-30" style={{ borderBottom: '1px solid transparent', borderImage: `linear-gradient(90deg, transparent, var(--accent), transparent) 1` }}>
              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${player.playing ? 'bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]' : 'bg-[var(--text-secondary)]/30'}`}></div>
                <span className="text-[9px] font-mono text-[var(--accent)] tracking-[0.2em] font-bold uppercase">
                  {player.playing ? 'SYS.PLAYING' : current ? 'SYS.PAUSED' : 'SYS.IDLE'}
                </span>
                <div className="hidden sm:block h-3 w-px bg-[var(--text-secondary)]/20 mx-1"></div>
                <span className="hidden sm:inline text-[9px] font-mono text-[var(--text-secondary)]/50 tracking-widest uppercase">
                  TRK: {songs.length > 0 ? `${safeIndex + 1}/${songs.length}` : '0/0'}
                </span>
                <span className="hidden sm:inline left-[50px] text-[12px] font-mono font-bold text-[var(--accent)] tracking-widest uppercase">Personal Tracklist</span>
              </div>

              {/* Tech Labels - Real Data */}
              <div className="hidden lg:flex gap-6 text-[9px] text-[var(--text-secondary)]/40 font-mono tracking-[0.3em] uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]/30">BUFR:</span>
                  <span>{(() => {
                    const audio = player.audioRef?.current;
                    if (!audio || !audio.duration || audio.buffered.length === 0) return '0%';
                    const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                    return `${Math.round((bufferedEnd / audio.duration) * 100)}%`;
                  })()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]/30">RATE:</span>
                  <span>{(() => {
                    try {
                      const ctx = player.analyser?.context;
                      if (ctx) return `${(ctx.sampleRate / 1000).toFixed(1)}KHZ`;
                    } catch {}
                    return '—';
                  })()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]/30">FMT:</span>
                  <span>{(() => {
                    if (!current?.url) return '—';
                    const ext = current.url.split('.').pop()?.split('?')[0]?.toUpperCase();
                    return ext || '—';
                  })()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]/30">SPD:</span>
                  <span>{player.playbackRate}X</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Sleep Timer */}
                <div className="relative">
                  <button
                    onClick={() => { playClick(); setIsSleepTimerMenuOpen(!isSleepTimerMenuOpen); }}
                    onMouseEnter={playHover}
                    className={`cyber-btn px-2 sm:px-3 py-1 text-[9px] group flex items-center justify-center gap-2 ${player.sleepTimer ? 'border-[var(--accent)] text-[var(--accent)] shadow-[0_0_10px_rgba(var(--accent-rgb),0.2)]' : ''}`}
                    title="Sleep Timer"
                  >
                    <Moon size={14} className="sm:w-2.5 sm:h-2.5" fill={player.sleepTimer ? "currentColor" : "none"} />
                    <span className="mx-1 hidden sm:inline">{player.sleepTimer ? `${player.sleepTimer}M` : 'Sleep'}</span>
                  </button>

                  {isSleepTimerMenuOpen && (
                    <div className="absolute top-full mt-1 right-0 w-36 bg-black/95 backdrop-blur-xl border border-[var(--accent)]/30 z-50 shadow-2xl animate-in fade-in zoom-in duration-200">
                      <div className="px-3 py-1.5 border-b border-white/5 text-[7px] font-mono text-[var(--accent)] uppercase tracking-[0.2em] opacity-60">Set Timer</div>
                      {[15, 30, 45, 60].map(mins => (
                        <button
                          key={mins}
                          onClick={() => { playClick(); player.setSleepTimer(mins); setIsSleepTimerMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-[9px] font-mono uppercase tracking-wider hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-white transition-colors flex justify-between items-center"
                        >
                          <span>{mins} Minutes</span>
                          {player.sleepTimer === mins && <div className="w-1 h-1 bg-[var(--accent)] rounded-full animate-pulse shadow-[0_0_5px_var(--accent)]" />}
                        </button>
                      ))}
                      {player.sleepTimer && (
                        <button
                          onClick={() => { playClick(); player.setSleepTimer(null); setIsSleepTimerMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-[9px] font-mono uppercase tracking-wider bg-red-500/5 hover:bg-red-500/20 text-red-500/70 hover:text-red-400 border-t border-white/5 transition-colors"
                        >
                          Cancel Timer
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { playClick(); onOpenSettings(); }}
                  onMouseEnter={playHover}
                  className="cyber-btn px-2 sm:px-3 py-1 text-[9px] group flex items-center justify-center"
                  title="Config"
                >
                  <span className="opacity-60 group-hover:opacity-100 hidden sm:inline">[</span>
                  <span className="mx-1 hidden sm:inline">Config</span>
                  <span className="opacity-60 group-hover:opacity-100 hidden sm:inline">]</span>
                  <span className="sm:hidden font-mono tracking-widest text-xs">⚙</span>
                </button>

                {/* Playback Speed */}
                <div className="relative">
                  <button
                    onClick={() => { playClick(); setIsSpeedMenuOpen(!isSpeedMenuOpen); }}
                    onMouseEnter={playHover}
                    className={`cyber-btn px-2 sm:px-3 py-1 text-[9px] group flex items-center justify-center gap-1 font-mono ${player.playbackRate !== 1 ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
                    title="Playback Speed"
                  >
                    <span>{player.playbackRate}x</span>
                  </button>

                  {isSpeedMenuOpen && (
                    <div className="absolute top-full mt-1 right-0 w-24 bg-black/95 backdrop-blur-xl border border-[var(--accent)]/30 z-50 shadow-2xl animate-in fade-in zoom-in duration-200">
                      <div className="px-3 py-1.5 border-b border-white/5 text-[7px] font-mono text-[var(--accent)] uppercase tracking-[0.2em] opacity-60">Speed</div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                        <button
                          key={rate}
                          onClick={() => { playClick(); player.setPlaybackRate(rate); setIsSpeedMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-[9px] font-mono tracking-wider hover:bg-[var(--accent)]/10 transition-colors flex justify-between items-center ${player.playbackRate === rate ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)]'}`}
                        >
                          <span>{rate}x</span>
                          {player.playbackRate === rate && <div className="w-1 h-1 bg-[var(--accent)] rounded-full shadow-[0_0_5px_var(--accent)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { playClick(); setIsEqOpen(true); }}
                  onMouseEnter={playHover}
                  className="hidden sm:flex cyber-btn px-2 sm:px-3 py-1 text-[9px] group items-center justify-center"
                  title="Neural Audio (EQ / FX)"
                >
                  <span className="opacity-60 group-hover:opacity-100 hidden sm:inline">[</span>
                  <span className="mx-1 hidden sm:inline">EQ/FX</span>
                  <span className="opacity-60 group-hover:opacity-100 hidden sm:inline">]</span>
                </button>

                <button
                  onClick={() => { playClick(); setIsSearchOpen(true); }}
                  onMouseEnter={playHover}
                  className="cyber-btn px-2 sm:px-3 py-1 text-[9px] group flex items-center justify-center gap-2"
                  title="Search"
                >
                  <Search size={14} className="sm:w-2.5 sm:h-2.5" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row mt-6 md:mt-10 min-h-0 relative">

              {/* Atmospheric Mobile Background - Appears behind the player only on mobile */}
              <div className="md:hidden absolute inset-0 pointer-events-none overflow-hidden opacity-40 mix-blend-screen z-0">
                <img src={current?.coverUrl || '/default-cover.png'} className="w-full h-full object-cover blur-3xl scale-125 saturate-200" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-main)]/50 via-black/50 to-black/90" />
              </div>

              {/* LEFT COLUMN: Player (Flexible) */}
              <div className="flex-1 relative flex flex-col p-2 sm:p-3 md:p-5 lg:p-6 border-b md:border-b-0 md:border-r border-transparent md:border-[var(--text-secondary)]/30 overflow-hidden z-10">

                {/* Fade Visualizer Overlay (Player Box Only) */}
                {visualizerMode === 'fade' && (
                  <FadeVisualizer playing={player.playing} analyser={player.analyser} />
                )}

                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {/* Dynamic Visualizer Background */}
                  <div className={`absolute inset-0 pointer-events-none mix-blend-screen transition-all duration-500 ${['orbit', 'grid', 'matrix'].includes(visualizerMode)
                      ? 'opacity-35'
                      : 'opacity-30'
                    }`}>
                    <Visualizer playing={player.playing} analyser={player.analyser} position="bottom" />
                  </div>
                </div>

                {/* Cover Art Section - Flexible height */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2 md:py-4 min-h-0">
                  {/* Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[var(--accent)] opacity-10 blur-[80px] rounded-full pointer-events-none" />

                  {/* Cover */}
                  <div
                    className="relative group/cover cursor-grab active:cursor-grabbing"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEndEvent}
                    style={{
                      transform: touchStartX !== null ? `translateX(${coverDragDistance}px) rotate(${coverDragDistance * 0.05}deg)` : '',
                      opacity: touchStartX !== null ? Math.max(0.2, 1 - Math.abs(coverDragDistance) / 250) : 1,
                      transition: touchStartX !== null ? 'none' : 'transform 0.4s cubic-bezier(0.32,0.72,0,1), opacity 0.4s ease'
                    }}
                  >
                    {/* Rotating Inner Glow */}
                    <div className="absolute -inset-4 bg-[var(--accent)]/10 rounded-full blur-2xl animate-pulse opacity-0 group-hover/cover:opacity-100 transition-opacity duration-700"></div>

                    {/* 
                  CONCENTRIC RINGS FOR SCALE VISUALIZER 
                  Placed absolutely behind the actual cover image layer, size 300% to prevent clipping
                */}
                    {visualizerMode === 'scale' && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-[300%] h-[300%] opacity-60 pointer-events-none -z-10">
                        <ConcentricWavesVisualizer playing={player.playing} analyser={player.analyser} />
                      </div>
                    )}

                    {/* Album art with neon glow + fade animation */}
                    <div 
                      className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-60 md:h-60 lg:w-64 lg:h-64 aspect-square border border-[var(--text-secondary)]/30 p-1 bg-black/40 backdrop-blur-sm shrink-0"
                      style={{ boxShadow: `0 0 25px rgba(var(--accent-rgb), 0.25), 0 0 60px rgba(var(--accent-rgb), 0.1), inset 0 0 15px rgba(var(--accent-rgb), 0.05)` }}
                    >
                      {/* Decorative corner accents for cover */}
                      <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[var(--accent)]"></div>
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[var(--accent)]"></div>
                      <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-[var(--accent)]"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-[var(--accent)]"></div>

                      <img
                        ref={coverImgRef}
                        src={current?.coverUrl || '/default-cover.png'}
                        alt={current?.title || 'Unknown Track'}
                        className={`w-full h-full object-cover transition-all duration-500 ease-out ${coverFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                      />
                    </div>

                    {/* Cover Art Reflection */}
                    <div className="relative w-48 sm:w-56 md:w-60 lg:w-64 h-12 overflow-hidden pointer-events-none -mt-0.5 hidden md:block">
                      <img
                        src={current?.coverUrl || '/default-cover.png'}
                        alt=""
                        className="w-full h-48 sm:h-56 md:h-60 lg:h-64 object-cover transform scale-y-[-1] opacity-20"
                        style={{ 
                          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
                          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
                          filter: 'blur(2px) saturate(0.5)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Track Info & Controls Section - Compact */}
                <div className="w-full max-w-lg mx-auto space-y-3 md:space-y-5 relative z-10 pt-1 sm:pt-3 md:pt-4 pb-1 md:pb-2">
                  {/* Title & Artist & Actions Combined */}
                  <div className="text-center space-y-0.5 md:space-y-1">
                    <div className="flex items-start justify-center gap-2 md:gap-3">
                      {/* Like Button - Always visible */}
                      <button
                        onClick={toggleLike}
                        className={`p-3 md:p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 shrink-0 mt-1 ${current && isLiked(current.id) ? 'text-[var(--accent)] drop-shadow-[0_0_10px_var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-secondary)]/10'}`}
                      >
                        <Heart size={20} fill={current && isLiked(current.id) ? "currentColor" : "none"} strokeWidth={1.5} />
                      </button>

                      {/* Song Title & Artist - Always visible */}
                      <div className="flex flex-col items-center flex-1 min-w-0 px-1">
                        <h2 className="text-base md:text-xl lg:text-2xl font-black text-[var(--accent)] text-glow tracking-tight drop-shadow-lg truncate font-mono uppercase w-full">
                          {current?.title || 'UNKNOWN'}
                        </h2>
                        <p className="text-[9px] md:text-[10px] lg:text-xs text-[var(--text-secondary)] font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase mt-0.5 md:mt-1 opacity-80 truncate w-full">
                          {current?.artist || 'UNKNOWN'}
                        </p>
                      </div>

                      {/* Karaoke Button */}
                      {current?.lyrics && (
                        <button
                          onClick={() => setIsKaraokeOpen(true)}
                          className="cyber-icon-btn w-10 h-10 shrink-0 mt-1"
                          title="Karaoke Mode"
                        >
                          <Mic2 size={18} strokeWidth={1.5} />
                        </button>
                      )}

                      {/* Share Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                          onBlur={() => setTimeout(() => setIsShareMenuOpen(false), 200)}
                          className={`cyber-icon-btn w-10 h-10 shrink-0 mt-1 ${isShareMenuOpen ? 'text-[var(--accent)] ring-1 ring-[var(--accent)]/30 bg-[var(--accent)]/10' : ''}`}
                          title="Share Options"
                        >
                          <Share2 size={18} strokeWidth={1.5} />
                        </button>
                        
                        {isShareMenuOpen && (
                          <div className="absolute bottom-full right-0 mb-2 p-1 bg-black/95 border border-[var(--text-secondary)]/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col gap-1 z-50 min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <button
                              onClick={() => { copyShareLink(); setIsShareMenuOpen(false); }}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--text-secondary)]/10 text-[10px] font-mono font-bold tracking-widest uppercase text-[var(--text-secondary)] hover:text-white transition-colors w-full text-left"
                            >
                              <Share2 size={14} className="text-[var(--accent)]" /> 
                              <span>Copy Link</span>
                            </button>
                            <button
                              onClick={() => { shareToTelegram(); setIsShareMenuOpen(false); }}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--text-secondary)]/10 text-[10px] font-mono font-bold tracking-widest uppercase text-[var(--text-secondary)] hover:text-white transition-colors w-full text-left"
                            >
                              <Send size={14} className="text-[var(--accent)]" /> 
                              <span>Telegram</span>
                            </button>
                            <button
                              onClick={() => { playClick(); setIsQrModalOpen(true); setIsShareMenuOpen(false); }}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--text-secondary)]/10 text-[10px] font-mono font-bold tracking-widest uppercase text-[var(--text-secondary)] hover:text-white transition-colors w-full text-left"
                            >
                              <QrCode size={14} className="text-[var(--accent)]" /> 
                              <span>QR Code</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <TrackProgress
                    audioRef={player.audioRef}
                    duration={player.duration}
                    onSeek={player.seek}
                  />

                  {/* Main Controls - Prioritized visibility */}
                  <div className="flex flex-col items-center gap-2.5 md:gap-3 pb-1 md:pb-2">
                    <PlaybackControls
                      playing={player.playing}
                      shuffle={player.shuffle}
                      repeat={player.repeat}
                      onPlay={player.play}
                      onPause={player.pause}
                      onPrev={player.prev}
                      onNext={player.next}
                      onToggleShuffle={player.toggleShuffle}
                      onToggleRepeat={player.toggleRepeat}
                    />

                    <div className="w-3/4 md:w-2/3">
                      <VolumeControl
                        volume={player.volume}
                        isMuted={player.isMuted}
                        onVolumeChange={player.setVolume}
                        onToggleMute={player.toggleMute}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Open Playlist Button (Only visible on mobile when playlist is closed) */}
              <div className="md:hidden flex items-center justify-center px-4 pb-4 bg-transparent z-10 w-full">
                <button
                  onClick={() => setIsMobilePlaylistOpen(true)}
                  className="flex items-center gap-2 justify-center w-full py-4 border border-[var(--text-secondary)]/30 bg-black/50 backdrop-blur-md text-xs uppercase font-mono tracking-[0.2em] font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors min-h-[48px]"
                  title="Open Playlist"
                >
                  <ListMusic size={16} /> View Tracklist
                </button>
              </div>

              {/* RIGHT COLUMN: Playlist (Fixed-width on Desktop, BottomSheet on Mobile) */}
              {/* Mobile Cover Overlay (Darkens background when drawer open) */}
              {isMobilePlaylistOpen && (
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] md:hidden transition-opacity duration-300"
                  onClick={() => setIsMobilePlaylistOpen(false)}
                />
              )}

              <div className={`
              fixed inset-x-0 bottom-0 z-[50] md:relative md:z-10
              w-full md:w-64 lg:w-96 xl:w-[400px] flex flex-col 
              bg-[var(--bg-main)]/95 md:bg-[var(--bg-main)]/50 
              border-t md:border-t-0 border-[var(--accent)]/30 md:border-transparent
              backdrop-blur-xl md:backdrop-blur-sm 
              transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
              ${isMobilePlaylistOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
              h-[80vh] md:h-full min-h-0 overflow-hidden
              shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-none
            `}
            style={{
              transform: drawerDragDistance > 0 ? `translateY(${drawerDragDistance}px)` : undefined,
              transition: drawerTouchStartY !== null ? 'none' : ''
            }}
            >

                {/* Mobile Swipe Handle to Close */}
                <div
                  className="w-full flex justify-center py-3 md:hidden cursor-pointer active:bg-white/5 border-b border-[var(--text-secondary)]/10"
                  onClick={() => setIsMobilePlaylistOpen(false)}
                  onTouchStart={onDrawerTouchStart}
                  onTouchMove={onDrawerTouchMove}
                  onTouchEnd={onDrawerTouchEnd}
                >
                  <div className="flex items-center justify-center w-full pointer-events-none">
                    <div className="w-12 h-1 bg-[var(--text-secondary)]/40 rounded-full" />
                    {/* Fallback chevron */}
                    <ChevronDown className="absolute right-4 text-[var(--text-secondary)]/50" size={16} />
                  </div>
                </div>
                {/* Playlist Header */}
                <div className="p-3 md:p-4 border-b border-[var(--text-secondary)]/30 bg-[var(--text-secondary)]/5 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-widest font-mono uppercase">Tracklist</h3>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">{filteredSongs.length} SONGS_LOADED</p>
                  </div>

                  {/* Category Dropdown (Mini) */}
                  <div className="relative">
                    <button
                      onClick={() => { playClick(); setIsConfigMenuOpen(!isConfigMenuOpen); }}
                      onMouseEnter={playHover}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-[10px] border border-[var(--text-secondary)]/30 px-2 py-1 bg-black/50 flex items-center gap-2 w-32 justify-between"
                    >
                      <span className="truncate">{selectedCategory.toUpperCase()}</span>
                      <span>{isConfigMenuOpen ? '▴' : '▾'}</span>
                    </button>

                    {isConfigMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--bg-main)] border border-[var(--text-secondary)] z-50 shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => { playClick(); setSelectedCategory(cat); setIsConfigMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider border-b border-[var(--text-secondary)]/10 hover:bg-[var(--text-secondary)]/10 ${selectedCategory === cat ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)]'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* List */}
                <div className="flex-1 overflow-hidden p-0 flex flex-col">
                  <Playlist
                    songs={filteredSongs}
                    currentSong={songs[player.index]}
                    onSelectSong={(song) => {
                      const idx = songs.findIndex(s => s.id === song.id);
                      if (idx !== -1) player.selectSong(idx);
                      setIsMobilePlaylistOpen(false);
                    }}
                    onRemove={onRemoveFromPlaylist}
                    onBulkRemove={onBulkRemove}
                    onReorder={onReorderPlaylist}
                    localFilesInfo={localFilesInfo}
                  />
                  {/* Load More */}
                  {hasMore && onLoadMore && (
                    <div className="p-3 flex justify-center">
                      <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="text-[9px] font-mono uppercase tracking-widest border border-[var(--text-secondary)]/30 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-40 flex items-center gap-2"
                      >
                        {loadingMore ? <Loader2 size={10} className="animate-spin" /> : null}
                        {loadingMore ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestion/Contact CTA Section */}
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-16 mb-24">
          <div className="relative group">
            {/* Glow behind */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent)]/50 via-[var(--text-secondary)]/50 to-[var(--accent)]/50 blur-2xl opacity-10 group-hover:opacity-30 transition-opacity duration-700"></div>

            <div className="relative bg-black/60 border border-[var(--text-secondary)]/20 backdrop-blur-2xl p-8 md:p-12 overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 border-b border-l border-[var(--accent)]/10"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[var(--accent)]/5 border border-[var(--accent)]/40 text-[var(--accent)] text-[10px] font-mono tracking-[0.25em] uppercase mb-6 shadow-[0_0_20px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.25)] transition-all duration-300">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"></span>
                    </span>
                    <span className="font-bold">Uploads Open</span>
                  </div>

                  <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-6 text-white uppercase leading-tight">
                    Upload <span className="text-[var(--accent)]">your music</span> <br className="hidden md:block" /> directly to the mainframe
                  </h2>

                  <p className="text-[var(--text-secondary)] font-mono text-xs md:text-sm leading-relaxed uppercase tracking-[0.2em] max-w-2xl mx-auto lg:mx-0">
                    Join our neural network. Share your frequency with the world. Uploads are now open to all units.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0">
                  {/* Upload Track Button — checks permission */}
                  {uploadPerm.status === 'granted' ? (
                    <Link
                      to="/upload"
                      className="group/btn relative px-10 py-5 bg-black/40 border-2 border-[var(--accent)] text-[var(--accent)] font-black tracking-[0.2em] uppercase text-xs overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_var(--accent)] text-center min-w-[220px] backdrop-blur-sm flex items-center justify-center"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3 group-hover/btn:scale-105 transition-transform duration-300">
                        <Upload size={18} strokeWidth={2.5} className="group-hover/btn:-translate-y-1 transition-transform duration-300" />
                        <span className="font-black group-hover/btn:text-black">Upload Track</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--accent)] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                      <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-[var(--accent)] blur-xl transition-opacity duration-500"></div>
                      <style dangerouslySetInnerHTML={{ __html: `.group\/btn:hover span { color: black !important; } .group\/btn:hover svg { stroke: black !important; }` }} />
                    </Link>
                  ) : uploadPerm.status === 'pending' ? (
                    /* Pending state — yellow border + pulsing dot */
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="relative px-10 py-5 bg-yellow-400/5 border-2 border-yellow-400/60 text-yellow-400 font-black tracking-[0.2em] uppercase text-xs min-w-[220px] backdrop-blur-sm flex items-center justify-center gap-3 cursor-default"
                      title="So'rovingiz admin tomonidan ko'rib chiqilmoqda"
                    >
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
                      </span>
                      <span>So'rov Kutilmoqda</span>
                    </button>
                  ) : (
                    /* None/denied — normal upload request button */
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="group/btn relative px-10 py-5 bg-black/40 border-2 border-[var(--accent)] text-[var(--accent)] font-black tracking-[0.2em] uppercase text-xs overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_var(--accent)] text-center min-w-[220px] backdrop-blur-sm flex items-center justify-center"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3 group-hover/btn:scale-105 transition-transform duration-300">
                        <Upload size={18} strokeWidth={2.5} className="group-hover/btn:-translate-y-1 transition-transform duration-300" />
                        <span className="font-black group-hover/btn:text-black">Upload Track</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--accent)] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                      <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-[var(--accent)] blur-xl transition-opacity duration-500"></div>
                      <style dangerouslySetInnerHTML={{ __html: `.group\/btn:hover span { color: black !important; } .group\/btn:hover svg { stroke: black !important; }` }} />
                    </button>
                  )}

                  <a
                    href="https://t.me/NomsizMe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-10 py-5 bg-[var(--accent)] border border-[var(--accent)] text-black font-bold tracking-[0.3em] uppercase text-xs hover:bg-transparent hover:text-[var(--accent)] transition-all duration-500 hover:shadow-[0_0_30px_var(--accent)] flex items-center justify-center gap-3 min-w-[200px]"
                  >
                    <Send size={18} />
                    <span>Telegram</span>
                  </a>
                </div>
              </div>

              {/* Banner Metadata Footer */}
              <div className="mt-12 pt-8 border-t border-[var(--text-secondary)]/10 flex flex-wrap justify-center lg:justify-start gap-8 text-[10px] font-mono text-[var(--text-secondary)]/30 tracking-[0.4em] uppercase">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-[var(--accent)] rounded-full"></span>
                  <span>STATUS: LINKED</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-[var(--accent)] rounded-full"></span>
                  <span>UPLOADER.EXE // ACTIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-[var(--accent)] rounded-full"></span>
                  <span>REF_CODE: 77-SYNC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isEqOpen && (
        <EqualizerPanel
          eq={player.eq}
          setBass={player.setBass}
          setMid={player.setMid}
          setTreble={player.setTreble}
          activeEffect={player.activeEffect}
          setEffect={player.setEffect}
          onClose={() => setIsEqOpen(false)}
        />
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-start pt-16 sm:pt-4 sm:justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[var(--bg-main)] border border-[var(--text-secondary)] p-6 relative max-h-[85vh] sm:max-h-[80vh] flex flex-col">
            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold font-mono tracking-widest text-[var(--accent)] mb-6 uppercase">
              Search Database
            </h2>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH ARTIST OR TITLE..."
                  className="w-full h-full bg-black/50 border border-[var(--text-secondary)] p-3 pr-10 text-sm font-mono focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => { setSearchQuery(''); document.querySelector<HTMLInputElement>('input[placeholder="SEARCH ARTIST OR TITLE..."]')?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 bg-[var(--accent)] text-black font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </form>

            {/* Search Results */}
            <div ref={searchScrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[300px]">
              {searchResults.length === 0 && !isSearching && searchQuery && (
                <div className="text-center text-[var(--text-secondary)] text-xs font-mono mt-10">
                  NO DATA FOUND IN SECTOR
                </div>
              )}

              {searchResults.slice((searchPage - 1) * itemsPerSearchPage, searchPage * itemsPerSearchPage).map((song) => {
                const inPlaylist = songs.some(s => s.id === song.id);
                return (
                  <div key={song.id} className="flex items-center justify-between p-3 border border-[var(--text-secondary)]/20 hover:border-[var(--text-secondary)]/50 bg-black/30 group transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={song.coverUrl} className="w-10 h-10 object-cover border border-[var(--text-secondary)]/30" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-primary)] truncate font-mono">{song.title}</div>
                        <div className="text-[9px] text-[var(--text-secondary)] truncate font-mono uppercase tracking-wider">{song.artist}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => inPlaylist ? handleRemoveSong(song) : handleAddSong(song)}
                      className={`p-2 transition-all border border-transparent ${inPlaylist ? 'text-[var(--accent)] hover:text-[var(--danger)] hover:border-[var(--danger)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]'}`}
                      title={inPlaylist ? "Remove from playlist" : "Add to playlist"}
                    >
                      {inPlaylist ? <Minus size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {Math.ceil(searchResults.length / itemsPerSearchPage) > 1 && (
              <div className="shrink-0 pt-4 mt-2 border-t border-[var(--text-secondary)]/20">
                <Pagination
                  currentPage={searchPage}
                  totalPages={Math.ceil(searchResults.length / itemsPerSearchPage)}
                  onPageChange={setSearchPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Modals / Drawers */}
      <HotkeysMap isOpen={isHotkeysOpen} onClose={() => setIsHotkeysOpen(false)} />
      {isKaraokeOpen && current && (
        <LyricsView
          song={current!}
          audioRef={player.audioRef}
          onClose={() => setIsKaraokeOpen(false)}
        />
      )}

      {/* Sleep Timer countdown HUD */}
      {player.sleepTimer !== null && (
        <div className="fixed bottom-12 md:bottom-24 right-4 md:right-8 z-[100] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-black/80 backdrop-blur-xl border border-[var(--accent)]/30 px-4 py-2 flex items-center gap-3 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]">
            <Clock size={16} className="text-[var(--accent)] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-[var(--accent)] uppercase tracking-widest leading-none mb-1">Deep Sleep Mode</span>
              <span className="text-xs font-mono text-white leading-none">{player.sleepTimer}M Remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Permission Modal */}
      {isUploadModalOpen && (
        <UploadRequestModal
          status={uploadPerm.status}
          onClose={() => setIsUploadModalOpen(false)}
          onSubmit={uploadPerm.submitRequest}
        />
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && current && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[var(--bg-main)] border border-[var(--accent)] p-6 shadow-[0_0_50px_rgba(var(--accent-rgb),0.2)] text-center flex flex-col items-center font-mono">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-[10px] font-mono text-[var(--accent)] tracking-[0.3em] uppercase mb-2">QR MATRIX SHARE</div>
            <h3 className="text-base font-bold text-white truncate max-w-[260px] uppercase">{current.title}</h3>
            <p className="text-[10px] text-[var(--text-secondary)] truncate max-w-[260px] uppercase mb-4">{current.artist || 'Unknown Artist'}</p>

            <div className="p-3 bg-white border-2 border-[var(--accent)] shadow-[0_0_20px_var(--accent)] mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/?track=${current.id}`)}`}
                alt="Track QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>

            <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-4">
              Scan with phone camera to open track
            </p>

            <button
              onClick={() => { copyShareLink(); setIsQrModalOpen(false); }}
              className="w-full py-2.5 bg-[var(--accent)] text-black font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={14} /> Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
