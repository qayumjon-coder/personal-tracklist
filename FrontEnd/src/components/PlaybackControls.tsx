import { useSoundEffects } from "../hooks/useSoundEffects";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from "lucide-react";

interface PlaybackControlsProps {
  playing: boolean;
  shuffle: boolean;
  repeat: "off" | "one" | "all";
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export function PlaybackControls({
  playing,
  shuffle,
  repeat,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
}: PlaybackControlsProps) {
  const { playClick, playHover } = useSoundEffects();
  
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-8 z-30 relative w-full">
      {/* Shuffle */}
      <button
        onClick={() => { playClick(); onToggleShuffle(); }}
        onMouseEnter={playHover}
        className={`p-1.5 sm:p-2 transition-all duration-300 rounded-none hover:bg-[var(--text-secondary)]/10 ${
          shuffle 
            ? 'text-[var(--accent)] border border-[var(--accent)] shadow-[0_0_10px_var(--accent)]' 
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-secondary)]'
        }`}
        title="Shuffle"
      >
        <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Previous */}
      <button
        onClick={() => { playClick(); onPrev(); }}
        onMouseEnter={playHover}
        className="p-2 sm:p-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-secondary)]/10 transition-colors rounded-none border border-transparent hover:border-[var(--text-secondary)]"
        title="Previous"
      >
        <SkipBack className="w-5 h-5 sm:w-7 sm:h-7" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={() => { playClick(); playing ? onPause() : onPlay(); }}
        onMouseEnter={playHover}
        className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-[var(--accent)] text-[var(--bg-main)] shadow-[0_0_20px_var(--accent)] hover:shadow-[0_0_40px_var(--accent)] transition-all duration-300 group hover:scale-105 rounded-none border border-[var(--cursor-color)] shrink-0"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Play className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} fill="currentColor" />
        )}
      </button>

      {/* Next */}
      <button
        onClick={() => { playClick(); onNext(); }}
        onMouseEnter={playHover}
        className="p-2 sm:p-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-secondary)]/10 transition-colors rounded-none border border-transparent hover:border-[var(--text-secondary)]"
        title="Next"
      >
        <SkipForward className="w-5 h-5 sm:w-7 sm:h-7" />
      </button>

      {/* Repeat */}
      <button
        onClick={() => { playClick(); onToggleRepeat(); }}
        onMouseEnter={playHover}
        className={`p-1.5 sm:p-2 transition-all duration-300 relative rounded-none hover:bg-[var(--text-secondary)]/10 ${
          repeat !== 'off' 
            ? 'text-[var(--accent)] border border-[var(--accent)] shadow-[0_0_10px_var(--accent)]' 
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-secondary)]'
        }`}
        title={`Repeat: ${repeat}`}
      >
        {repeat === 'one' ? (
          <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </button>
    </div>
  );
}