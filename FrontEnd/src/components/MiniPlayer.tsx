import { Link, useLocation } from "react-router-dom";
import { Play, Pause, SkipForward, SkipBack, Maximize2 } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Song } from "../types/Song";

interface MiniPlayerProps {
  currentSong?: Song;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  audioRef?: RefObject<HTMLAudioElement | null>;
  duration?: number;
}

function formatTime(secs: number) {
  if (!isFinite(secs) || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MiniPlayer({ currentSong, playing, onPlay, onPause, onNext, onPrev, audioRef, duration = 0 }: MiniPlayerProps) {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Poll currentTime via rAF for smooth progress
  useEffect(() => {
    const update = () => {
      const audio = audioRef?.current;
      if (audio) setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioRef]);

  // Show MiniPlayer only when NOT on the main player page ("/") and a song exists
  if (location.pathname === "/" || !currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remaining = duration - currentTime;

  return (
    <div className="fixed bottom-4 right-4 z-[90] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-black/90 border border-[var(--accent)] text-white backdrop-blur-xl shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)] font-mono w-80 sm:w-96 group relative overflow-hidden">
        {/* Progress bar at the very top */}
        <div className="w-full h-[2px] bg-[var(--accent)]/10 relative">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-none shadow-[0_0_6px_var(--accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-2.5 flex items-center gap-3">
          {/* Cover Art */}
          <div className="w-10 h-10 border border-[var(--accent)]/40 overflow-hidden bg-black shrink-0 relative">
            <img
              src={currentSong.coverUrl || '/default-cover.png'}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Track Title & Time */}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[var(--accent)] truncate uppercase tracking-tight">
              {currentSong.title}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[var(--text-secondary)] truncate uppercase tracking-wider">
                {currentSong.artist || 'Unknown'}
              </span>
              {duration > 0 && (
                <span className="text-[8px] text-[var(--accent)]/50 font-mono ml-auto shrink-0">
                  -{formatTime(remaining)}
                </span>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onPrev}
              className="p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={playing ? onPause : onPlay}
              className="p-2 bg-[var(--accent)] text-black font-bold hover:opacity-90 transition-opacity"
              title={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={onNext}
              className="p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward size={14} />
            </button>
            <Link
              to="/"
              className="p-1.5 border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all ml-1"
              title="Open Full Player"
            >
              <Maximize2 size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
