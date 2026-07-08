import type { RefObject } from 'react';
import { ProgressBar } from './ProgressBar';
import { useAudioTime } from '../hooks/useAudioTime';
import { formatTime } from '../utils/formatTime';

interface TrackProgressProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  onSeek: (percentage: number) => void;
}

export function TrackProgress({ audioRef, duration, onSeek }: TrackProgressProps) {
  const { currentTime, progress } = useAudioTime(audioRef);

  return (
    <div className="space-y-0.5 md:space-y-1">
      <ProgressBar
        progress={progress}
        onSeek={onSeek}
        duration={duration}
      />
      <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)] tracking-wider">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
