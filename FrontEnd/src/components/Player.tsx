import type { Song } from "../types/Song";
import SEO from "./SEO";

import { useSettings } from "../contexts/SettingsContext";
import { Heart, Mic2, X, Upload, Search, Send, AlertTriangle, ListMusic, Share2, Moon, Clock, QrCode } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getTrendingSongs, getAllSongs } from "../services/musicApi";
import { toast } from "sonner";

import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { SkeletonPlaylist } from "./SkeletonPlaylist";
import { PlayerCommandPalette } from "./PlayerCommandPalette";
import { TrackProgress } from "./TrackProgress";
import { PlaybackControls } from "./PlaybackControls";
import { VolumeControl } from "./VolumeControl";
import { Visualizer, FadeVisualizer, useBeatScale, AmbientBackground, ConcentricWavesVisualizer } from "./Visualizer";
import { LyricsView } from "./LyricsView";
import { useState, useEffect, useRef, useMemo } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { EqualizerPanel } from './EqualizerPanel';
import { HotkeysMap } from './HotkeysMap';

import { useSoundEffects } from "../hooks/useSoundEffects";
import { useUploadPermission } from "../hooks/useUploadPermission";
import { UploadRequestModal } from "./UploadRequestModal";
import { useCachedSongs } from "../hooks/useCachedSongs";
import { PlayerToolbar } from "./PlayerToolbar";
import { PlayerRightPanel } from "./PlayerRightPanel";

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
  recentlyPlayed?: Song[];
  onClearRecentlyPlayed?: () => void;
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

