import { Moon, Search } from "lucide-react";
import { useState } from "react";
import type { Song } from "../types/Song";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { useAudioPlayer } from "../hooks/useAudioPlayer";

interface PlayerToolbarProps {
  player: ReturnType<typeof useAudioPlayer>;
  songs: Song[];
  safeIndex: number;
  current?: Song;
  onOpenSettings: () => void;
  onOpenEq: () => void;
  onOpenSearch: () => void;
}

export function PlayerToolbar({
  player,
  songs,
  safeIndex,
  current,
  onOpenSettings,
  onOpenEq,
  onOpenSearch
}: PlayerToolbarProps) {
  const { playClick, playHover } = useSoundEffects();
  const [isSleepTimerMenuOpen, setIsSleepTimerMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  return (
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
          onClick={() => { playClick(); onOpenEq(); }}
          onMouseEnter={playHover}
          className="hidden sm:flex cyber-btn px-2 sm:px-3 py-1 text-[9px] group items-center justify-center"
          title="Neural Audio (EQ / FX)"
        >
          <span className="opacity-60 group-hover:opacity-100 hidden sm:inline">[</span>
          <span className="mx-1 hidden sm:inline">EQ/FX</span>
          <span className="opacity-60 group-hover:opacity-100 hidden sm:inline">]</span>
        </button>

        <button
          onClick={() => { playClick(); onOpenSearch(); }}
          onMouseEnter={playHover}
          className="cyber-btn px-2 sm:px-3 py-1 text-[9px] group flex items-center justify-center gap-2"
          title="Search"
        >
          <Search size={14} className="sm:w-2.5 sm:h-2.5" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>
    </div>
  );
}
