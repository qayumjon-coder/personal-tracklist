import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Theme = "aqua" | "green" | "amber" | "pink" | "red";
type Language = "en" | "uz";
type VisualizerMode = "bars" | "wave" | "fade" | "scale" | "off";

interface SettingsContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  visualizerMode: VisualizerMode;
  setVisualizerMode: (mode: VisualizerMode) => void;
  autoplay: boolean;
  setAutoplay: (enabled: boolean) => void;
  scanlines: boolean;
  setScanlines: (enabled: boolean) => void;
  grid: boolean;
  setGrid: (enabled: boolean) => void;
  
  // Helpers
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const translations = {
  en: {
    system_config: "SYSTEM_CONFIG",
    apply_exit: "APPLY & EXIT",
    color_scheme: "COLOR SCHEME",
    visual_modules: "VISUAL MODULES",
    audio_modules: "AUDIO MODULES",
    gameplay_modules: "PLAYBACK MODULES",
    language: "LANGUAGE",
    upload: "UPLOAD",
    editor: "EDITOR",
    config: "CONFIG",
    playing: "PLAYING",
    ready: "READY",
    loading: "Loading library...",
    no_songs: "No songs found in library",
    tracklist: "TRACKLIST",
    lyrics: "LYRICS",
    fade: "FADE",
    scale: "SCALE"
  },
  uz: {
    system_config: "TIZIM_SOZLAMALARI",
    apply_exit: "SAQLASH VE CHIQISH",
    color_scheme: "RANG TIZIMI",
    visual_modules: "VIZUAL MODULLAR",
    audio_modules: "OVOZ MODULLARI",
    gameplay_modules: "PLAYBACK MODULLARI",
    language: "TIL",
    upload: "YUKLASH",
    editor: "TAHRIRLASH",
    config: "SOZLAMA",
    playing: "O'YNAMOQDA",
    ready: "TAYYOR",
    loading: "Kutubxona yuklanmoqda...",
    no_songs: "Kutubxonada qo'shiq topilmadi",
    tracklist: "TREKLAR",
    lyrics: "MATN",
    fade: "FADE",
    scale: "SCALE"
  }
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "aqua");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("language") as Language) || "en");
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("soundEnabled") !== "false"); // Default true
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>(() => (localStorage.getItem("visualizerMode") as VisualizerMode) || "bars");
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem("autoplay") !== "false"); // Default true
  const [scanlines, setScanlines] = useState(() => localStorage.getItem("scanlines") !== "false"); // Default true
  const [grid, setGrid] = useState(() => localStorage.getItem("grid") !== "false"); // Default true

  // Persistence
  useEffect(() => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("language", language);
    localStorage.setItem("soundEnabled", String(soundEnabled));
    localStorage.setItem("visualizerMode", visualizerMode);
    localStorage.setItem("autoplay", String(autoplay));
    localStorage.setItem("scanlines", String(scanlines));
    localStorage.setItem("grid", String(grid));
  }, [theme, language, soundEnabled, visualizerMode, autoplay, scanlines, grid]);

  // Apply Theme CSS
  useEffect(() => {
    const root = document.documentElement;
    const colors = {
      aqua: { primary: "#00FFFF", secondary: "#008888" },
      green: { primary: "#00FF00", secondary: "#008800" },
      amber: { primary: "#FFB000", secondary: "#885500" },
      pink: { primary: "#FF00FF", secondary: "#880088" },
      red:   { primary: "#FF0000", secondary: "#880000" },
    };
    const selected = colors[theme] || colors.aqua;
    root.style.setProperty("--text-primary", selected.primary);
    root.style.setProperty("--accent", selected.primary);
    root.style.setProperty("--cursor-color", selected.primary);
    root.style.setProperty("--text-secondary", selected.secondary);
  }, [theme]);

  // Apply Global Visuals
  useEffect(() => {
    const scanlineEl = document.querySelector('.scanline') as HTMLElement;
    const gridEl = document.querySelector('.retro-grid') as HTMLElement;
    if (scanlineEl) scanlineEl.style.display = scanlines ? 'block' : 'none';
    if (gridEl) gridEl.style.display = grid ? 'block' : 'none';
  }, [scanlines, grid]);

  // Translate helper
  const t = (key: string) => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{
      theme, setTheme,
      language, setLanguage,
      soundEnabled, setSoundEnabled,
      visualizerMode, setVisualizerMode,
      autoplay, setAutoplay,
      scanlines, setScanlines,
      grid, setGrid,
      t
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
};
