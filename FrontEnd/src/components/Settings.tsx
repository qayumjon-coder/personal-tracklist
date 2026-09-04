import { useSettings } from "../contexts/SettingsContext";
import { useNavigate } from "react-router-dom";
import { useScrollLock } from "../hooks/useScrollLock";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type Theme = "aqua" | "green" | "amber" | "pink" | "red" | "neon" | "toxic" | "sunset" | "matrix";

// Reusable toggle component with subtitle
function CyberToggle({ label, subtitle, enabled, onToggle }: { label: string; subtitle: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer py-1.5 px-2 hover:bg-[var(--text-secondary)]/5 transition-colors" onClick={onToggle}>
      <div className="flex flex-col gap-0.5">
        <span className={`text-[11px] tracking-widest font-bold transition-colors ${enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/60'}`}>
          {label}
        </span>
        <span className="text-[8px] text-[var(--text-secondary)]/40 tracking-wider leading-tight">{subtitle}</span>
      </div>
      <div className={`w-10 h-5 border flex items-center p-0.5 transition-colors shrink-0 ml-3 ${enabled ? 'border-[var(--text-primary)]' : 'border-[var(--text-secondary)]/20'}`}>
        <div className={`w-3 h-3 transition-all duration-300 ${enabled ? 'translate-x-5 bg-[var(--text-primary)] shadow-[0_0_8px_var(--text-primary)]' : 'translate-x-0 bg-[var(--text-secondary)]/20 shadow-none'}`} />
      </div>
    </div>
  );
}

