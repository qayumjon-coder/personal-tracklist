import type { Song } from "../types/Song";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { Trash2 } from "lucide-react";

interface PlaylistProps {
  songs: Song[];
  currentSong: Song;
  onSelectSong: (song: Song) => void;
  onRemove?: (id: number) => void;
}

export function Playlist({ songs, currentSong, onSelectSong, onRemove }: PlaylistProps) {
  const { playClick, playHover } = useSoundEffects();

  return (
    <div className="flex flex-col gap-1 p-2">
      {songs.map((song, index) => {
        const isActive = song.id === currentSong?.id;
        return (
          <div key={song.id} className="relative group">
          <button
            onClick={() => { playClick(); onSelectSong(song); }}
            onMouseEnter={playHover}
            className={`w-full flex items-center justify-between gap-4 py-3 px-4 transition-all duration-300 relative border-l-2 ${
              isActive 
                ? 'bg-[var(--accent)]/10 border-[var(--accent)] shadow-[inset_0_0_20px_rgba(0,255,255,0.1)]' 
                : 'hover:bg-[var(--text-secondary)]/5 border-transparent hover:border-[var(--text-secondary)]/30'
            }`}
            style={{ 
              animation: 'fadeIn 0.5s ease-out forwards', 
              animationDelay: `${index * 0.05}s`, 
              opacity: 0 
            }}
          >
            {/* Active Indicator Bar */}
            {isActive && (
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-[var(--accent)] animate-pulse shadow-[0_0_10px_var(--accent)]"></div>
            )}

            <div className="flex items-center gap-4 flex-1 text-left overflow-hidden min-w-0">
               {/* Animated visualization bars for active track */}
              {isActive ? (
                 <div className="flex gap-0.5 items-end h-4 w-4 shrink-0 mb-0.5">
                    <div className="w-1 bg-[var(--accent)] animate-[bounce_1s_infinite] h-2"></div>
                    <div className="w-1 bg-[var(--accent)] animate-[bounce_1.2s_infinite] h-4"></div>
                    <div className="w-1 bg-[var(--accent)] animate-[bounce_0.8s_infinite] h-1.5"></div>
                 </div>
              ) : (
                <span className="text-[10px] font-mono w-4 text-[var(--text-secondary)]/40 group-hover:text-[var(--text-secondary)] text-center shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate font-mono tracking-tight uppercase ${isActive ? 'text-[var(--accent)] text-glow' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                  {song.title}
                </div>
                <div className="text-[10px] truncate font-mono uppercase tracking-[0.2em] opacity-60 mt-0.5">
                  {song.artist}
                </div>
              </div>
            </div>

            <div className={`text-[10px] font-mono shrink-0 opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-4 ${isActive ? 'text-[var(--accent)] opacity-100' : ''}`}>
               {formatDuration(song.duration)}
            </div>
          </button>
          
          {/* Remove Button */}
          {onRemove && (
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 playClick();
                 onRemove(song.id);
               }}
               className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-red-500/40 hover:text-red-500 transition-all z-20 group/remove"
               title="Remove from playlist"
            >
              <Trash2 size={18} className="drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]" />
            </button>
          )}
          </div>
        );
      })}
    </div>
  );
}

function formatDuration(d?: number) {
  if (!d) return '--:--';
  const mins = Math.floor(d / 60);
  const secs = Math.floor(d % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}
