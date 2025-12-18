import { formatTime } from "../utils/formatTime";

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
}

export function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  return (
    <div className="flex justify-between text-xs text-gray-400">
      <span>{formatTime(currentTime)}</span>
      <span>{formatTime(duration)}</span>
    </div>
  );
}
