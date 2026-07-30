import { Link, useLocation } from "react-router-dom";
import { Play, Pause, SkipForward, SkipBack, Maximize2 } from "lucide-react";
import type { Song } from "../types/Song";

interface MiniPlayerProps {
  currentSong?: Song;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function MiniPlayer({ currentSong, playing, onPlay, onPause, onNext, onPrev }: MiniPlayerProps) {
  const location = useLocation();

  // Show MiniPlayer only when NOT on the main player page ("/") and a song exists
  if (location.pathname === "/" || !currentSong) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-black/90 border border-[var(--accent)] text-white p-2.5 backdrop-blur-xl shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)] font-mono flex items-center gap-3 w-80 sm:w-96 group relative">
        {/* Cover Art */}
        <div className="w-10 h-10 border border-[var(--accent)]/40 overflow-hidden bg-black shrink-0 relative">
          <img
            src={currentSong.coverUrl || '/default-cover.png'}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Track Title & Artist */}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-[var(--accent)] truncate uppercase tracking-tight">
            {currentSong.title}
          </div>
          <div className="text-[9px] text-[var(--text-secondary)] truncate uppercase tracking-wider">
            {currentSong.artist || 'Unknown'}
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
  );
}
