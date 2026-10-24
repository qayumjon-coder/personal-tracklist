import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/formatTime';
import { useSettings } from '../contexts/SettingsContext';

interface ProgressBarProps {
  progress: number;
  buffered?: number;
  onSeek: (percentage: number) => void;
  duration?: number; // seconds (optional) to show times
}

export function ProgressBar({ progress, buffered = 0, onSeek, duration }: ProgressBarProps) {
  const { progressBarMode } = useSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
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
    setIsDragging(true);
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
    if (draggingRef.current) {
      draggingRef.current = false;
      setIsDragging(false);
    }
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
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
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

  // Generate 36 pseudo-waveform bar heights
  const waveformBars = useRef<number[]>(
    Array.from({ length: 36 }, (_, i) => Math.floor(Math.sin((i * 11) % 7) * 35 + 50))
  ).current;

  // Render Standard Mode
  if (progressBarMode === 'standard') {
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
        className="w-full relative group focus:outline-none touch-none py-2 cursor-pointer"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeProgress)}
      >
        {/* Actual bar */}
        <div className="w-full h-1.5 bg-[var(--text-secondary)]/10 border border-[var(--text-secondary)]/30 relative bg-clip-content overflow-visible">
          {/* Buffer Bar (shaffof va config mavzusiga mos) */}
          {buffered > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-[var(--accent)]/15 border-r border-[var(--accent)]/25 pointer-events-none transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, buffered))}%` }}
              title={`Buffered: ${Math.round(buffered)}%`}
            />
          )}

          {/* Active progress bar */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-[var(--accent)] pointer-events-none opacity-90 shadow-[0_0_10px_var(--accent)]"
            style={{ width: `${safeProgress}%` }}
          />

          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-5 bg-[var(--bg-main)] border border-[var(--accent)] shadow-[0_0_10px_var(--accent)] transform -translate-x-1/2 transition-transform duration-150 z-10 pointer-events-none ${
              hovered || isDragging ? 'scale-100 opacity-100' : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'
            }`}
            style={{ left: `${safeProgress}%` }}
            aria-hidden
          />
        </div>

        {(hovered || isDragging) && (
          <div
            className="absolute px-2 py-1 bg-black/90 backdrop-blur-md border border-[var(--accent)]/50 text-[var(--accent)] text-[10px] font-mono shadow-xl z-20 pointer-events-none"
            style={{ left: `${safeProgress}%`, transform: 'translate(-50%, -2rem)', top: 0 }}
          >
            {formatTime(tooltipTime)}
          </div>
        )}
      </div>
    );
  }

  // Render Waveform Mode
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
      className="w-full h-8 bg-black/40 border border-[var(--text-secondary)]/20 cursor-pointer relative group focus:outline-none touch-none px-1 flex items-center justify-between gap-[2px] overflow-hidden"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeProgress)}
    >
      {/* Waveform Bars */}
      {waveformBars.map((height, i) => {
        const barPct = (i / waveformBars.length) * 100;
        const isPassed = barPct <= safeProgress;
        const isBuffered = buffered > 0 && barPct <= buffered;
        return (
          <div
            key={i}
            className={`flex-1 transition-all duration-150 pointer-events-none ${
              isPassed
                ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] opacity-90'
                : isBuffered
                ? 'bg-[var(--accent)]/30 shadow-[0_0_4px_rgba(var(--accent-rgb),0.2)]'
                : 'bg-[var(--text-secondary)]/20 opacity-30 group-hover:opacity-50'
            }`}
            style={{ height: `${height}%` }}
          />
        );
      })}

      {/* Seek Position Line Indicator */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_#fff] z-10 pointer-events-none"
        style={{ left: `${safeProgress}%` }}
      />

      {/* Tooltip while hovering/dragging */}
      {(hovered || isDragging) && (
        <div
          className="absolute -translate-y-full top-0 px-2 py-1 bg-black/90 backdrop-blur-md border border-[var(--accent)]/50 text-[var(--accent)] text-[10px] font-mono shadow-xl z-20"
          style={{ left: `${safeProgress}%`, transform: 'translate(-50%, -0.5rem)' }}
        >
          {formatTime(tooltipTime)}
        </div>
      )}
    </div>
  );
}