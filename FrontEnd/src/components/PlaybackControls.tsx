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
        className={`glass-playback-btn w-10 h-10 sm:w-12 sm:h-12 hover:scale-105 transition-all duration-200 ${
          shuffle 
            ? '!border-[var(--accent)] !bg-[var(--accent)]/25 !text-[var(--accent)] shadow-[0_0_18px_rgba(var(--accent-rgb),0.4),inset_0_0_10px_rgba(var(--accent-rgb),0.2)]' 
            : 'text-white/75 hover:text-[var(--accent)]'
        }`}
        title={`Shuffle: ${shuffle ? 'ON' : 'OFF'}`}
      >
        <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200" />
      </button>

      {/* Previous */}
      <button
        onClick={() => { playClick(); onPrev(); }}
        onMouseEnter={playHover}
        className="glass-playback-btn w-10 h-10 sm:w-14 sm:h-14 hover:scale-105 transition-all duration-200 text-white/85 hover:text-[var(--accent)] group"
        title="Previous"
      >
        <SkipBack className="w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-200 group-hover:-translate-x-0.5" />
      </button>

      {/* Play/Pause (Hero Centerpiece) */}
      <button
        onClick={() => { playClick(); playing ? onPause() : onPlay(); }}
        onMouseEnter={playHover}
        className={`glass-playback-btn w-12 h-12 sm:w-16 sm:h-16 shrink-0 transition-all duration-300 group hover:scale-105 hover:!bg-[var(--accent)] hover:!text-black hover:shadow-[0_0_30px_var(--accent-glow)] ${
          playing
            ? '!border-[var(--accent)] !bg-[var(--accent)]/20 text-[var(--accent)] shadow-[0_0_25px_rgba(var(--accent-rgb),0.45),inset_0_0_15px_rgba(var(--accent-rgb),0.25)]'
            : '!border-[var(--accent)]/70 text-[var(--accent)] shadow-[0_0_18px_rgba(var(--accent-rgb),0.25)]'
        }`}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 drop-shadow-[0_0_8px_var(--accent)]" strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Play className="w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 drop-shadow-[0_0_8px_var(--accent)] ml-0.5" strokeWidth={2.5} fill="currentColor" />
        )}
      </button>

      {/* Next */}
      <button
        onClick={() => { playClick(); onNext(); }}
        onMouseEnter={playHover}
        className="glass-playback-btn w-10 h-10 sm:w-14 sm:h-14 hover:scale-105 transition-all duration-200 text-white/85 hover:text-[var(--accent)] group"
        title="Next"
      >
        <SkipForward className="w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {/* Repeat */}
      <button
        onClick={() => { playClick(); onToggleRepeat(); }}
        onMouseEnter={playHover}
        className={`glass-playback-btn w-10 h-10 sm:w-12 sm:h-12 hover:scale-105 transition-all duration-200 ${
          repeat !== 'off' 
            ? '!border-[var(--accent)] !bg-[var(--accent)]/25 !text-[var(--accent)] shadow-[0_0_18px_rgba(var(--accent-rgb),0.4),inset_0_0_10px_rgba(var(--accent-rgb),0.2)]' 
            : 'text-white/75 hover:text-[var(--accent)]'
        }`}
        title={`Repeat: ${repeat}`}
      >
        {repeat === 'one' ? (
          <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200" />
        ) : (
          <Repeat className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200" />
        )}
      </button>
    </div>
  );
}