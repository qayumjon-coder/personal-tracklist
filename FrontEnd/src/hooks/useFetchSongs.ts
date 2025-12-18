import { useEffect, useState } from "react";
import type { Song } from "../types/Song";
import { getMusicList } from "../services/musicApi";

export function useFetchSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getMusicList()
      .then((data) => {
        if (!mounted) return;
        // Normalize data: add coverUrl alias for compatibility
        const normalized = data.map(song => ({
          ...song,
          coverUrl: song.cover_url
        }));
        setSongs(normalized);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to fetch songs:', err);
        setError(err.message || 'Failed to load songs');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    songs, loading, error, refetch: () => {
      setLoading(true);
      getMusicList().then(data => {
        const normalized = data.map(song => ({
          ...song,
          coverUrl: song.cover_url
        }));
        setSongs(normalized);
        setLoading(false);
      });
    }
  };
}
