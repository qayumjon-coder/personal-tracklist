import { Sliders } from 'lucide-react';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface EqualizerPanelProps {
  eq: { bass: number; mid: number; treble: number };
  setBass: (val: number) => void;
  setMid: (val: number) => void;
  setTreble: (val: number) => void;
  onClose: () => void;
}

export function EqualizerPanel({ eq, setBass, setMid, setTreble, onClose }: EqualizerPanelProps) {
  const { playClick, playHover } = useSoundEffects();

  const bands = [
    { label: 'BASS', value: eq.bass, setter: setBass },
    { label: 'MID', value: eq.mid, setter: setMid },
    { label: 'TREB', value: eq.treble, setter: setTreble },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="cyber-panel p-6 w-full max-w-sm flex flex-col gap-6 relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[var(--accent)]/30">
        
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
        <div className="flex justify-between items-center px-4 gap-4 h-48 mt-2">
          {bands.map((band, i) => (
            <div key={i} className="flex flex-col items-center justify-between h-full w-12">
              <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest font-bold">
                {band.value > 0 ? `+${band.value}` : band.value}
              </span>
              
              <div className="relative flex-1 flex items-center justify-center w-full my-3">
                {/* Track Background */}
                <div className="absolute w-1.5 h-full bg-black/80 border border-[var(--text-secondary)]/20 shadow-[inset_0_0_10px_rgba(0,0,0,1)]" />
                
                {/* Center Zero Line */}
                <div className="absolute w-4 h-[2px] bg-[var(--text-secondary)]/50 z-0 shadow-[0_0_5px_var(--text-secondary)]" />
                
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={band.value}
                  onChange={(e) => {
                    band.setter(Number(e.target.value));
                  }}
                  onPointerDown={playClick}
                  className="absolute appearance-none bg-transparent cursor-pointer z-10 custom-eq-slider"
                  style={{ width: '140px', transform: 'rotate(-90deg)' }} 
                />
              </div>

              <span className="text-[11px] font-mono text-[var(--accent)] uppercase tracking-widest font-bold">
                {band.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
