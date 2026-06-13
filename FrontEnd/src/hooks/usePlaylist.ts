import { useState, useEffect } from "react";
import { getSongsByIds } from "../services/musicApi";
import type { Song } from "../types/Song";

const PLAYLIST_KEY = "my_playlist_ids";

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
            let storedIds: number[] = [];
            try {
                storedIds = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "[]");
                if (!Array.isArray(storedIds)) {
                    storedIds = [];
                    localStorage.removeItem(PLAYLIST_KEY);
                }
            } catch (e) {
                console.warn("Corrupted playlist in storage, resetting.", e);
                localStorage.removeItem(PLAYLIST_KEY);
                storedIds = [];
            }
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

    const reorderPlaylist = (startIndex: number, endIndex: number) => {
        const newPlaylist = Array.from(playlist);
        const [removed] = newPlaylist.splice(startIndex, 1);
        newPlaylist.splice(endIndex, 0, removed);
        setPlaylist(newPlaylist);
        saveToStorage(newPlaylist);
    };

    return { playlist, loading, addToPlaylist, removeFromPlaylist, removeMultipleFromPlaylist, reorderPlaylist, error };
}
