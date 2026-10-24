import { Activity } from 'lucide-react';
import { useRef, useCallback, useState } from 'react';
import { useSoundEffects } from '../hooks/useSoundEffects';
import type { AudioEffect } from '../hooks/useAudioPlayer';

interface EqualizerPanelProps {
  eq: { bass: number; mid: number; treble: number };
  setBass: (val: number) => void;
  setMid: (val: number) => void;
  setTreble: (val: number) => void;
  activeEffect: AudioEffect;
  setEffect: (eff: AudioEffect) => void;
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

export function EqualizerPanel({ eq, setBass, setMid, setTreble, activeEffect, setEffect, onClose }: EqualizerPanelProps) {
  const { playClick, playHover } = useSoundEffects();
  const [activeTab, setActiveTab] = useState<'eq' | 'fx'>('eq');

  const bands: SliderBand[] = [
    { label: 'BASS', value: eq.bass, setter: setBass },
    { label: 'MID',  value: eq.mid,  setter: setMid  },
    { label: 'TREB', value: eq.treble, setter: setTreble },
  ];

  const effects: { id: AudioEffect; label: string }[] = [
    { id: 'none', label: 'OFF' },
    { id: 'underwater', label: 'ABYSS' },
    { id: 'radio', label: 'LO-FI' },
    { id: '8d', label: '8D ORBIT' },
    { id: 'bass-boost', label: 'BASS MAX' },
    { id: 'echo', label: 'VOID' }
  ];

  const presets = [
    { id: 'flat', label: 'FLAT', bass: 0, mid: 0, treble: 0 },
    { id: 'bass', label: 'BASS BOOST', bass: 9, mid: 1, treble: -1 },
    { id: 'electronic', label: 'ELECTRONIC', bass: 7, mid: 2, treble: 6 },
    { id: 'vocal', label: 'VOCAL CLEAR', bass: -3, mid: 7, treble: 4 },
    { id: 'cyber', label: 'CYBER / SCI-FI', bass: 8, mid: -4, treble: 8 },
  ];

  const currentPreset = presets.find(
    p => p.bass === eq.bass && p.mid === eq.mid && p.treble === eq.treble
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="cyber-panel p-5 sm:p-6 w-full max-w-md flex flex-col gap-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[var(--accent)]/30">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--text-secondary)]/20 pb-3">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Activity size={18} />
            <h2 className="font-mono font-bold tracking-widest text-sm uppercase">Neural Audio</h2>
          </div>
          <button
            onClick={() => { playClick(); onClose(); }}
            onMouseEnter={playHover}
            className="cyber-btn px-3 py-1 text-[10px]"
          >
            CLOSE
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { playClick(); setActiveTab('eq'); }}
            onMouseEnter={playHover}
            className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-[var(--accent)]/30 transition-all ${activeTab === 'eq' ? 'bg-[var(--accent)]/20 text-[var(--accent)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]' : 'text-[var(--text-secondary)] hover:border-[var(--accent)]'}`}
          >
            Equalizer
          </button>
          <button
            onClick={() => { playClick(); setActiveTab('fx'); }}
            onMouseEnter={playHover}
            className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-[var(--accent)]/30 transition-all ${activeTab === 'fx' ? 'bg-[var(--accent)]/20 text-[var(--accent)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]' : 'text-[var(--text-secondary)] hover:border-[var(--accent)]'}`}
          >
            Effects
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[15rem] mt-1 flex flex-col">
          {activeTab === 'eq' ? (
            <div className="flex flex-col flex-1 animate-in fade-in zoom-in-95 duration-200">
              {/* Presets Chips */}
              <div className="mb-3">
                <div className="text-[8px] font-mono text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-1.5 opacity-60 text-center">
                  PRESETS:
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {presets.map(p => {
                    const isSelected = currentPreset?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          playClick();
                          setBass(p.bass);
                          setMid(p.mid);
                          setTreble(p.treble);
                        }}
                        onMouseEnter={playHover}
                        className={`px-2 py-1 text-[8px] sm:text-[9px] font-mono tracking-wider uppercase border transition-all ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-black font-bold shadow-[0_0_10px_var(--accent)]'
                            : 'border-[var(--text-secondary)]/30 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-white bg-black/40'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div className="flex justify-around items-stretch h-44 px-2 mt-1">
                {bands.map((band, i) => (
                  <VerticalSlider key={i} {...band} playClick={playClick} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 h-full px-2 animate-in fade-in zoom-in-95 duration-200">
              {effects.map(fx => (
                <button
                  key={fx.id}
                  onClick={() => { playClick(); setEffect(fx.id); }}
                  onMouseEnter={playHover}
                  className={`cyber-btn flex items-center justify-center py-3 text-[10px] sm:text-xs tracking-widest uppercase transition-all ${
                    activeEffect === fx.id 
                      ? 'bg-[var(--accent)] text-black font-bold shadow-[0_0_15px_var(--accent)] border-transparent' 
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {fx.label}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
