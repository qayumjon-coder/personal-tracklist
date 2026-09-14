import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Music, Radio } from 'lucide-react';

export function NotFound() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-mono">
      <Helmet>
        <title>404 — Signal Lost | Fronto</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="retro-grid" />
      <div className="scanline" />

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Glitch 404 */}
        <div className="relative mb-8">
          <div
            className="text-[120px] md:text-[160px] font-black leading-none select-none"
            style={{
              color: 'var(--accent)',
              textShadow: '4px 0 #ff0080, -4px 0 #00ffff',
              animation: 'glitch 2s infinite',
            }}
          >
            404
          </div>
          <div className="absolute inset-0 text-[120px] md:text-[160px] font-black leading-none select-none opacity-20"
            style={{ color: 'var(--accent)', transform: 'translate(3px, 3px)' }}>
            404
          </div>
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-16 h-16 border border-[var(--accent)] flex items-center justify-center bg-[var(--accent)]/5">
            <Music className="w-8 h-8 text-[var(--accent)] animate-pulse" />
            <div className="absolute inset-0 border border-[var(--accent)] animate-ping opacity-20" />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-xl md:text-2xl font-bold tracking-[0.3em] uppercase text-[var(--text-primary)] mb-3">
          Signal Lost
        </h1>
        <p className="text-sm text-[var(--text-secondary)] tracking-widest uppercase mb-2">
          The frequency you're looking for doesn't exist
        </p>
        <div className="flex items-center justify-center gap-2 text-[var(--accent)]/60 text-xs mb-10">
          <Radio size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
          <span className="tracking-widest">SCANNING... NO SIGNAL FOUND</span>
          <Radio size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="group flex items-center justify-center gap-2 px-8 py-3
                       border border-[var(--accent)] text-[var(--bg-main)] bg-[var(--accent)]
                       hover:bg-transparent hover:text-[var(--accent)]
                       hover:shadow-[0_0_20px_var(--accent)]
                       text-sm font-bold uppercase tracking-widest transition-all duration-300"
          >
            <Home size={16} />
            Back to Player
          </Link>
        </div>

        {/* Decorative corners */}
        <div className="absolute -top-4 -left-4 w-6 h-6 border-t-2 border-l-2 border-[var(--accent)]" />
        <div className="absolute -top-4 -right-4 w-6 h-6 border-t-2 border-r-2 border-[var(--accent)]" />
        <div className="absolute -bottom-4 -left-4 w-6 h-6 border-b-2 border-l-2 border-[var(--accent)]" />
        <div className="absolute -bottom-4 -right-4 w-6 h-6 border-b-2 border-r-2 border-[var(--accent)]" />
      </div>

      <style>{`
        @keyframes glitch {
          0%, 90%, 100% { text-shadow: 4px 0 #ff0080, -4px 0 #00ffff; }
          91% { text-shadow: -4px 0 #ff0080, 4px 0 #00ffff; transform: skewX(-2deg); }
          93% { text-shadow: 4px 0 #ff0080, -4px 0 #00ffff; transform: skewX(0); }
          95% { text-shadow: -2px 0 #ff0080, 2px 0 #00ffff; transform: skewX(1deg); }
          97% { text-shadow: 4px 0 #ff0080, -4px 0 #00ffff; transform: skewX(0); }
        }
      `}</style>
    </div>
  );
}
