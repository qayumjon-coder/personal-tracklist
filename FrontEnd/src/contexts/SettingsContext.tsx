import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";

type Theme = "aqua" | "green" | "amber" | "pink" | "red" | "neon" | "toxic" | "sunset" | "matrix";
type Language = "en" | "uz";
type VisualizerMode = "bars" | "wave" | "multiwave" | "fade" | "scale" | "aurora" | "stars" | "hex" | "vinyl" | "off";

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
  crossfade: number;
  setCrossfade: (seconds: number) => void;
  progressBarMode: "standard" | "waveform";
  setProgressBarMode: (mode: "standard" | "waveform") => void;

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

const translations: Record<Language, Record<string, string>> = {
  en: {
    system_config: "SYSTEM_CONFIG",
    apply_exit: "APPLY & EXIT",
    reset_all: "Reset",
    color_scheme: "COLOR SCHEME",
    visual_modules: "VISUAL MODULES",
    audio_modules: "AUDIO MODULES",
    gameplay_modules: "PLAYBACK MODULES",
    language: "LANGUAGE",
    upload: "UPLOAD",
    editor: "EDITOR",
    config: "Config",
    playing: "PLAYING",
    ready: "READY",
    loading: "Loading library...",
    no_songs: "No songs found in library",
    tracklist: "TRACKLIST",
    queue: "QUEUE",
    recent: "RECENT",
    lyrics: "LYRICS",
    fade: "FADE",
    scale: "SCALE",
    multiwave: "MULTIWAVE",
    aurora: "AURORA",
    bars: "BARS",
    wave: "WAVE",
    stars: "STARS",
    vinyl: "VINYL",
    off: "OFF",
    matrix_bg: "MATRIX RAIN",
    // Settings subtitles & controls
    haptic_sub: "UI sound effects (click, hover)",
    autoflow_sub: "Automatically play next track",
    crossfade_sub: "Smooth transition between tracks",
    scan_sub: "CRT monitor effect (horizontal lines)",
    grid_sub: "Show background matrix grid",
    matrix_sub: "Animated Matrix rain background",
    visual_engine: "VISUAL_ENGINE:",
    visual_engine_sub: "Audio visualization mode",
    progress_style: "PROGRESS_BAR_STYLE:",
    progress_style_sub: "Track progress bar appearance",
    progress_standard: "STANDARD",
    progress_waveform: "WAVEFORM (Visualizer)",
    access_admin: "Access Admin Portal",
    // Player toolbar & controls
    sleep: "Sleep",
    search: "Search",
    end_of_track: "End of Track",
    cancel_timer: "Cancel Timer",
    view_tracklist: "View Tracklist",
    songs_count: "SONGS",
    all_label: "ALL",
    clear_filter: "CLEAR",
    // Category dropdown
    all_genres: "ALL GENRES",
    all_tracks: "ALL TRACKS",
    trending: "TRENDING",
    favorites: "FAVORITES",
    recently_played: "RECENTLY PLAYED",
    search_genres_ph: "Search genre...",
    no_matching_genres: "No matching genres found",
    categories_word: "categories",
    clear_filter_btn: "Clear filter",
    // Command Palette
    cmd_placeholder: "Search track, artist, or genre...",
    cmd_time: "Duration:",
    cmd_time_all: "All",
    cmd_time_short: "< 2m",
    cmd_time_medium: "2–4m",
    cmd_time_long: "> 4m",
    cmd_source_all: "All",
    cmd_source_playlist: "Playlist",
    cmd_source_db: "Database",
    cmd_no_results: "No matching tracks found",
    cmd_footer_nav: "Navigate",
    cmd_footer_play: "Play",
    cmd_footer_close: "Close",
    // CTA & Upload Modal
    uploads_open: "Uploads Open",
    cta_title_1: "Upload",
    cta_title_highlight: "your music",
    cta_title_2: "directly to the mainframe",
    cta_desc: "Join our neural network. Share your frequency with the world. Uploads are now open to all units.",
    upload_track: "Upload Track",
    pending_request: "Request Pending",
    copy_link: "Copy Link",
    copied_link: "Link copied!",
    copy_failed: "Failed to copy link",
    req_sent_title: "REQUEST SENT",
    req_sent_desc: "Your request has been sent to the administrator. Access will unlock once approved.",
    req_denied_title: "ACCESS DENIED",
    req_denied_desc: "You do not have upload access or your previous request was declined. You may re-apply below.",
    req_needed_tag: "// ACCESS PERMISSION REQUIRED",
    req_needed_desc: "Administrator approval is required to upload tracks. Submit a request below.",
    req_name_label: "> YOUR NAME",
    req_name_ph: "Full name...",
    req_msg_label: "> REASON / NOTE",
    req_msg_opt: "(optional)",
    req_msg_ph: "Why would you like to upload music...",
    req_submit: "SUBMIT REQUEST",
    req_resubmit: "Re-submit Request",
    req_submitting: "SUBMITTING...",
    req_success_title: "REQUEST SUBMITTED!",
    req_success_desc: "The administrator will review it shortly. Upload will activate once approved.",
    close_btn: "CLOSE",
  },
  uz: {
    system_config: "TIZIM_SOZLAMALARI",
    apply_exit: "SAQLASH VA CHIQISH",
    reset_all: "Qayta tiklash",
    color_scheme: "RANG TUZILMASI",
    visual_modules: "VIZUAL MODULLAR",
    audio_modules: "OVOZ MODULLARI",
    gameplay_modules: "PLAYBACK MODULLARI",
    language: "TIL",
    upload: "YUKLASH",
    editor: "TAHRIRLASH",
    config: "Sozlamalar",
    playing: "IJRO ETILMOQDA",
    ready: "TAYYOR",
    loading: "Kutubxona yuklanmoqda...",
    no_songs: "Kutubxonada qo'shiq topilmadi",
    tracklist: "TREKLAR",
    queue: "NAVBAT",
    recent: "YAQINDA",
    lyrics: "QO'SHIQ MATNI",
    fade: "FADE",
    scale: "KATTALASHTIRISH",
    multiwave: "MULTIWAVE",
    aurora: "AVRORA",
    bars: "USTUNLAR",
    wave: "TO'LQIN",
    stars: "YULDUZLAR",
    vinyl: "PLASTINKA",
    off: "O'CHIK",
    matrix_bg: "MATRITSA YOMG'IRI",
    // Settings subtitles & controls
    haptic_sub: "UI ovoz effektlari (bosish, hover)",
    autoflow_sub: "Keyingi trekni avtomatik ijro etish",
    crossfade_sub: "Treklar orasida silliq o'tish",
    scan_sub: "CRT monitor effekti (gorizontal chiziqlar)",
    grid_sub: "Fonda katak (grid) ko'rsatish",
    matrix_sub: "Fonda Matrix yomg'ir animatsiyasi",
    visual_engine: "VIZUAL_DVIGATEL:",
    visual_engine_sub: "Audio vizualizatsiya rejimi",
    progress_style: "PROGRESS_BAR_USLUBI:",
    progress_style_sub: "Qo'shiq progress bar ko'rinishi",
    progress_standard: "ODDIY (Standard)",
    progress_waveform: "WAVEFORM (Vizual)",
    access_admin: "Admin Paneliga Kirish",
    // Player toolbar & controls
    sleep: "Uyqu",
    search: "Qidirish",
    end_of_track: "Trek Oxiri",
    cancel_timer: "Taymerni Bekor Qilish",
    view_tracklist: "Treklarni Ochish",
    songs_count: "TA TREK",
    all_label: "HAMMASI",
    clear_filter: "TOZALASH",
    // Category dropdown
    all_genres: "BARCHA JANRLAR",
    all_tracks: "BARCHA TREKLAR",
    trending: "TRENDING",
    favorites: "SEVIMLILAR",
    recently_played: "YAQINDA TINGLANGAN",
    search_genres_ph: "Janr nomini qidiring...",
    no_matching_genres: "Mos keluvchi janr topilmadi",
    categories_word: "ta kategoriya",
    clear_filter_btn: "Filtrni tozalash",
    // Command Palette
    cmd_placeholder: "Musiqa, ijrochi yoki janr...",
    cmd_time: "Vaqt:",
    cmd_time_all: "Hammasi",
    cmd_time_short: "< 2d",
    cmd_time_medium: "2–4d",
    cmd_time_long: "> 4d",
    cmd_source_all: "Barchasi",
    cmd_source_playlist: "Pleylist",
    cmd_source_db: "Baza",
    cmd_no_results: "Mos keluvchi trek topilmadi",
    cmd_footer_nav: "Tanlash",
    cmd_footer_play: "Ijro",
    cmd_footer_close: "Yopish",
    // CTA & Upload Modal
    uploads_open: "Yuklash Ochiq",
    cta_title_1: "Musiqangizni",
    cta_title_highlight: "to'g'ridan-to'g'ri",
    cta_title_2: "tizimga yuklang",
    cta_desc: "Neyron tarmog'imizga qo'shiling. O'z chastotangizni dunyo bilan bo'lishing.",
    upload_track: "Trek Yuklash",
    pending_request: "So'rov Kutilmoqda",
    copy_link: "Havola Nusxalash",
    copied_link: "Havola nusxalandi!",
    copy_failed: "Havolani nusxalab bo'lmadi",
    req_sent_title: "SO'ROV YUBORILGAN",
    req_sent_desc: "So'rovingiz administratorga yuborildi. Ko'rib chiqilgandan so'ng ruxsat beriladi.",
    req_denied_title: "RUXSAT BERILMAGAN",
    req_denied_desc: "Yuklash huquqingiz yo'q yoki so'rovingiz rad etilgan. Sababni yozib qayta so'rov yuborishingiz mumkin.",
    req_needed_tag: "// KIRISH RUXSATI KERAK",
    req_needed_desc: "Musiqa yuklash uchun administrator ruxsati kerak. Quyida so'rov yuboring.",
    req_name_label: "> ISMINGIZ",
    req_name_ph: "To'liq ism...",
    req_msg_label: "> SABAB / IZOH",
    req_msg_opt: "(ixtiyoriy)",
    req_msg_ph: "Nima maqsadda yuklash istaysiz...",
    req_submit: "SO'ROV YUBORISH",
    req_resubmit: "Qayta So'rov Yuborish",
    req_submitting: "YUBORILMOQDA...",
    req_success_title: "SO'ROV YUBORILDI!",
    req_success_desc: "Administrator tez orada ko'rib chiqadi. Ruxsat berilganda Upload tugmasi faol bo'ladi.",
    close_btn: "YOPISH",
  }
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "aqua");
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return saved === "uz" ? "uz" : "en";
  });
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("soundEnabled") !== "false");
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>(() => (localStorage.getItem("visualizerMode") as VisualizerMode) || "bars");
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem("autoplay") !== "false");
  const [scanlines, setScanlines] = useState(() => localStorage.getItem("scanlines") !== "false");
  const [matrixBg, setMatrixBg] = useState(() => localStorage.getItem("matrixBg") === "true");
  const [grid, setGrid] = useState(() => {
    const isMatrix = localStorage.getItem("matrixBg") === "true";
    if (isMatrix) return false;
    return localStorage.getItem("grid") !== "false";
  });
  const [zenMode, setZenMode] = useState(() => localStorage.getItem("zenMode") === "true");
  const [crossfade, setCrossfade] = useState(() => {
    const saved = localStorage.getItem("crossfade");
    const parsed = saved ? parseInt(saved, 10) : 2;
    return Number.isNaN(parsed) ? 2 : parsed;
  });
  const [progressBarMode, setProgressBarMode] = useState<"standard" | "waveform">(() => {
    return (localStorage.getItem("progressBarMode") as "standard" | "waveform") || "standard";
  });

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
    localStorage.setItem("crossfade", String(crossfade));
    localStorage.setItem("progressBarMode", progressBarMode);
  }, [theme, language, soundEnabled, visualizerMode, autoplay, scanlines, grid, matrixBg, zenMode, crossfade, progressBarMode]);

  useEffect(() => {
    const root = document.documentElement;
    const selected = THEME_COLORS[theme] || THEME_COLORS.aqua;
    root.style.setProperty("--text-primary", selected.primary);
    root.style.setProperty("--accent", selected.primary);
    root.style.setProperty("--accent-rgb", hexToRgb(selected.primary));
    root.style.setProperty("--cursor-color", selected.primary);
    root.style.setProperty("--text-secondary", selected.secondary);
  }, [theme]);

  const t = useCallback((key: string) => {
    return translations[language][key] ?? translations.en[key] ?? key;
  }, [language]);

  const value = useMemo(() => ({
    theme, setTheme,
    language, setLanguage,
    soundEnabled, setSoundEnabled,
    visualizerMode, setVisualizerMode,
    autoplay, setAutoplay,
    scanlines, setScanlines,
    grid, setGrid,
    matrixBg, setMatrixBg,
    zenMode, setZenMode,
    crossfade, setCrossfade,
    progressBarMode, setProgressBarMode,
    t
  }), [
    theme, language, soundEnabled, visualizerMode, autoplay,
    scanlines, grid, matrixBg, zenMode, crossfade, progressBarMode, t
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
};
