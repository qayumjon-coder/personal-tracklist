import { useState, useEffect } from "react";
import { getSongsByIds } from "../services/musicApi";
import type { Song } from "../types/Song";

const PLAYLIST_KEY = "my_playlist_ids";
const MAX_PLAYLIST_SIZE = 7;

export function usePlaylist() {
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load playlist on mount
    useEffect(() => {
        loadPlaylist();
    }, []);

    const loadPlaylist = async () => {
        setLoading(true);
        try {
            const storedIds = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "[]");
            if (storedIds.length > 0) {
                const songs = await getSongsByIds(storedIds);
                setPlaylist(songs);
            } else {
                setPlaylist([]);
            }
        } catch (err) {
            console.error("Failed to load playlist", err);
            setError("Failed to load playlist");
        } finally {
            setLoading(false);
        }
    };

    const addToPlaylist = async (song: Song) => {
        if (playlist.length >= MAX_PLAYLIST_SIZE) {
            return { success: false, message: `Playlist limit reach! (Max ${MAX_PLAYLIST_SIZE} songs)` };
        }

        if (playlist.some(s => s.id === song.id)) {
            return { success: false, message: "Song already in playlist" };
        }

        const newPlaylist = [...playlist, song];
        setPlaylist(newPlaylist);
        saveToStorage(newPlaylist);
        return { success: true, message: "Added to playlist" };
    };

    const removeFromPlaylist = (songId: number) => {
        const newPlaylist = playlist.filter(s => s.id !== songId);
        setPlaylist(newPlaylist);
        saveToStorage(newPlaylist);
    };

    const removeMultipleFromPlaylist = (songIds: number[]) => {
        const newPlaylist = playlist.filter(s => !songIds.includes(s.id));
        setPlaylist(newPlaylist);
        saveToStorage(newPlaylist);
    };

    const saveToStorage = (songs: Song[]) => {
        const ids = songs.map(s => s.id);
        localStorage.setItem(PLAYLIST_KEY, JSON.stringify(ids));
    };

    return { playlist, loading, addToPlaylist, removeFromPlaylist, removeMultipleFromPlaylist, error };
}
