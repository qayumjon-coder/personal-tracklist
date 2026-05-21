import { useState, useEffect } from "react";
import * as idb from "idb-keyval";
import * as mm from "music-metadata";
import type { Song } from "../types/Song";

const FOLDER_HANDLE_KEY = "fronto_local_folder_handle";

export function useLocalFiles() {
  const [localSongs, setLocalSongs] = useState<Song[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStoredHandle, setHasStoredHandle] = useState(false);

  // Check if we have a stored handle on mount
  useEffect(() => {
    idb.get(FOLDER_HANDLE_KEY).then(handle => {
      if (handle) setHasStoredHandle(true);
    }).catch(console.error);
  }, []);

  const generateLocalId = (name: string) => {
    // Unique deterministic-ish negative ID
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = Math.imul(31, hash) + name.charCodeAt(i) | 0;
    }
    return -Math.abs(hash || Math.floor(Math.random() * 1000000));
  };

  const processFileHandle = async (fileHandle: any): Promise<Song | null> => {
    try {
      const file = await fileHandle.getFile();
      if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3") && !file.name.endsWith(".wav") && !file.name.endsWith(".m4a")) {
        return null; // Skip non-audio files
      }

      // We read metadata
      let title = file.name.replace(/\.[^/.]+$/, "");
      let artist = "Unknown Artist";
      let coverUrl = "/default_cover.jpg"; // Provide a fallback cover if needed
      let duration = 0;

      try {
        const metadata = await mm.parseBlob(file, { duration: true });
        if (metadata.common.title) title = metadata.common.title;
        if (metadata.common.artist) artist = metadata.common.artist;
        if (metadata.format.duration) duration = metadata.format.duration;
        
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            const picData = new Uint8Array(pic.data);
            const blob = new Blob([picData], { type: pic.format });
            coverUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn("Could not parse metadata for " + file.name, err);
      }

      const songUrl = URL.createObjectURL(file);

      return {
        id: generateLocalId(file.name),
        title,
        artist,
        url: songUrl,
        cover_url: coverUrl,
        coverUrl: coverUrl,
        duration: duration || 180, // Default 3 mins if duration read fails
        category: "Local",
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const scanDirectory = async (directoryHandle: any) => {
    setIsScanning(true);
    setError(null);
    try {
      const songs: Song[] = [];
      // Simple shallow scan for now (can technically do recursive)
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
          const song = await processFileHandle(entry);
          if (song) {
            // Check if already parsed
            if (!songs.some(s => s.id === song.id)) {
               songs.push(song);
            }
          }
        }
      }
      setLocalSongs(songs);
      if (songs.length > 0) {
        await idb.set(FOLDER_HANDLE_KEY, directoryHandle);
        setHasStoredHandle(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to scan directory");
      setLocalSongs([]);
    } finally {
      setIsScanning(false);
    }
  };

  const requestAccess = async () => {
    try {
      // @ts-ignore (Browser specific API)
      if (!window.showDirectoryPicker) {
         setError("Your browser does not support the File System Access API.");
         return;
      }
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      await scanDirectory(dirHandle);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         setError(err.message || "Access denied");
      }
    }
  };

  const restoreAccess = async () => {
    try {
      const handle = await idb.get(FOLDER_HANDLE_KEY);
      if (handle) {
        // We must verify permission
        // @ts-ignore
        const permission = await handle.queryPermission({ mode: 'read' });
        if (permission === 'granted') {
           await scanDirectory(handle);
        } else {
           // @ts-ignore
           const prompt = await handle.requestPermission({ mode: 'read' });
           if (prompt === 'granted') {
             await scanDirectory(handle);
           } else {
             setError("Permission denied to restore folder");
           }
        }
      }
    } catch (err: any) {
      setError("Restore failed: " + err.message);
    }
  };

  const removeLocalFiles = async () => {
     setLocalSongs([]);
     setHasStoredHandle(false);
     await idb.del(FOLDER_HANDLE_KEY);
  };

  const removeLocalFile = (id: number) => {
     setLocalSongs(prev => prev.filter(s => s.id !== id));
  };

  return {
    localSongs,
    isScanning,
    error,
    hasStoredHandle,
    requestAccess,
    restoreAccess,
    removeLocalFiles,
    removeLocalFile
  };
}
