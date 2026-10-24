import { useEffect, useState, useRef } from 'react';
import { useSoundEffects } from '../hooks/useSoundEffects';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const { playClick, playStartup, playScan } = useSoundEffects();
  const playScanRef = useRef(playScan);
  const playStartupRef = useRef(playStartup);
  useEffect(() => { playScanRef.current = playScan; }, [playScan]);
  useEffect(() => { playStartupRef.current = playStartup; }, [playStartup]);
  
  // Track if interaction has happened so we can play sounds
  const [hasInteracted, setHasInteracted] = useState(false);
  const interactedRef = useRef(false);
  const bootFinishedRef = useRef(false);
  
  const bootLogs = [
    "INITIALIZING_SYSTEM_CORE...",
    "CONNECTING_TO_DATABASE...",
    "LOADING_AUDIO_ENGINE...",
    "BYPASSING_FIREWALLS...",
    "ESTABLISHING_ENCRYPTED_LINK...",
    "AUTHENTICATING_USER...",
    "SYSTEM_READY."
  ];

  useEffect(() => {
    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < bootLogs.length) {
        setLogs(prev => [...prev.slice(-3), `> ${bootLogs[currentLog]}`]);
        setProgress(Math.min(100, (currentLog + 1) * 15));
        
        // Use refs so sound functions are never stale
        if (interactedRef.current && currentLog < bootLogs.length - 1) {
           playScanRef.current();
        } else if (interactedRef.current && currentLog === bootLogs.length - 1) {
           playStartupRef.current();
        }

        currentLog++;
      } else {
        setProgress(100);
        bootFinishedRef.current = true;
        // If user already interacted but boot finished before their tap, play now
        if (interactedRef.current) {
          playStartupRef.current();
        }
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      interactedRef.current = true;
      
      if (bootFinishedRef.current) {
        // Boot already done — play startup immediately
        playStartupRef.current();
      } else {
        // Wake up AudioContext on first gesture
        playClick(); 
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center font-mono cursor-pointer select-none"
      onClick={handleInteraction}
    >
      {!hasInteracted && (
        <div className="absolute top-10 text-[10px] text-[var(--accent)]/60 animate-pulse tracking-widest uppercase">
          [ Tap anywhere to enable sound ]
        </div>
      )}

      {/* Logo / Brand */}
      <div className="relative z-10 mb-12 text-center">
        <div className="text-[40px] font-black tracking-[0.3em] uppercase text-[var(--accent)] text-glow" style={{ fontFamily: 'Fira Code, monospace' }}>
          FRONTO
        </div>
        <div className="text-[9px] text-[var(--text-secondary)]/60 tracking-[0.5em] uppercase mt-1">Neural Music System</div>
      </div>
      
      <div className="w-72 space-y-4 relative z-10">
        <div className="flex justify-between text-[10px] text-[var(--accent)] tracking-widest">
            <span>SYS_BOOT_REv.5.0</span>
            <span>{progress}%</span>
        </div>
        
        <div className="h-[2px] w-full bg-white/5 relative overflow-hidden">
            <div 
                className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-all duration-300 shadow-[0_0_10px_var(--accent)]"
                style={{ width: `${progress}%` }}
            />
            {/* Shimmer */}
            <div
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-300"
              style={{ left: `calc(${progress}% - 40px)` }}
            />
        </div>

        <div className="flex flex-col gap-1 min-h-[60px]">
            {logs.map((log, i) => (
                <div key={i} className={`text-[8px] uppercase tracking-tighter transition-opacity duration-300 ${i === logs.length - 1 ? 'text-[var(--accent)] opacity-100' : 'text-[var(--accent)]/40 opacity-60'}`}>
                    {log}
                </div>
            ))}
        </div>
      </div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
