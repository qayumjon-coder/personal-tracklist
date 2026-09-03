import { useEffect, useState } from "react";
import type { Song } from "../types/Song";

// Checks which song URLs are available in the Service Worker cache
export function useCachedSongs(songs: Song[]) {
  const [cachedIds, setCachedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!songs.length || !('caches' in window)) return;

    let cancelled = false;

    const checkCache = async () => {
      try {
        const cacheNames = await caches.keys();
        // Find the runtime/precache from Workbox
        const audioCache = cacheNames.find(n =>
          n.includes('workbox') || n.includes('runtime') || n.includes('fronto')
        );

        if (!audioCache) return;

        const cache = await caches.open(audioCache);
        const keys = await cache.keys();
        const cachedUrls = new Set(keys.map(req => req.url));

        const ids = new Set<number>();
        songs.forEach(song => {
          if (song.url && cachedUrls.has(song.url)) {
            ids.add(song.id);
          }
        });

        if (!cancelled) setCachedIds(ids);
      } catch {
        // caches API may fail in some envs; silently ignore
      }
    };

    checkCache();
    return () => { cancelled = true; };
  }, [songs]);

  const isCached = (id: number) => cachedIds.has(id);

  return { cachedIds, isCached };
}
