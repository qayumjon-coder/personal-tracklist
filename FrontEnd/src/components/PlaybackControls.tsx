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
        className={`cyber-icon-btn w-10 h-10 sm:w-12 sm:h-12 ${
          shuffle 
            ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]' 
            : ''
        }`}
        title="Shuffle"
      >
        <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Previous */}
      <button
        onClick={() => { playClick(); onPrev(); }}
        onMouseEnter={playHover}
        className="cyber-icon-btn w-10 h-10 sm:w-14 sm:h-14"
        title="Previous"
      >
        <SkipBack className="w-5 h-5 sm:w-7 sm:h-7" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={() => { playClick(); playing ? onPause() : onPlay(); }}
        onMouseEnter={playHover}
        className="cyber-icon-btn bg-[var(--accent)]/10 border-[var(--accent)] hover:!bg-[var(--accent)] hover:!text-black hover:shadow-[0_0_20px_var(--accent-glow)] w-12 h-12 sm:w-16 sm:h-16 shrink-0 transition-all duration-300 group hover:scale-105 text-[var(--accent)]"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="w-6 h-6 sm:w-7 sm:h-7 transition-colors duration-300" strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Play className="w-6 h-6 sm:w-7 sm:h-7 transition-colors duration-300" strokeWidth={2.5} fill="currentColor" />
        )}
      </button>

      {/* Next */}
      <button
        onClick={() => { playClick(); onNext(); }}
        onMouseEnter={playHover}
        className="cyber-icon-btn w-10 h-10 sm:w-14 sm:h-14"
        title="Next"
      >
        <SkipForward className="w-5 h-5 sm:w-7 sm:h-7" />
      </button>

      {/* Repeat */}
      <button
        onClick={() => { playClick(); onToggleRepeat(); }}
        onMouseEnter={playHover}
        className={`cyber-icon-btn w-10 h-10 sm:w-12 sm:h-12 ${
          repeat !== 'off' 
            ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]' 
            : ''
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