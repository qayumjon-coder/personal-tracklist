import { useEffect, useState, useRef } from 'react';
import { useSoundEffects } from '../hooks/useSoundEffects';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const { playClick, playStartup, playScan } = useSoundEffects();
  
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
        
        // Play scan sound if we have interacted
        if (interactedRef.current && currentLog < bootLogs.length - 1) {
           playScan();
        } else if (interactedRef.current && currentLog === bootLogs.length - 1) {
           playStartup(); // Play final boot sound
        }

        currentLog++;
      } else {
        setProgress(100);
        bootFinishedRef.current = true;
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [playScan, playStartup]);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      interactedRef.current = true;
      
      if (bootFinishedRef.current) {
        // If boot is already done, just play the startup sound immediately
        playStartup();
      } else {
        // Try to initialize audio context on first click
        playClick(); 
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center font-mono cursor-pointer"
      onClick={handleInteraction}
    >
      {!hasInteracted && (
        <div className="absolute top-10 text-[10px] text-[var(--accent)]/60 animate-pulse tracking-widest uppercase">
          [ Tap anywhere to enable sound ]
        </div>
      )}
      
      <div className="w-64 space-y-4 relative z-10">
        <div className="flex justify-between text-[10px] text-[var(--accent)] tracking-widest animate-pulse">
            <span>SYS_BOOT_REv.5.0</span>
            <span>{progress}%</span>
        </div>
        
        <div className="h-1 w-full bg-white/5 relative overflow-hidden">
            <div 
                className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-all duration-300 shadow-[0_0_10px_var(--accent)]"
                style={{ width: `${progress}%` }}
            />
        </div>

        <div className="flex flex-col gap-1">
            {logs.map((log, i) => (
                <div key={i} className="text-[8px] text-[var(--accent)]/60 uppercase tracking-tighter">
                    {log}
                </div>
            ))}
        </div>
      </div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
