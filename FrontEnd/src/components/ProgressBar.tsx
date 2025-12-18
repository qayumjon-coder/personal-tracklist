import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/formatTime';

interface ProgressBarProps {
  progress: number;
  onSeek: (percentage: number) => void;
  duration?: number; // seconds (optional) to show times
}

export function ProgressBar({ progress, onSeek, duration }: ProgressBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [localProgress, setLocalProgress] = useState(() => Math.min(100, Math.max(0, progress || 0)));
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    // Keep localProgress in sync when not dragging
    if (!draggingRef.current) setLocalProgress(Math.min(100, Math.max(0, progress || 0)));
  }, [progress]);

  const calcPercentageFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    return pct;
  };

  const startDrag = (clientX: number) => {
    draggingRef.current = true;
    const pct = calcPercentageFromClientX(clientX);
    setLocalProgress(pct);
    onSeek(pct);
  };

  const moveDrag = (clientX: number) => {
    if (!draggingRef.current) return;
    const pct = calcPercentageFromClientX(clientX);
    setLocalProgress(pct);
    onSeek(pct);
  };

  const endDrag = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => moveDrag(e.clientX);
    const onPointerUp = () => endDrag();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Capture the pointer so we keep receiving events
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    startDrag(e.clientX);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // simple click-to-seek
    const pct = calcPercentageFromClientX(e.clientX);
    setLocalProgress(pct);
    onSeek(pct);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Left/Right arrows for accessibility
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1; // shift = bigger steps
      const delta = e.key === 'ArrowRight' ? step : -step;
      const next = Math.min(100, Math.max(0, (localProgress || 0) + delta));
      setLocalProgress(next);
      onSeek(next);
    }
  };

  const safeProgress = Math.min(100, Math.max(0, localProgress || 0));

  // compute tooltip time (seconds)
  const tooltipTime = (typeof duration === 'number' && !isNaN(duration)) ? (duration * safeProgress) / 100 : 0;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Song progress"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className="w-full h-2 bg-[var(--text-secondary)]/10 rounded-none border border-[var(--text-secondary)]/30 cursor-pointer relative group focus:outline-none touch-none py-2 bg-clip-content"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeProgress)}
    >
      {/* Track Background (visible part of track) */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-transparent rounded-none pointer-events-none" />

      {/* Fill */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-full bg-[var(--accent)] rounded-none pointer-events-none transition-[width] duration-75 ease-out opacity-80"
        style={{ width: `${safeProgress}%` }}
      />
      
      {/* Thumb (Glow effect) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-5 bg-[var(--bg-main)] border border-[var(--accent)] rounded-none shadow-[0_0_10px_var(--accent)] transform -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform duration-200 z-10 pointer-events-none"
        style={{ left: `${safeProgress}%` }}
        aria-hidden
      />

      {/* Tooltip while hovering/dragging */}
      {(hovered || draggingRef.current) && (
        <div
          className="absolute -translate-y-full mb-3 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono rounded-md shadow-lg"
          style={{ left: `${safeProgress}%`, transform: 'translate(-50%, -0.5rem)' }}
        >
          {formatTime(tooltipTime)}
        </div>
      )}
    </div>
  );
}