import { useEffect, useRef, useState } from "react";

interface VisualizerProps {
  playing: boolean;
}

export function TerminalVisualizer({ playing }: VisualizerProps) {
  // Fewer bars for a smaller footprint
  const [bars, setBars] = useState<number[]>(new Array(16).fill(5));
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      if (playing) {
        timeRef.current += 0.15; // Slightly faster for "digital" feel
        
        setBars(prev => prev.map((_, i) => {
          const x = i / prev.length;
          
          // Digital/Techno math
          const wave1 = Math.sin(x * 10 + timeRef.current) * 25;
          const beat = Math.pow(Math.sin(timeRef.current * 0.9 + i), 10) * 50; 
          const jitter = Math.random() < 0.2 ? Math.random() * 30 : 0; // Glitchy movements

          let value = 10 + wave1 + beat + jitter;
          return Math.max(5, Math.min(100, value));
        }));
      } else {
        setBars(prev => prev.map(bar => Math.max(2, bar * 0.8))); 
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing]);

  return (
    <div className="flex items-end gap-[2px] h-24 w-48 opacity-80" aria-hidden="true">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-full bg-[#00FFFF]"
          style={{
            height: `${height}%`,
            opacity: 0.5 + (height / 200) // Taller bars = brighter
          }}
        />
      ))}
    </div>
  );
}
