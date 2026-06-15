import { Sliders } from 'lucide-react';
import { useRef, useCallback } from 'react';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface EqualizerPanelProps {
  eq: { bass: number; mid: number; treble: number };
  setBass: (val: number) => void;
  setMid: (val: number) => void;
  setTreble: (val: number) => void;
  onClose: () => void;
}

interface SliderBand {
  label: string;
  value: number;
  setter: (val: number) => void;
}

function VerticalSlider({ label, value, setter, playClick }: SliderBand & { playClick: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const valueToPercent = (v: number) => (v + 12) / 24; // 0..1, 0=bottom(-12), 1=top(+12)

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  const getValueFromY = useCallback((clientY: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
    return Math.round(ratio * 24 - 12);
  }, [value]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    playClick();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setter(getValueFromY(e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setter(getValueFromY(e.clientY));
  };

  const onPointerUp = () => { dragging.current = false; };

  const thumbPercent = 1 - valueToPercent(value); // top=0%, bottom=100%

  return (
    <div className="flex flex-col items-center gap-2 h-full select-none">
      {/* Value label */}
      <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold w-8 text-center">
        {value > 0 ? `+${value}` : value}
      </span>

      {/* Slider track area */}
      <div
        ref={trackRef}
        className="relative flex-1 w-8 cursor-pointer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Track line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-[var(--text-secondary)]/20" />

        {/* Zero mark */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-[1px] bg-[var(--text-secondary)]/60" style={{ boxShadow: '0 0 4px var(--text-secondary)' }} />

        {/* Fill above/below zero */}
        {value !== 0 && (() => {
          const zeroTop = 50; // percent
          const thumbTop = thumbPercent * 100;
          const isAbove = value > 0;
          const top = isAbove ? thumbTop : zeroTop;
          const height = Math.abs(thumbTop - zeroTop);
          return (
            <div
              className="absolute left-1/2 -translate-x-1/2 w-[2px]"
              style={{
                top: `${top}%`,
                height: `${height}%`,
                background: 'var(--accent)',
                boxShadow: '0 0 6px var(--accent-glow)',
              }}
            />
          );
        })()}

        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-4 border border-[var(--accent)] bg-[var(--bg-main)] z-10 pointer-events-none"
          style={{
            top: `${thumbPercent * 100}%`,
            boxShadow: '0 0 8px var(--accent-glow), inset 0 0 4px rgba(0,0,0,0.8)',
          }}
        />
      </div>

      {/* Band label */}
      <span className="text-[11px] font-mono text-[var(--accent)] uppercase tracking-widest font-bold">
        {label}
      </span>
    </div>
  );
}

export function EqualizerPanel({ eq, setBass, setMid, setTreble, onClose }: EqualizerPanelProps) {
  const { playClick, playHover } = useSoundEffects();

  const bands: SliderBand[] = [
    { label: 'BASS', value: eq.bass, setter: setBass },
    { label: 'MID',  value: eq.mid,  setter: setMid  },
    { label: 'TREB', value: eq.treble, setter: setTreble },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="cyber-panel p-6 w-full max-w-xs flex flex-col gap-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[var(--accent)]/30">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--text-secondary)]/20 pb-3">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Sliders size={18} />
            <h2 className="font-mono font-bold tracking-widest text-sm uppercase">Neural EQ</h2>
          </div>
          <button
            onClick={() => { playClick(); onClose(); }}
            onMouseEnter={playHover}
            className="cyber-btn px-3 py-1 text-[10px]"
          >
            CLOSE
          </button>
        </div>

        {/* Sliders */}
        <div className="flex justify-around items-stretch h-52 px-2">
          {bands.map((band, i) => (
            <VerticalSlider key={i} {...band} playClick={playClick} />
          ))}
        </div>

      </div>
    </div>
  );
}
