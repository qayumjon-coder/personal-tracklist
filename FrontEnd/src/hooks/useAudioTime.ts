import { useState, useEffect } from 'react';
import type { RefObject } from 'react';

export function useAudioTime(audioRef: RefObject<HTMLAudioElement | null>) {
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const val = (audio.currentTime / audio.duration) * 100;
      setProgress(isNaN(val) ? 0 : val);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    // Initial sync
    handleTimeUpdate();

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef]);

  return { currentTime, progress };
}
