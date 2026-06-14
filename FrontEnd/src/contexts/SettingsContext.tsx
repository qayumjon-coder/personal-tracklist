import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Theme = "aqua" | "green" | "amber" | "pink" | "red" | "neon" | "toxic" | "sunset" | "matrix";
type Language = "en" | "uz";
type VisualizerMode = "bars" | "wave" | "multiwave" | "fade" | "scale" | "aurora" | "off";

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
  matrixBg: boolean;
  setMatrixBg: (enabled: boolean) => void;
  zenMode: boolean;
  setZenMode: (enabled: boolean) => void;

  // Helpers
  t: (key: string) => string;
}

export const THEME_COLORS = {
  aqua: { primary: "#00FFFF", secondary: "#008888" },
  green: { primary: "#00FF00", secondary: "#008800" },
  amber: { primary: "#FFB000", secondary: "#885500" },
  pink: { primary: "#FF00FF", secondary: "#880088" },
  red: { primary: "#FF0000", secondary: "#880000" },
  neon: { primary: "#00FFFF", secondary: "#FF00FF" },
  toxic: { primary: "#00FF00", secondary: "#9D00FF" },
  sunset: { primary: "#FFCC00", secondary: "#FF0066" },
  matrix: { primary: "#00FF00", secondary: "#003300" },
};

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 255, 255";
};

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
    scale: "SCALE",
    multiwave: "MULTIWAVE",
    aurora: "AURORA",
    matrix_bg: "MATRIX RAIN"
  },
  uz: {
    system_config: "TIZIM_SOZLAMALARI",
    apply_exit: "SAQLASH VA CHIQISH",
    color_scheme: "RANG TUZILMASI",
    visual_modules: "VIZUAL MODULLAR",
    audio_modules: "OVOZ MODULLARI",
    gameplay_modules: "PLAYBACK MODULLARI",
    language: "TIL",
    upload: "YUKLASH",
    editor: "TAHRIRLASH",
    config: "SOZLAMALAR",
    playing: "IJRO ETILMOQDA",
    ready: "TAYYOR",
    loading: "Kutubxona yuklanmoqda...",
    no_songs: "Kutubxonada qo'shiq topilmadi",
    tracklist: "TREKLAR",
    lyrics: "QO'SHIQ MATNI",
    fade: "FADE",
    scale: "KATTALASHTIRISH",
    multiwave: "MULTIWAVE",
    aurora: "AVRORA",
    matrix_bg: "MATRITSA YOMG'IRI"
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
  const [matrixBg, setMatrixBg] = useState(() => localStorage.getItem("matrixBg") === "true"); // Default false
  const [zenMode, setZenMode] = useState(() => localStorage.getItem("zenMode") === "true"); // Default false

  // Persistence
  useEffect(() => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("language", language);
    localStorage.setItem("soundEnabled", String(soundEnabled));
    localStorage.setItem("visualizerMode", visualizerMode);
    localStorage.setItem("autoplay", String(autoplay));
    localStorage.setItem("scanlines", String(scanlines));
    localStorage.setItem("grid", String(grid));
    localStorage.setItem("matrixBg", String(matrixBg));
    localStorage.setItem("zenMode", String(zenMode));
  }, [theme, language, soundEnabled, visualizerMode, autoplay, scanlines, grid, matrixBg, zenMode]);

  // Apply Theme CSS
  useEffect(() => {
    const root = document.documentElement;
    const selected = THEME_COLORS[theme] || THEME_COLORS.aqua;
    root.style.setProperty("--text-primary", selected.primary);
    root.style.setProperty("--accent", selected.primary);
    root.style.setProperty("--accent-rgb", hexToRgb(selected.primary));
    root.style.setProperty("--cursor-color", selected.primary);
    root.style.setProperty("--text-secondary", selected.secondary);
  }, [theme]);

  // Apply Global Visuals
  useEffect(() => {
    const scanlineEl = document.querySelector('.scanline') as HTMLElement;
    const gridEl = document.querySelector('.retro-grid') as HTMLElement;
    if (scanlineEl) scanlineEl.style.display = scanlines ? 'block' : 'none';
    // Hide grid if matrix background is active to prevent visual clutter
    if (gridEl) gridEl.style.display = (grid && !matrixBg) ? 'block' : 'none';
  }, [scanlines, grid, matrixBg]);

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
      matrixBg, setMatrixBg,
      zenMode, setZenMode,
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
