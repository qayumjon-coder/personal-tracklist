import { useState, useCallback, useEffect } from "react";
import type { Song } from "../types/Song";

const STORAGE_KEY = "fronto_recently_played";
const MAX_HISTORY = 20;

function loadFromStorage(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(songs: Song[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch {}
}

export function useRecentlyPlayed() {
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(loadFromStorage);

  const addRecentlyPlayed = useCallback((song: Song) => {
    setRecentlyPlayed(prev => {
      // Remove duplicate if already exists
      const filtered = prev.filter(s => s.id !== song.id);
      // Add to front, keep max
      const next = [song, ...filtered].slice(0, MAX_HISTORY);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearRecentlyPlayed = useCallback(() => {
    setRecentlyPlayed([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recentlyPlayed, addRecentlyPlayed, clearRecentlyPlayed };
}
