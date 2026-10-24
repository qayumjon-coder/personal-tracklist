import { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useAudioTime(audioRef: RefObject<HTMLAudioElement | null>) {
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncBuffer = () => {
      if (!audio || !audio.duration || !audio.buffered || audio.buffered.length === 0) {
        return;
      }
      const cur = audio.currentTime || 0;
      let bufEnd = 0;
      for (let i = 0; i < audio.buffered.length; i++) {
        if (audio.buffered.start(i) <= cur && cur <= audio.buffered.end(i)) {
          bufEnd = audio.buffered.end(i);
          break;
        }
      }
      if (bufEnd === 0 && audio.buffered.length > 0) {
        bufEnd = audio.buffered.end(audio.buffered.length - 1);
      }
      const bufPct = Math.min(100, Math.max(0, (bufEnd / audio.duration) * 100));
      setBuffered(isNaN(bufPct) ? 0 : bufPct);
    };

    const syncTime = () => {
      const cur = audio.currentTime || 0;
      const dur = audio.duration || 0;
      setCurrentTime(cur);
      const val = dur > 0 ? (cur / dur) * 100 : 0;
      setProgress(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
      syncBuffer();
    };

    const updateLoop = () => {
      syncTime();
      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(updateLoop);
      }
    };

    const handlePlay = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateLoop);
    };

    const handlePause = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      syncTime();
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('progress', syncBuffer);
    audio.addEventListener('seeked', syncTime);
    audio.addEventListener('loadedmetadata', syncTime);
    audio.addEventListener('durationchange', syncTime);
    audio.addEventListener('ended', handlePause);

    // Initial sync
    syncTime();
    syncBuffer();
    if (!audio.paused && !audio.ended) {
      rafRef.current = requestAnimationFrame(updateLoop);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('progress', syncBuffer);
      audio.removeEventListener('seeked', syncTime);
      audio.removeEventListener('loadedmetadata', syncTime);
      audio.removeEventListener('durationchange', syncTime);
      audio.removeEventListener('ended', handlePause);
    };
  }, [audioRef]);

  return { currentTime, progress, buffered };
}