export function Player({ songs, loading, error, player, onOpenSettings, onAddToPlaylist, onRemoveFromPlaylist, onBulkRemove, onReorderPlaylist, loadingMore, hasMore, onLoadMore, localFilesInfo, recentlyPlayed = [], onClearRecentlyPlayed }: PlayerProps) {
  const { playClick, playHover, playStartup } = useSoundEffects();
  const { visualizerMode, zenMode, setZenMode } = useSettings();
  const location = useLocation();
  // Removed beatScale from state to avoid 60fps re-renders of the entire Player component
  const coverImgRef = useRef<HTMLImageElement>(null);
  useBeatScale(player.playing, player.analyser, coverImgRef, visualizerMode === 'scale');

  useEffect(() => {
    if (loading) {
      playStartup();
    }
  }, [loading, playStartup]);

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
  // Right panel tab: 'playlist' | 'queue' | 'recent'
  const [rightTab, setRightTab] = useState<'playlist' | 'queue' | 'recent'>('playlist');

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
  // Offline cache indicator
  const { isCached } = useCachedSongs(songs);
  const current: Song | undefined = songs[safeIndex];

  // Trending songs from full DB
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [allDbSongs, setAllDbSongs] = useState<Song[]>([]);

  useEffect(() => {
    getTrendingSongs(10).then(setTrendingSongs).catch(console.error);
    getAllSongs().then(setAllDbSongs).catch(console.error);
  }, []);

  // Play count is tracked in useAudioPlayer (after 15s of listening) — no duplicate here

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

  // Show volume HUD when volume changes — skip initial mount
  const volumeMountedRef = useRef(false);
  useEffect(() => {
    if (!volumeMountedRef.current) {
      volumeMountedRef.current = true;
      return;
    }
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

  // Global Ctrl+K command palette shortcut
  useEffect(() => {
    const handleGlobalPalette = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalPalette);
    return () => window.removeEventListener('keydown', handleGlobalPalette);
  }, []);
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Lock body scroll when modals are open
  useScrollLock(isSearchOpen || isKaraokeOpen || isConfigMenuOpen || isMobilePlaylistOpen || isEqOpen || isHotkeysOpen);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger any player shortcuts while Command Palette / Search is open
      if (isSearchOpen) return;

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
          // Priority order: search > karaoke > hotkeys
          if (isSearchOpen) { setIsSearchOpen(false); }
          else if (isKaraokeOpen) { setIsKaraokeOpen(false); }
          else if (isHotkeysOpen) { setIsHotkeysOpen(false); }
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

  // Split composite category strings into individual distinct canonical genres (case-normalized)
  const categoriesList = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach(s => {
      const raw = s.category || "General";
      const parts = raw
        .split(/[,/&|+]+|\band\b/i)
        .map(c => c.trim().replace(/^#+/, '').toUpperCase())
        .filter(Boolean);
      if (parts.length === 0) {
        genreSet.add("GENERAL");
      } else {
        parts.forEach(p => genreSet.add(p));
      }
    });
    return Array.from(genreSet).filter(c => c !== "TRENDING").sort((a, b) => a.localeCompare(b));
  }, [songs]);

  const likedCount = songs.filter(s => likedIds.has(s.id)).length;
  const categories = useMemo(() => [
    "All",
    "Trending",
    ...(likedCount > 0 ? ["Favorites"] : []),
    ...(recentlyPlayed.length > 0 ? ["Recently Played"] : []),
    ...(player.queue.length > 0 ? ["Queue"] : []),
    ...categoriesList,
  ], [likedCount, recentlyPlayed.length, player.queue.length, categoriesList]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: songs.length,
      Trending: trendingSongs.length,
      Favorites: likedCount,
      "Recently Played": recentlyPlayed.length,
      Queue: player.queue?.length || 0,
    };
    songs.forEach(s => {
      const raw = s.category || "General";
      const parts = raw
        .split(/[,/&|+]+|\band\b/i)
        .map(c => c.trim().replace(/^#+/, '').toUpperCase())
        .filter(Boolean);
      const uniqueSongGenres = new Set(parts.length > 0 ? parts : ["GENERAL"]);
      uniqueSongGenres.forEach(genre => {
        counts[genre] = (counts[genre] || 0) + 1;
      });
    });
    return counts;
  }, [songs, trendingSongs, likedCount, recentlyPlayed, player.queue]);

  const filteredSongs = useMemo(() => {
    if (selectedCategory === "All") return songs;
    if (selectedCategory === "Trending") return trendingSongs;
    if (selectedCategory === "Favorites") return songs.filter(s => likedIds.has(s.id));
    if (selectedCategory === "Recently Played") return recentlyPlayed;
    if (selectedCategory === "Queue") return player.queue;

    const target = selectedCategory.trim().replace(/^#+/, '').toUpperCase();
    return songs.filter(s => {
      const raw = s.category || "General";
      const parts = raw
        .split(/[,/&|+]+|\band\b/i)
        .map(c => c.trim().replace(/^#+/, '').toUpperCase())
        .filter(Boolean);
      return parts.includes(target) || raw.toUpperCase().includes(target);
    });
  }, [selectedCategory, songs, trendingSongs, likedIds, recentlyPlayed, player.queue]);

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

        {/* Cyber Command Palette (Ctrl+K Global Search) */}
        <PlayerCommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          songs={songs}
          allDbSongs={allDbSongs}
          currentSong={songs[player.index]}
          isPlaying={player.playing}
          onPlaySong={async (song) => {
            const idx = songs.findIndex(s => s.id === song.id);
            if (idx !== -1) {
              player.selectSong(idx);
              player.play();
            } else {
              await handleAddSong(song);
            }
          }}
          onQueueSong={async (song) => {
            if (!songs.some(s => s.id === song.id)) {
              await handleAddSong(song);
            }
            player.addToQueue(song);
          }}
          onToggleLike={(songId) => {
            setLikedIds(prev => {
              const next = new Set(prev);
              if (next.has(songId)) {
                next.delete(songId);
                toast.info('Removed from Favorites');
              } else {
                next.add(songId);
                toast.success('Added to Favorites');
              }
              localStorage.setItem('fronto_liked_ids', JSON.stringify([...next]));
              return next;
            });
          }}
          likedIds={likedIds}
          onAddToPlaylist={handleAddSong}
          onRemoveFromPlaylist={handleRemoveSong}
        />
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
          <div className="relative w-full flex flex-col md:flex-row overflow-hidden min-h-[460px] md:h-[640px] lg:h-[690px] border border-[var(--text-secondary)] bg-[var(--bg-main)] shadow-[0_0_40px_rgba(var(--accent-rgb),0.1)] text-base md:text-lg">
            {/* Decorative Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)] z-20"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--accent)] z-20"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--accent)] z-20"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)] z-20"></div>

            {/* Top Toolbar - Global */}
            <PlayerToolbar
              player={player}
              songs={songs}
              safeIndex={safeIndex}
              current={current}
              onOpenSettings={onOpenSettings}
              onOpenEq={() => setIsEqOpen(true)}
              onOpenSearch={() => setIsSearchOpen(true)}
            />

            {/* Main Content Area - Full toolbar clearance */}
            <div className="flex-1 flex flex-col md:flex-row mt-10 md:mt-11 min-h-0 relative">

              {/* Atmospheric Mobile Background - Appears behind the player only on mobile */}
              <div className="md:hidden absolute inset-0 pointer-events-none overflow-hidden opacity-40 mix-blend-screen z-0">
                <img src={current?.coverUrl || '/default-cover.png'} className="w-full h-full object-cover blur-3xl scale-125 saturate-200" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-main)]/50 via-black/50 to-black/90" />
              </div>

              {/* LEFT COLUMN: Player (Flexible & Proportional) */}
              <div className="flex-1 relative flex flex-col px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b md:border-b-0 md:border-r border-transparent md:border-[var(--text-secondary)]/30 overflow-hidden z-10 justify-between">

                {/* Fade Visualizer Overlay (Player Box Only) */}
                {visualizerMode === 'fade' && (
                  <FadeVisualizer playing={player.playing} analyser={player.analyser} />
                )}

                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {/* Dynamic Visualizer Background */}
                  <div className={`absolute inset-0 pointer-events-none mix-blend-screen transition-all duration-500 ${visualizerMode === 'hex'
                      ? 'opacity-60'
                      : ['orbit', 'grid', 'matrix'].includes(visualizerMode)
                      ? 'opacity-35'
                      : 'opacity-30'
                    }`}>
                    <Visualizer playing={player.playing} analyser={player.analyser} position="bottom" />
                  </div>
                </div>

                {/* Cover Art Section - Beautifully Centered with breathing room */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-1 md:py-3 min-h-0">
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
                      className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 lg:w-60 lg:h-60 aspect-square border border-[var(--text-secondary)]/30 p-1 bg-black/40 backdrop-blur-sm shrink-0"
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
                      {/* Sleep Timer Badge */}
                      {player.sleepTimer !== null && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 border border-[var(--accent)]/50 px-2 py-1 text-[8px] font-mono text-[var(--accent)] backdrop-blur-sm shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)] z-10">
                          <Moon size={9} fill="currentColor" className="animate-pulse" />
                          <span>
                            {player.sleepTimerMode === 'end-of-track'
                              ? 'END OF TRACK'
                              : player.sleepTimerSeconds !== null && player.sleepTimerSeconds !== undefined
                              ? `${Math.floor(player.sleepTimerSeconds / 60)}:${(player.sleepTimerSeconds % 60).toString().padStart(2, '0')}`
                              : `${player.sleepTimer}M`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cover Art Reflection */}
                    <div className="relative w-44 sm:w-52 md:w-56 lg:w-60 h-8 overflow-hidden pointer-events-none -mt-0.5 hidden md:block">
                      <img
                        src={current?.coverUrl || '/default-cover.png'}
                        alt=""
                        className="w-full h-44 sm:h-52 md:h-56 lg:h-60 object-cover transform scale-y-[-1] opacity-20"
                        style={{ 
                          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
                          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
                          filter: 'blur(2px) saturate(0.5)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Track Info & Controls Section - Compact & Balanced */}
                <div className="w-full max-w-lg mx-auto space-y-2.5 md:space-y-3.5 relative z-10 pt-1 pb-1">
                  {/* Title & Artist & Actions Combined */}
                  <div className="text-center space-y-0.5 md:space-y-1">
                    <div className="flex items-start justify-center gap-2 md:gap-3">
                      {/* Like Button - Always visible */}
                      <button
                        onClick={toggleLike}
                        className={`cyber-icon-btn w-10 h-10 shrink-0 mt-1 ${current && isLiked(current.id) ? 'text-[var(--accent)] drop-shadow-[0_0_10px_var(--accent)] bg-[var(--accent)]/20 border-[var(--accent)]' : ''}`}
                        title={current && isLiked(current.id) ? "Unlike" : "Like"}
                      >
                        <Heart size={18} fill={current && isLiked(current.id) ? "currentColor" : "none"} strokeWidth={1.5} />
                      </button>

                      {/* Song Title & Artist - Always visible */}
                      <div className="flex flex-col items-center flex-1 min-w-0 px-1">
                        <h2
                          className="text-base md:text-xl lg:text-2xl font-black text-[var(--accent)] text-glow tracking-tight drop-shadow-lg truncate font-mono uppercase w-full"
                          style={{
                            textShadow: '0 0 12px var(--accent-glow), 0 2px 4px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.85)'
                          }}
                        >
                          {current?.title || 'UNKNOWN'}
                        </h2>
                        <p
                          className="text-[10px] md:text-xs text-white/90 font-bold tracking-[0.25em] md:tracking-[0.3em] uppercase mt-0.5 md:mt-1 truncate w-full"
                          style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.85)'
                          }}
                        >
                          {current?.artist || 'UNKNOWN'}
                        </p>
                        {/* Genre Tags */}
                        {current?.category && (() => {
                          const allGenres = current.category
                            .split(/[,&/|+]+|\band\b/i)
                            .map(g => g.trim().replace(/^#+/, ''))
                            .filter(Boolean);
                          const visibleGenres = allGenres.slice(0, 3);
                          const extraGenres = allGenres.slice(3);

                          return (
                            <div className="flex items-center justify-center gap-1.5 mt-1.5 max-w-full">
                              {visibleGenres.map((genre, idx) => {
                                const isActive = selectedCategory.toLowerCase() === genre.toLowerCase();
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => { playClick(); setSelectedCategory(isActive ? 'All' : genre); }}
                                    className={`text-[8px] sm:text-[9px] font-mono px-2 py-0.5 backdrop-blur-sm border uppercase tracking-wider shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-all active:scale-95 flex items-center gap-1 max-w-[120px] ${
                                      isActive
                                        ? 'bg-[var(--accent)]/25 border-[var(--accent)] text-[var(--accent)] opacity-100 shadow-[0_0_10px_rgba(var(--accent-rgb),0.35)] font-bold'
                                        : 'bg-black/50 border-[var(--accent)]/40 text-[var(--accent)] opacity-80 hover:opacity-100 hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]'
                                    }`}
                                    title={isActive ? `Clear #${genre} filter` : `Filter playlist by #${genre}`}
                                  >
                                    <span className="truncate">#{genre}</span>
                                    {isActive && <X size={8} className="shrink-0 opacity-80" />}
                                  </button>
                                );
                              })}

                              {/* Extra genres overflow badge */}
                              {extraGenres.length > 0 && (
                                <div className="relative group/moregenres">
                                  <button
                                    type="button"
                                    className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 bg-black/60 backdrop-blur-sm border border-[var(--accent)]/40 text-[var(--accent)] uppercase font-bold tracking-wider shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-all hover:bg-[var(--accent)]/20 active:scale-95 opacity-80 hover:opacity-100"
                                    title={`+${extraGenres.length} more genres: ${extraGenres.join(', ')}`}
                                  >
                                    +{extraGenres.length}
                                  </button>

                                  {/* Popover on hover/focus */}
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/moregenres:flex flex-col gap-1 p-2 bg-black/95 border border-[var(--accent)]/50 backdrop-blur-md shadow-2xl z-50 min-w-[130px] max-w-[220px] animate-in fade-in zoom-in-95 duration-150">
                                    <div className="text-[7.5px] font-mono text-white/50 tracking-wider uppercase border-b border-white/10 pb-1 mb-0.5 text-center">
                                      More Genres ({extraGenres.length})
                                    </div>
                                    <div className="flex flex-wrap gap-1 justify-center max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                                      {extraGenres.map((extra, eIdx) => {
                                        const isExtraActive = selectedCategory.toLowerCase() === extra.toLowerCase();
                                        return (
                                          <button
                                            key={eIdx}
                                            onClick={() => { playClick(); setSelectedCategory(isExtraActive ? 'All' : extra); }}
                                            className={`text-[8px] font-mono px-1.5 py-0.5 border uppercase tracking-wider transition-colors max-w-[150px] flex items-center gap-1 ${
                                              isExtraActive
                                                ? 'bg-[var(--accent)]/25 border-[var(--accent)] text-[var(--accent)] font-bold'
                                                : 'bg-[var(--accent)]/10 hover:bg-[var(--accent)]/30 text-[var(--accent)] border-[var(--accent)]/30'
                                            }`}
                                            title={isExtraActive ? `Clear #${extra} filter` : `Filter by #${extra}`}
                                          >
                                            <span className="truncate">#{extra}</span>
                                            {isExtraActive && <X size={8} className="shrink-0 opacity-80" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
              <PlayerRightPanel
                player={player}
                songs={songs}
                filteredSongs={filteredSongs}
                recentlyPlayed={recentlyPlayed}
                onClearRecentlyPlayed={onClearRecentlyPlayed}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categoryCounts={categoryCounts}
                rightTab={rightTab}
                setRightTab={setRightTab}
                isMobilePlaylistOpen={isMobilePlaylistOpen}
                setIsMobilePlaylistOpen={setIsMobilePlaylistOpen}
                drawerDragDistance={drawerDragDistance}
                onDrawerTouchStart={onDrawerTouchStart}
                onDrawerTouchMove={onDrawerTouchMove}
                onDrawerTouchEnd={onDrawerTouchEnd}
                drawerTouchStartY={drawerTouchStartY}
                isConfigMenuOpen={isConfigMenuOpen}
                setIsConfigMenuOpen={setIsConfigMenuOpen}
                onRemoveFromPlaylist={onRemoveFromPlaylist}
                onBulkRemove={onBulkRemove}
                onReorderPlaylist={onReorderPlaylist}
                localFilesInfo={localFilesInfo}
                isCached={isCached}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={onLoadMore}
                playClick={playClick}
                playHover={playHover}
              />
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

      {/* Cyber Command Palette (Ctrl+K Global Search) */}
      <PlayerCommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        songs={songs}
        allDbSongs={allDbSongs}
        currentSong={songs[player.index]}
        isPlaying={player.playing}
        onPlaySong={async (song) => {
          const idx = songs.findIndex(s => s.id === song.id);
          if (idx !== -1) {
            player.selectSong(idx);
            player.play();
          } else {
            await handleAddSong(song);
          }
        }}
        onQueueSong={async (song) => {
          if (!songs.some(s => s.id === song.id)) {
            await handleAddSong(song);
          }
          player.addToQueue(song);
        }}
        onToggleLike={(songId) => {
          setLikedIds(prev => {
            const next = new Set(prev);
            if (next.has(songId)) {
              next.delete(songId);
              toast.info('Removed from Favorites');
            } else {
              next.add(songId);
              toast.success('Added to Favorites');
            }
            localStorage.setItem('fronto_liked_ids', JSON.stringify([...next]));
            return next;
          });
        }}
        likedIds={likedIds}
        onAddToPlaylist={handleAddSong}
        onRemoveFromPlaylist={handleRemoveSong}
      />

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
          <div className="bg-black/90 backdrop-blur-xl border border-[var(--accent)]/40 px-3.5 py-2 flex items-center gap-3 shadow-[0_0_25px_rgba(var(--accent-rgb),0.15)] group font-mono">
            <Clock size={16} className="text-[var(--accent)] animate-pulse shrink-0" />
            <div className="flex flex-col min-w-[5.5rem]">
              <span className="text-[7.5px] text-[var(--accent)] uppercase tracking-widest leading-none mb-1">
                {player.sleepTimerMode === 'end-of-track' ? 'Track End Mode' : 'Sleep Mode'}
              </span>
              <span className="text-xs text-white font-bold leading-none font-mono">
                {player.sleepTimerMode === 'end-of-track'
                  ? 'End of Song'
                  : player.sleepTimerSeconds !== null && player.sleepTimerSeconds !== undefined
                  ? `${Math.floor(player.sleepTimerSeconds / 60)}:${(player.sleepTimerSeconds % 60).toString().padStart(2, '0')} Left`
                  : `${player.sleepTimer}M Left`}
              </span>
            </div>
            {/* Quick +5m and Cancel actions right on HUD */}
            <div className="flex items-center gap-1 pl-2 border-l border-white/10">
              {player.sleepTimerMode === 'time' && (
                <button
                  onClick={() => player.addSleepTime(300)}
                  className="px-1.5 py-0.5 text-[8px] border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-colors"
                  title="Add 5 minutes"
                >
                  +5M
                </button>
              )}
              <button
                onClick={() => player.setSleepTimer(null)}
                className="px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Cancel Timer"
                aria-label="Cancel timer"
              >
                ✕
              </button>
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
