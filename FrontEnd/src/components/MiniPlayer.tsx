import { Link, useLocation } from "react-router-dom";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Volume1,
  X,
  Music,
  Shuffle,
  Repeat,
  Repeat1,
  ExternalLink
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Song } from "../types/Song";
import { useSoundEffects } from "../hooks/useSoundEffects";

interface MiniPlayerProps {
  currentSong?: Song;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  audioRef?: RefObject<HTMLAudioElement | null>;
  duration?: number;
  onSeek?: (percentage: number) => void;
  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (val: number) => void;
  onToggleMute?: () => void;
  shuffle?: boolean;
  repeat?: "off" | "one" | "all";
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
}

function formatTime(secs: number) {
  if (!isFinite(secs) || isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MiniPlayer({
  currentSong,
  playing,
  onPlay,
  onPause,
  onNext,
  onPrev,
  audioRef,
  duration = 0,
  onSeek,
  volume = 70,
  isMuted = false,
  onVolumeChange,
  onToggleMute,
  shuffle = false,
  repeat = "off",
  onToggleShuffle,
  onToggleRepeat
}: MiniPlayerProps) {
  const location = useLocation();
  const { playClick, playHover } = useSoundEffects();
  const [currentTime, setCurrentTime] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [seekHoverPct, setSeekHoverPct] = useState<number | null>(null);

  const seekTrackCompactRef = useRef<HTMLDivElement | null>(null);
  const seekTrackExpandedRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSongIdRef = useRef<number | string | undefined>(currentSong?.id);

  // Auto-restore if a new song begins playing
  useEffect(() => {
    if (currentSong?.id !== lastSongIdRef.current) {
      lastSongIdRef.current = currentSong?.id;
      setIsDismissed(false);
    }
  }, [currentSong?.id]);

  // Ultra-smooth currentTime sync via rAF
  useEffect(() => {
    const update = () => {
      const audio = audioRef?.current;
      if (audio && !isDraggingSeek) {
        setCurrentTime(audio.currentTime);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioRef, isDraggingSeek]);

  // Calculate seek percentage from clientX
  const calcSeekPct = (clientX: number, target: HTMLDivElement | null) => {
    if (!target) return 0;
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.min(100, Math.max(0, (x / rect.width) * 100));
  };

  const handleSeekStart = (e: React.PointerEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!duration || duration <= 0 || !onSeek) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setIsDraggingSeek(true);
    const pct = calcSeekPct(e.clientX, ref.current);
    setCurrentTime((pct / 100) * duration);
    onSeek(pct);
  };

  const handleSeekMove = (e: React.PointerEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    const pct = calcSeekPct(e.clientX, ref.current);
    setSeekHoverPct(pct);
    if (isDraggingSeek && duration > 0 && onSeek) {
      setCurrentTime((pct / 100) * duration);
      onSeek(pct);
    }
  };

  const handleSeekEnd = () => {
    if (isDraggingSeek) {
      setIsDraggingSeek(false);
      setSeekHoverPct(null);
    }
  };

  // Hide when on main player page ("/") or when no song is active
  if (location.pathname === "/" || !currentSong) return null;

  // Minimized floating restore pill
  if (isDismissed) {
    return (
      <button
        onClick={() => { playClick(); setIsDismissed(false); }}
        onMouseEnter={playHover}
        className="fixed bottom-4 right-4 z-[90] w-10 h-10 bg-black/90 border border-[var(--accent)] text-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] hover:scale-110 active:scale-95 transition-all group"
        title={`Restore Player: ${currentSong.title}`}
        aria-label="Restore Mini Player"
      >
        <Music size={16} className={playing ? "animate-pulse" : ""} />
      </button>
    );
  }

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const remaining = Math.max(0, duration - currentTime);
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="fixed bottom-4 right-4 z-[95] font-mono">
      {/* Persistent Outer Card with Smooth Vertical Expansion Animation */}
      <div
        className="bg-black/95 border border-[var(--accent)] text-white backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_25px_rgba(var(--accent-rgb),0.25)] w-[360px] sm:w-[420px] relative overflow-hidden transition-[height,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          height: isExpanded ? '435px' : '62px'
        }}
      >
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 1. COMPACT BAR MODE (Slides down / fades out on expand) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div
          className={`absolute inset-x-0 top-0 transition-all duration-300 ease-out ${
            isExpanded ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 pointer-events-auto translate-y-0'
          }`}
        >
          {/* Top Interactive Progress & Seek Bar */}
          <div
            ref={seekTrackCompactRef}
            onPointerDown={(e) => handleSeekStart(e, seekTrackCompactRef)}
            onPointerMove={(e) => handleSeekMove(e, seekTrackCompactRef)}
            onPointerUp={handleSeekEnd}
            onPointerLeave={() => setSeekHoverPct(null)}
            className="w-full h-1.5 group/seek cursor-pointer relative bg-white/10 border-b border-white/15"
            title={seekHoverPct !== null && duration > 0 ? `Seek to: ${formatTime((seekHoverPct / 100) * duration)}` : "Click or drag to seek"}
            role="slider"
            aria-label="Song progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="absolute top-0 bottom-0 left-0 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] pointer-events-none"
              style={{ width: `${progress}%` }}
            />
            {seekHoverPct !== null && duration > 0 && !isExpanded && (
              <div
                className="absolute top-2 px-1.5 py-0.5 bg-black/95 border border-[var(--accent)] text-[var(--accent)] text-[8px] font-mono shadow-md pointer-events-none -translate-x-1/2 z-30"
                style={{ left: `${seekHoverPct}%` }}
              >
                {formatTime((seekHoverPct / 100) * duration)}
              </div>
            )}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_var(--accent)] opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none -translate-x-1/2"
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Compact Content Row */}
          <div className="px-3 py-2 flex items-center gap-2.5">
            {/* Cover Art */}
            <div className="w-10 h-10 border border-[var(--accent)]/40 overflow-hidden bg-black shrink-0 relative group/cover">
              <img
                src={currentSong.coverUrl || '/default-cover.png'}
                alt={currentSong.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-110"
              />
            </div>

            {/* Title & Artist with proper breathing room */}
            <div className="min-w-0 flex-1 pr-1">
              <div className="text-xs font-bold text-[var(--accent)] text-glow truncate uppercase tracking-tight">
                {currentSong.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/80 truncate uppercase tracking-wider font-medium">
                  {currentSong.artist || 'Unknown'}
                </span>
                {duration > 0 && (
                  <span className="text-[9px] text-white/60 font-mono shrink-0 font-semibold tracking-wider">
                    -{formatTime(remaining)}
                  </span>
                )}
              </div>
            </div>

            {/* Compact Toolbar */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { playClick(); onPrev(); }}
                onMouseEnter={playHover}
                className="w-7 h-7 flex items-center justify-center border border-white/20 bg-black/60 text-white/80 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                title="Previous"
              >
                <SkipBack size={13} strokeWidth={2} />
              </button>

              <button
                onClick={() => { playClick(); playing ? onPause() : onPlay(); }}
                onMouseEnter={playHover}
                className="w-8 h-8 flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] hover:!bg-[var(--accent)] hover:!text-black shadow-[0_0_12px_rgba(var(--accent-rgb),0.3)] transition-all"
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>

              <button
                onClick={() => { playClick(); onNext(); }}
                onMouseEnter={playHover}
                className="w-7 h-7 flex items-center justify-center border border-white/20 bg-black/60 text-white/80 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                title="Next"
              >
                <SkipForward size={13} strokeWidth={2} />
              </button>

              {/* Inline Smooth Volume Control - No clipping, stays cleanly inside card */}
              {onVolumeChange && onToggleMute && (
                <div
                  className="flex items-center group/vol"
                  onMouseEnter={() => setIsVolumeHovered(true)}
                  onMouseLeave={() => setIsVolumeHovered(false)}
                >
                  <button
                    onClick={() => { playClick(); onToggleMute(); }}
                    className={`w-7 h-7 flex items-center justify-center border transition-colors ${
                      isMuted || effectiveVolume === 0
                        ? 'border-[var(--danger)] text-[var(--danger)] bg-[var(--danger)]/10'
                        : isVolumeHovered
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-white/20 bg-black/60 text-white/80 hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                    title={isMuted ? "Unmute" : `Volume: ${volume}% (Scroll/Hover to adjust)`}
                  >
                    {isMuted || effectiveVolume === 0 ? <VolumeX size={13} /> : effectiveVolume < 50 ? <Volume1 size={13} /> : <Volume2 size={13} />}
                  </button>

                  {/* Horizontal slide-out slider within the card */}
                  <div
                    className={`flex items-center overflow-hidden transition-all duration-200 ease-out ${
                      isVolumeHovered ? 'w-16 px-1.5 opacity-100' : 'w-0 px-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={effectiveVolume}
                      onChange={(e) => onVolumeChange(Number(e.target.value))}
                      className="w-14 h-1 accent-[var(--accent)] cursor-pointer bg-white/20"
                      title={`Volume: ${effectiveVolume}%`}
                    />
                  </div>
                </div>
              )}

              {/* Expand to Floating Mini Window with Smooth Vertical Lift */}
              <button
                onClick={() => { playClick(); setIsExpanded(true); }}
                onMouseEnter={playHover}
                className="w-7 h-7 flex items-center justify-center border border-white/20 bg-black/60 text-white/80 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                title="Expand Mini Window"
              >
                <ChevronUp size={14} strokeWidth={2.5} />
              </button>

              {/* Dismiss */}
              <button
                onClick={() => { playClick(); setIsDismissed(true); }}
                onMouseEnter={playHover}
                className="w-7 h-7 flex items-center justify-center border border-white/20 bg-black/60 text-white/40 hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors"
                title="Hide Mini Player"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 2. EXPANDED MINI WINDOW (Glides in smoothly vertically) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div
          className={`absolute inset-0 flex flex-col transition-all duration-400 ease-out ${
            isExpanded ? 'opacity-100 pointer-events-auto translate-y-0 delay-75' : 'opacity-0 pointer-events-none translate-y-6'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/60 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${playing ? 'bg-[var(--accent)] animate-pulse shadow-[0_0_6px_var(--accent)]' : 'bg-white/30'}`} />
              <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">
                {playing ? 'SYS.PLAYING' : 'SYS.PAUSED'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Collapse back to compact bar with smooth slide */}
              <button
                onClick={() => { playClick(); setIsExpanded(false); }}
                onMouseEnter={playHover}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Collapse to Compact Bar"
              >
                <ChevronDown size={15} strokeWidth={2.5} />
              </button>
              {/* External link to main page */}
              <Link
                to="/"
                onClick={playClick}
                onMouseEnter={playHover}
                className="p-1 text-white/60 hover:text-[var(--accent)] hover:bg-white/10 transition-colors"
                title="Open Full Player Page"
              >
                <ExternalLink size={13} />
              </Link>
              {/* Close */}
              <button
                onClick={() => { playClick(); setIsDismissed(true); setIsExpanded(false); }}
                onMouseEnter={playHover}
                className="p-1 text-white/40 hover:text-[var(--danger)] hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-3.5 flex flex-col items-center flex-1 justify-between">
            {/* Album Cover Art */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 border border-[var(--accent)]/50 p-1 bg-black relative shadow-[0_0_20px_rgba(var(--accent-rgb),0.15)] shrink-0">
              <img
                src={currentSong.coverUrl || '/default-cover.png'}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Artist */}
            <div className="w-full text-center px-1 my-1">
              <div className="text-xs sm:text-sm font-black text-[var(--accent)] text-glow truncate uppercase tracking-tight">
                {currentSong.title}
              </div>
              <div className="text-[10px] text-white/80 font-bold uppercase tracking-widest truncate mt-0.5">
                {currentSong.artist || 'Unknown'}
              </div>
            </div>

            {/* Interactive Seeker */}
            <div className="w-full space-y-1">
              <div
                ref={seekTrackExpandedRef}
                onPointerDown={(e) => handleSeekStart(e, seekTrackExpandedRef)}
                onPointerMove={(e) => handleSeekMove(e, seekTrackExpandedRef)}
                onPointerUp={handleSeekEnd}
                onPointerLeave={() => setSeekHoverPct(null)}
                className="w-full h-2 group/seek cursor-pointer relative bg-white/10 border border-white/15"
                title={seekHoverPct !== null && duration > 0 ? `Seek to: ${formatTime((seekHoverPct / 100) * duration)}` : "Click or drag to seek"}
                role="slider"
                aria-label="Song progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] pointer-events-none"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-3.5 bg-white border border-[var(--accent)] shadow-[0_0_6px_var(--accent)] opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `${progress}%` }}
                />
              </div>

              {/* Timestamps */}
              <div className="flex justify-between text-[9px] font-mono text-white/70 tracking-wider">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className="flex items-center justify-center gap-2.5 w-full mt-1">
              {onToggleShuffle && (
                <button
                  onClick={() => { playClick(); onToggleShuffle(); }}
                  onMouseEnter={playHover}
                  className={`cyber-icon-btn w-7 h-7 shrink-0 ${shuffle ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent)]/20' : 'text-white/60 hover:text-white'}`}
                  title="Shuffle"
                >
                  <Shuffle size={12} />
                </button>
              )}

              <button
                onClick={() => { playClick(); onPrev(); }}
                onMouseEnter={playHover}
                className="cyber-icon-btn w-8 h-8 shrink-0 text-white/80 hover:text-white"
                title="Previous"
              >
                <SkipBack size={14} />
              </button>

              <button
                onClick={() => { playClick(); playing ? onPause() : onPlay(); }}
                onMouseEnter={playHover}
                className="cyber-icon-btn w-10 h-10 shrink-0 border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] hover:!bg-[var(--accent)] hover:!text-black shadow-[0_0_15px_rgba(var(--accent-rgb),0.35)] transition-all"
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>

              <button
                onClick={() => { playClick(); onNext(); }}
                onMouseEnter={playHover}
                className="cyber-icon-btn w-8 h-8 shrink-0 text-white/80 hover:text-white"
                title="Next"
              >
                <SkipForward size={14} />
              </button>

              {onToggleRepeat && (
                <button
                  onClick={() => { playClick(); onToggleRepeat(); }}
                  onMouseEnter={playHover}
                  className={`cyber-icon-btn w-7 h-7 shrink-0 ${repeat !== 'off' ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent)]/20' : 'text-white/60 hover:text-white'}`}
                  title={`Repeat: ${repeat}`}
                >
                  {repeat === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}
                </button>
              )}
            </div>

            {/* Volume Control Bar */}
            {onVolumeChange && onToggleMute && (
              <div className="flex items-center gap-2 w-4/5 mt-1">
                <button
                  onClick={() => { playClick(); onToggleMute(); }}
                  className="text-white/70 hover:text-[var(--accent)] transition-colors shrink-0"
                  title={isMuted ? "Unmute" : `Volume: ${volume}%`}
                >
                  {isMuted || effectiveVolume === 0 ? <VolumeX size={13} /> : effectiveVolume < 50 ? <Volume1 size={13} /> : <Volume2 size={13} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={effectiveVolume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-white/20 accent-[var(--accent)] cursor-pointer"
                  title="Adjust volume"
                />
                <span className="text-[8.5px] font-mono text-white/70 w-6 text-right shrink-0">
                  {effectiveVolume}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
