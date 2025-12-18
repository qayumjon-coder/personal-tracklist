import { useSettings } from "../contexts/SettingsContext";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type Theme = "aqua" | "green" | "amber" | "pink" | "red";

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { 
    theme, setTheme, 
    language, setLanguage,
    soundEnabled, setSoundEnabled,
    visualizerMode, setVisualizerMode,
    autoplay, setAutoplay,
    scanlines, setScanlines, 
    grid, setGrid,
    t
  } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[var(--bg-main)] border border-[var(--text-primary)] shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
        {/* Decorative Corner Accents - FIXED position outside of scroll area */}
        <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>
        <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>
        <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>
        <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>

        {/* Inner Scrollable Content */}
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 border-b border-[var(--text-secondary)]/30 pb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-black font-mono text-[var(--text-primary)] tracking-tighter flex items-center gap-2 uppercase">
                <span className="animate-pulse">_</span>{t('system_config')}
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]/50 tracking-widest mt-1">MODULE_ID: CFG-882</span>
            </div>
            <button 
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-xl transition-colors p-2"
            >
              [X]
            </button>
          </div>

          {/* Content Sections */}
          <div className="space-y-10 font-mono">
            
            {/* Theme Selector */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1 w-1 bg-[var(--text-primary)]"></div>
                <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-[0.3em] font-mono">{t('color_scheme')}</label>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {(["aqua", "green", "amber", "pink", "red"] as Theme[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setTheme(c)}
                    className={`group relative h-10 w-full border transition-all duration-300 ${
                      theme === c 
                        ? "border-[var(--text-primary)] shadow-[0_0_15px_var(--text-primary)]" 
                        : "border-[var(--text-secondary)]/30 hover:border-[var(--text-primary)]/50"
                    }`}
                    title={c}
                  >
                    <div 
                      className={`absolute inset-1 transition-opacity duration-300 ${theme === c ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`}
                      style={{ backgroundColor: c === 'aqua' ? '#00FFFF' : c === 'green' ? '#00FF00' : c === 'amber' ? '#FFB000' : c === 'pink' ? '#FF00FF' : '#FF0000' }}
                    />
                    {theme === c && (
                      <div className="absolute inset-0 border border-[var(--text-primary)] animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1 w-1 bg-[var(--text-primary)]"></div>
                <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-[0.3em] font-mono">{t('language')}</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => setLanguage('en')}
                   className={`py-2 px-4 border text-[10px] font-bold tracking-widest transition-all ${language === 'en' ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-black' : 'border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'}`}
                 >
                   LINK_EN
                 </button>
                 <button 
                   onClick={() => setLanguage('uz')}
                   className={`py-2 px-4 border text-[10px] font-bold tracking-widest transition-all ${language === 'uz' ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-black' : 'border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'}`}
                 >
                   LINK_UZ
                 </button>
              </div>
            </div>

            {/* Visual Modules */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-1 bg-[var(--text-primary)]"></div>
                <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-[0.3em] font-mono">{t('visual_modules')}</label>
              </div>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setScanlines(!scanlines)}>
                  <span className={`text-[11px] tracking-widest font-bold ${scanlines ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/60'}`}>
                    SCAN_FILTERS
                  </span>
                  <div className={`w-10 h-5 border flex items-center p-0.5 transition-colors ${scanlines ? 'border-[var(--text-primary)]' : 'border-[var(--text-secondary)]/20'}`}>
                    <div className={`w-3 h-3 transition-all duration-300 ${scanlines ? 'translate-x-5 bg-[var(--text-primary)] shadow-[0_0_8px_var(--text-primary)]' : 'translate-x-0 bg-[var(--text-secondary)]/20 shadow-none'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setGrid(!grid)}>
                  <span className={`text-[11px] tracking-widest font-bold ${grid ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/60'}`}>
                    MATRIX_GRID
                  </span>
                  <div className={`w-10 h-5 border flex items-center p-0.5 transition-colors ${grid ? 'border-[var(--text-primary)]' : 'border-[var(--text-secondary)]/20'}`}>
                    <div className={`w-3 h-3 transition-all duration-300 ${grid ? 'translate-x-5 bg-[var(--text-primary)] shadow-[0_0_8px_var(--text-primary)]' : 'translate-x-0 bg-[var(--text-secondary)]/20 shadow-none'}`} />
                  </div>
                </div>
                
                <div className="pt-2">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3 block">VISUAL_ENGINE:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 border border-[var(--text-secondary)]/20 divide-x divide-y sm:divide-y-0 divide-[var(--text-secondary)]/20">
                     {(['off', 'bars', 'wave', 'fade', 'scale']).map((mode) => (
                       <button 
                          key={mode}
                          onClick={() => setVisualizerMode(mode as any)} 
                          className={`px-1 py-2 text-[9px] font-bold tracking-tighter uppercase transition-colors ${visualizerMode === mode ? 'bg-[var(--text-primary)] text-black' : 'text-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/5'}`}
                        >
                         {mode}
                       </button>
                     ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Modules */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-1 bg-[var(--text-primary)]"></div>
                <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-[0.3em] font-mono">{t('audio_modules')}</label>
              </div>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setSoundEnabled(!soundEnabled)}>
                  <span className={`text-[11px] tracking-widest font-bold ${soundEnabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/60'}`}>
                    AUDIO_HAPTIC
                  </span>
                  <div className={`w-10 h-5 border flex items-center p-0.5 transition-colors ${soundEnabled ? 'border-[var(--text-primary)]' : 'border-[var(--text-secondary)]/20'}`}>
                    <div className={`w-3 h-3 transition-all duration-300 ${soundEnabled ? 'translate-x-5 bg-[var(--text-primary)] shadow-[0_0_8px_var(--text-primary)]' : 'translate-x-0 bg-[var(--text-secondary)]/20 shadow-none'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setAutoplay(!autoplay)}>
                  <span className={`text-[11px] tracking-widest font-bold ${autoplay ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/60'}`}>
                    NEURAL_AUTOFLOW
                  </span>
                  <div className={`w-10 h-5 border flex items-center p-0.5 transition-colors ${autoplay ? 'border-[var(--text-primary)]' : 'border-[var(--text-secondary)]/20'}`}>
                    <div className={`w-3 h-3 transition-all duration-300 ${autoplay ? 'translate-x-5 bg-[var(--text-primary)] shadow-[0_0_8px_var(--text-primary)]' : 'translate-x-0 bg-[var(--text-secondary)]/20 shadow-none'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Apply Button (inside scroll for accessibility) */}
            <div className="mt-4 pt-6 border-t border-[var(--text-secondary)]/30 text-center">
              <button 
                  onClick={onClose}
                  className="w-full py-4 border border-[var(--text-primary)] text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-black transition-all font-black uppercase tracking-[0.4em] shadow-[inset_0_0_10px_var(--text-primary)/20] hover:shadow-[0_0_30px_var(--text-primary)] group text-xs"
              >
                <span className="opacity-40 group-hover:opacity-100">{'>> '}</span>
                {t('apply_exit')}
                <span className="opacity-40 group-hover:opacity-100">{' <<'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