// Reusable section header
function SectionHeader({ label, index }: { label: string; index: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--text-secondary)]/15">
      <span className="text-[8px] text-[var(--accent)]/50 font-mono">{index}</span>
      <div className="h-1 w-1 bg-[var(--text-primary)]"></div>
      <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-[0.3em] font-mono">{label}</label>
    </div>
  );
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const navigate = useNavigate();
  const {
    theme, setTheme,
    language, setLanguage,
    soundEnabled, setSoundEnabled,
    visualizerMode, setVisualizerMode,
    autoplay, setAutoplay,
    scanlines, setScanlines,
    grid, setGrid,
    matrixBg, setMatrixBg,
    crossfade, setCrossfade,
    progressBarMode, setProgressBarMode,
    t
  } = useSettings();

  useScrollLock(isOpen);

  const handleResetAll = () => {
    // Clear all settings keys from localStorage so defaults persist on reload
    const settingsKeys = ['theme','language','soundEnabled','visualizerMode','autoplay','scanlines','grid','matrixBg','zenMode','crossfade','progressBarMode'];
    settingsKeys.forEach(k => localStorage.removeItem(k));

    setTheme("aqua");
    setLanguage("en");
    setSoundEnabled(true);
    setVisualizerMode("bars");
    setAutoplay(true);
    setScanlines(true);
    setGrid(true);
    setMatrixBg(false);
    setCrossfade(2);
    setProgressBarMode("standard");
  };

  if (!isOpen) return null;

  // Theme gradient helper
  const getGradient = (t: Theme) => {
    switch (t) {
      case 'neon': return 'linear-gradient(135deg, #00FFFF 50%, #FF00FF 50%)';
      case 'toxic': return 'linear-gradient(135deg, #00FF00 50%, #9D00FF 50%)';
      case 'sunset': return 'linear-gradient(135deg, #FFCC00 50%, #FF0066 50%)';
      case 'matrix': return 'linear-gradient(135deg, #00FF00 50%, #003300 50%)';
      case 'aqua': return '#00FFFF';
      case 'green': return '#00FF00';
      case 'amber': return '#FFB000';
      case 'pink': return '#FF00FF';
      case 'red': return '#FF0000';
      default: return '#00FFFF';
    }
  };

  const themeNames: Record<Theme, string> = {
    aqua: 'AQUA', green: 'GREEN', amber: 'AMBER', pink: 'PINK',
    red: 'RED', neon: 'NEON', toxic: 'TOXIC', sunset: 'SUNSET', matrix: 'MATRIX'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-3xl bg-[var(--bg-main)] border border-[var(--text-primary)] shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_100px_rgba(var(--accent-rgb),0.05)] animate-in zoom-in-95 duration-200">
        {/* Decorative Corner Accents */}
        <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>
        <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>
        <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>
        <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[var(--text-primary)] z-50 pointer-events-none"></div>

        {/* Inner Scrollable Content */}
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-[var(--text-secondary)]/30 pb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-black font-mono text-[var(--text-primary)] tracking-tighter flex items-center gap-2 uppercase">
                <span className="animate-pulse">_</span>{t('system_config')}
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]/50 tracking-widest mt-1">MODULE_ID: CFG-882 // v2.0</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetAll}
                className="text-[9px] font-mono text-[var(--text-secondary)]/60 hover:text-red-400 border border-[var(--text-secondary)]/20 hover:border-red-400/50 px-3 py-1.5 transition-all uppercase tracking-widest"
                title="Reset all settings to default"
              >
                Reset
              </button>
              <button
                onClick={onClose}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-xl transition-colors p-2"
              >
                [X]
              </button>
            </div>
          </div>

          {/* Two Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 font-mono">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6">

              {/* Audio Modules */}
              <div className="space-y-2">
                <SectionHeader label={t('audio_modules')} index="01" />
                <div className="space-y-1">
                  <CyberToggle
                    label="AUDIO_HAPTIC"
                    subtitle="UI ovoz effektlari (klik, hover)"
                    enabled={soundEnabled}
                    onToggle={() => setSoundEnabled(!soundEnabled)}
                  />
                  <CyberToggle
                    label="NEURAL_AUTOFLOW"
                    subtitle="Keyingi trekni avtomatik ijro etish"
                    enabled={autoplay}
                    onToggle={() => setAutoplay(!autoplay)}
                  />
                </div>

                {/* Crossfade */}
                <div className="pt-2 px-2">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] tracking-widest font-bold text-[var(--text-primary)]">CROSSFADE_TRANSITION</span>
                      <span className="text-[8px] text-[var(--text-secondary)]/40 tracking-wider">Treklar orasida silliq o'tish</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-primary)] font-bold">{crossfade}s</span>
                  </div>
                  <div className="grid grid-cols-4 border border-[var(--text-secondary)]/20 divide-x divide-[var(--text-secondary)]/20">
                    {[0, 2, 3, 5].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setCrossfade(sec)}
                        className={`py-1.5 text-[9px] font-bold uppercase transition-colors ${crossfade === sec ? 'bg-[var(--text-primary)] text-black' : 'text-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/5'}`}
                      >
                        {sec === 0 ? 'Off' : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Modules */}
              <div className="space-y-2">
                <SectionHeader label={t('visual_modules')} index="02" />
                <div className="space-y-1">
                  <CyberToggle
                    label="SCAN_FILTERS"
                    subtitle="CRT monitor effekti (gorizontal chiziqlar)"
                    enabled={scanlines}
                    onToggle={() => setScanlines(!scanlines)}
                  />
                  <CyberToggle
                    label="MATRIX_GRID"
                    subtitle="Fonda katak (grid) ko'rsatish"
                    enabled={grid}
                    onToggle={() => {
                      const nextGrid = !grid;
                      setGrid(nextGrid);
                      if (nextGrid) setMatrixBg(false);
                    }}
                  />
                  <CyberToggle
                    label={t('matrix_bg')}
                    subtitle="Fonda Matrix yomg'ir animatsiyasi"
                    enabled={matrixBg}
                    onToggle={() => {
                      const nextMatrix = !matrixBg;
                      setMatrixBg(nextMatrix);
                      if (nextMatrix) setGrid(false);
                    }}
                  />
                </div>

                {/* Visualizer Engine */}
                <div className="pt-2 px-2">
                  <div className="flex flex-col gap-0.5 mb-2">
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em]">VISUAL_ENGINE:</span>
                    <span className="text-[8px] text-[var(--text-secondary)]/40 tracking-wider">Audio vizualizatsiya rejimi</span>
                  </div>
                  <div className="grid grid-cols-3 border border-[var(--text-secondary)]/20 divide-x divide-y divide-[var(--text-secondary)]/20 font-mono">
                    {(['off', 'bars', 'wave', 'multiwave', 'fade', 'scale', 'aurora', 'stars', 'hex']).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setVisualizerMode(mode as any)}
                        className={`px-1 py-2 text-[8px] sm:text-[9px] font-bold tracking-tighter uppercase transition-colors ${visualizerMode === mode ? 'bg-[var(--text-primary)] text-black' : 'text-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/5'}`}
                      >
                        {mode === 'hex' ? 'HEX GRID' : t(mode)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Bar Style */}
                <div className="pt-2 px-2">
                  <div className="flex flex-col gap-0.5 mb-2">
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em]">PROGRESS_BAR_STYLE:</span>
                    <span className="text-[8px] text-[var(--text-secondary)]/40 tracking-wider">Qo'shiq progress bar ko'rinishi</span>
                  </div>
                  <div className="grid grid-cols-2 border border-[var(--text-secondary)]/20 divide-x divide-[var(--text-secondary)]/20 font-mono">
                    <button
                      onClick={() => setProgressBarMode("standard")}
                      className={`py-2 text-[9px] font-bold uppercase transition-colors ${progressBarMode === "standard" ? 'bg-[var(--text-primary)] text-black' : 'text-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/5'}`}
                    >
                      ODDIY (Standard)
                    </button>
                    <button
                      onClick={() => setProgressBarMode("waveform")}
                      className={`py-2 text-[9px] font-bold uppercase transition-colors ${progressBarMode === "waveform" ? 'bg-[var(--text-primary)] text-black' : 'text-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/5'}`}
                    >
                      WAVEFORM (Visualizer)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">

              {/* Color Scheme */}
              <div className="space-y-3">
                <SectionHeader label={t('color_scheme')} index="03" />
                <div className="grid grid-cols-3 gap-2">
                  {(["aqua", "green", "amber", "pink", "red", "neon", "toxic", "sunset", "matrix"] as Theme[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setTheme(c)}
                      className={`group relative h-12 w-full border transition-all duration-300 ${theme === c
                          ? "border-[var(--text-primary)] shadow-[0_0_15px_var(--text-primary)]"
                          : "border-[var(--text-secondary)]/30 hover:border-[var(--text-primary)]/50"
                        }`}
                      title={c.toUpperCase()}
                    >
                      <div
                        className={`absolute inset-1 transition-opacity duration-300 ${theme === c ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`}
                        style={{ background: getGradient(c) }}
                      />
                      <span className={`absolute bottom-0.5 left-0 right-0 text-[7px] font-mono font-bold tracking-wider text-center transition-opacity ${theme === c ? 'opacity-100 text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]' : 'opacity-0 group-hover:opacity-70 text-white'}`}>
                        {themeNames[c]}
                      </span>
                      {theme === c && (
                        <div className="absolute inset-0 border border-[var(--text-primary)] animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selector */}
              <div className="space-y-3">
                <SectionHeader label={t('language')} index="04" />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`py-3 px-4 border text-[10px] font-bold tracking-widest transition-all flex flex-col items-center gap-1 ${language === 'en' ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-black' : 'border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'}`}
                  >
                    <span>LINK_EN</span>
                    <span className={`text-[7px] tracking-wider ${language === 'en' ? 'text-black/60' : 'text-[var(--text-secondary)]/40'}`}>English</span>
                  </button>
                  <button
                    onClick={() => setLanguage('uz')}
                    className={`py-3 px-4 border text-[10px] font-bold tracking-widest transition-all flex flex-col items-center gap-1 ${language === 'uz' ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-black' : 'border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'}`}
                  >
                    <span>LINK_UZ</span>
                    <span className={`text-[7px] tracking-wider ${language === 'uz' ? 'text-black/60' : 'text-[var(--text-secondary)]/40'}`}>O'zbekcha</span>
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="space-y-3">
                <SectionHeader label="HOTKEYS" index="05" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-2">
                  {[
                    { key: 'Space', action: 'Play / Pause' },
                    { key: '←  →', action: 'Prev / Next' },
                    { key: '↑  ↓', action: 'Volume' },
                    { key: 'M', action: 'Mute' },
                    { key: 'S', action: 'Shuffle' },
                    { key: 'R', action: 'Repeat' },
                    { key: 'Ctrl + `', action: 'Terminal' },
                    { key: 'Z', action: 'Zen Mode' },
                  ].map(({ key, action }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-[8px] text-[var(--text-secondary)]/50 tracking-wider font-mono">{action}</span>
                      <kbd className="text-[8px] text-[var(--accent)]/70 font-mono border border-[var(--text-secondary)]/15 px-1.5 py-0.5 bg-[var(--text-secondary)]/5">{key}</kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Link */}
              <div className="pt-1">
                <button
                  onClick={() => { onClose(); navigate('/admin'); }}
                  className="w-full flex items-center justify-between group p-3 border border-[var(--text-secondary)]/10 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all text-left"
                >
                  <span className="text-[10px] text-[var(--accent)] font-black tracking-[0.3em] uppercase">Access Admin Portal</span>
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Apply Button */}
          <div className="sticky bottom-0 mt-6 pt-4 pb-2 bg-[var(--bg-main)] border-t border-[var(--text-secondary)]/30 text-center">
            <button
              onClick={onClose}
              className="w-full py-4 border border-[var(--text-primary)] text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-black transition-all font-black uppercase tracking-[0.4em] shadow-[inset_0_0_10px_var(--text-primary)/20] hover:shadow-[0_0_30px_var(--text-primary)] group text-xs bg-[var(--bg-main)]"
            >
              <span className="opacity-40 group-hover:opacity-100">{'>> '}</span>
              {t('apply_exit')}
              <span className="opacity-40 group-hover:opacity-100">{' <<'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
