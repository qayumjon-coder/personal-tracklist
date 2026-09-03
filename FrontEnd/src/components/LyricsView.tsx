import { X, Mic2 } from "lucide-react";
import { useEffect, useRef, useMemo } from "react";
import type { RefObject } from "react";
import { useAudioTime } from "../hooks/useAudioTime";
import type { Song } from "../types/Song";

interface LyricsLine {
  time: number;
  text: string;
}

interface LyricsViewProps {
  song: Song;
  audioRef: RefObject<HTMLAudioElement | null>;
  onClose: () => void;
}

export function LyricsView({ song, audioRef, onClose }: LyricsViewProps) {
  const { currentTime } = useAudioTime(audioRef);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  // Parse LRC into structured data
  const lyricsData = useMemo(() => {
    if (!song.lyrics) return [];
    
    const lines = song.lyrics.split('\n');
    const parsed: LyricsLine[] = [];
    const lrcRegex = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

    lines.forEach(line => {
      const match = line.trim().match(lrcRegex);
      if (match) {
        const mins = parseInt(match[1]);
        const secs = parseFloat(match[2]);
        const text = match[3].trim();
        parsed.push({ time: mins * 60 + secs, text: text || "•••" });
      } else if (line.trim()) {
        // Fallback or header lines (without timestamps)
        parsed.push({ time: -1, text: line.trim() });
      }
    });

    return parsed;
  }, [song.lyrics]);

  const hasTimestamps = lyricsData.some(l => l.time !== -1);
  
  // Find current active line index
  const activeIndex = useMemo(() => {
    if (!hasTimestamps) return -1;
    let index = -1;
    for (let i = 0; i < lyricsData.length; i++) {
        if (lyricsData[i].time !== -1 && lyricsData[i].time <= currentTime) {
            index = i;
        } else if (lyricsData[i].time > currentTime) {
            break;
        }
    }
    return index;
  }, [lyricsData, currentTime, hasTimestamps]);

  // Auto-scroll logic
  useEffect(() => {
    if (activeIndex !== -1 && activeLineRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const activeLine = activeLineRef.current;
        
        const targetScroll = activeLine.offsetTop - (container.clientHeight / 2) + (activeLine.clientHeight / 2);
        
        container.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
    }
  }, [activeIndex]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black overflow-hidden animate-in fade-in zoom-in duration-500">
      {/* Blurred Background */}
      <div 
        className="absolute inset-0 z-0 opacity-50 blur-[80px] scale-110"
        style={{ 
          backgroundImage: `url(${song.coverUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />
      <div className="absolute inset-0 bg-black/80 z-10" />

      {/* Header */}
      <div className="relative z-20 w-full max-w-4xl flex items-center justify-between p-6 md:p-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-full">
            <Mic2 size={20} className="text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-white font-black text-lg uppercase tracking-wider">{song.title}</h2>
            <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-[0.2em]">{song.artist}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 group"
          title="Exit Karaoke Mode"
        >
          <X className="text-white group-hover:rotate-90 transition-transform duration-500" size={24} />
        </button>
      </div>

      {/* Lyrics Content */}
      <div 
        ref={scrollContainerRef}
        className="relative z-20 flex-1 w-full max-w-4xl overflow-y-auto px-6 md:px-10 py-10 custom-scrollbar mask-fade scroll-smooth"
      >
        <div className="flex flex-col gap-8 md:gap-12 py-[40vh]">
          {lyricsData.length > 0 ? (
            lyricsData.map((line, i) => {
              const isActive = i === activeIndex;
              return (
                <p 
                  key={i} 
                  ref={isActive ? activeLineRef : null}
                  className={`
                    text-3xl md:text-5xl lg:text-6xl font-black transition-all duration-700 cursor-default leading-tight tracking-tight selection:bg-[var(--accent)]/30
                    ${isActive ? 'text-white scale-105 blur-0' : 'text-white/20 blur-[1px]'}
                    ${!hasTimestamps ? 'text-white/60 hover:text-white' : ''}
                  `}
                >
                  {line.text}
                </p>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
               <div className="relative">
                 <Mic2 size={52} className="text-[var(--accent)]/20" />
                 <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--accent)]/40 animate-ping" />
               </div>
               <div className="text-center">
                 <p className="text-xl font-black uppercase tracking-[0.3em] text-white/50 mb-2">No Lyrics Found</p>
                 <p className="text-[10px] font-mono text-[var(--accent)]/30 tracking-[0.25em] uppercase">This track has no synchronized lyrics data</p>
               </div>
               <div className="flex gap-2 items-center opacity-30">
                 <div className="w-8 h-px bg-[var(--accent)]" />
                 <span className="text-[9px] font-mono text-[var(--accent)] tracking-widest">LYRICS_NULL</span>
                 <div className="w-8 h-px bg-[var(--accent)]" />
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="relative z-20 w-full p-6 text-center opacity-30 font-mono text-[10px] uppercase tracking-[0.5em] text-white">
        Fronto Neural Node — SYNC_ENABLED
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .mask-fade {
          mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
      `}} />
    </div>
  );
}
