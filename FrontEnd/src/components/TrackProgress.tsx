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
  const { currentTime, progress, buffered } = useAudioTime(audioRef);

  return (
    <div className="space-y-0.5 md:space-y-1">
      <ProgressBar
        progress={progress}
        buffered={buffered}
        onSeek={onSeek}
        duration={duration}
      />
      <div className="flex justify-between text-[10px] font-mono text-white/80 tracking-wider">
        <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)' }}>{formatTime(currentTime)}</span>
        <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)' }}>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
