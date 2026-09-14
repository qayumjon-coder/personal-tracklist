import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getMusicList } from "../services/musicApi";
import type { Song } from "../types/Song";
import { useSettings } from "../contexts/SettingsContext"; 
import { Play, Disc } from "lucide-react";

export default function MusicPlayer() {
  const { theme } = useSettings();
  const [musicList, setMusicList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMusicList()
      .then((data) => {
        setMusicList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-main)]">
        <div className="text-[var(--accent)] font-mono animate-pulse tracking-widest uppercase">
            Loading_Database...
        </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] p-4 md:p-8 relative overflow-hidden">
      <Helmet>
        <title>DataGrid — Music Library | Fronto</title>
        <meta name="description" content="Browse the full Fronto music library. Stream and explore your personal cyberpunk tracklist." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://fronto-music.vercel.app/" />
      </Helmet>
      {/* Background Effects */}
      <div className="retro-grid" />
      <div className="scanline" />
      
      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto mb-10 border-b border-[var(--text-secondary)]/30 pb-4 flex justify-between items-end">
        <div>
            <h1 className="text-4xl md:text-6xl font-black text-[var(--text-primary)] tracking-tighter uppercase text-glow mb-2">
                Data<span className="text-[var(--text-secondary)]">Grid</span>
            </h1>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono tracking-[0.4em] uppercase">
                Global_Music_Database // Mode: {theme.toUpperCase()}
            </p>
        </div>
        <div className="hidden md:block text-right">
             <div className="text-[var(--accent)] font-mono text-xs">{musicList.length} UNITS</div>
             <div className="text-[var(--text-secondary)] font-mono text-[9px] uppercase tracking-widest">Total Capacity</div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {musicList.map((music) => (
          <div 
            key={music.id} 
            className="group relative bg-black/40 border border-[var(--text-secondary)]/20 hover:border-[var(--accent)] transition-all duration-300 backdrop-blur-sm overflow-hidden"
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-[var(--accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="p-4 flex flex-col gap-4">
               {/* Art & Status */}
               <div className="relative aspect-square w-full overflow-hidden border border-[var(--text-secondary)]/10 group-hover:border-[var(--accent)]/30 transition-colors">
                  {music.cover_url ? (
                    <img 
                        src={music.cover_url} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--text-secondary)]/5">
                        <Disc className="text-[var(--text-secondary)]/20 animate-spin-slow" size={40} />
                    </div>
                  )}
                  
                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
                     <button className="w-12 h-12 rounded-full border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all shadow-[0_0_20px_var(--accent-glow)]">
                        <Play fill="currentColor" size={20} className="ml-1" />
                     </button>
                  </div>
               </div>

               {/* Meta */}
               <div className="space-y-1">
                  <h3 className="text-[var(--text-primary)] font-bold font-mono tracking-tight truncate text-sm group-hover:text-glow transition-all">
                    {music.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-[10px] font-mono uppercase tracking-widest truncate">
                    {music.artist || 'Unknown Unit'}
                  </p>
               </div>
               
               {/* Tech Details */}
               <div className="pt-3 border-t border-[var(--text-secondary)]/10 flex justify-between items-center text-[9px] font-mono text-[var(--text-secondary)]/50">
                  <span>ID: {music.id.toString().padStart(4, '0')}</span>
                  <span className="uppercase tracking-wider">MP3 // 320kbps</span>
               </div>
            </div>
            
            {/* Audio Element Hidden/Managed (Demo Only) */}
            <audio src={music.url} className="hidden" />
          </div>
        ))}
      </div>
      
      {/* Decorative Footer */}
      <div className="relative z-10 max-w-7xl mx-auto mt-12 py-6 border-t border-[var(--text-secondary)]/10 text-center">
         <span className="text-[var(--text-secondary)]/20 text-[9px] font-mono uppercase tracking-[0.5em]">
            End of Line_
         </span>
      </div>
    </div>
  );
}
