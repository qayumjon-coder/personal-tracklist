import { useEffect, useRef, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface VisualizerProps {
  playing: boolean;
  analyser?: AnalyserNode | null;
}

export function Visualizer({ playing, analyser }: VisualizerProps) {
  const { visualizerMode } = useSettings();
  
  // Refs for Bars
  const [barCount, setBarCount] = useState(32);
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const updateCount = () => {
      setBarCount(window.innerWidth < 640 ? 16 : 32);
    };
    updateCount();
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, []);

  const BAR_COUNT = barCount;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const valuesRef = useRef<number[]>(new Array(32).fill(5)); // Keep values buffer at max size for stability

  useEffect(() => {
    // Cleanup previous animation
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    if (visualizerMode === 'off' || visualizerMode === 'fade' || visualizerMode === 'scale') {
        return;
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    // WAVE MODE (Canvas)
    if (visualizerMode === 'wave') {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const animateWave = () => {
            // Resize canvas to match display size
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            if (!playing || !analyser) {
                // Draw a flat line if not playing
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)'; // Faint line
                ctx.lineWidth = 2;
                ctx.stroke();
                // animationRef.current = requestAnimationFrame(animateWave); // Optional: keep animating? No need if static.
                return;
            }

            analyser.getByteTimeDomainData(dataArray);

            ctx.lineWidth = 2;
            // Use CSS accent color if possible, or fallback. 
            // We can get it from computed style or just use a default that matches 'aqua' theme for now
            // or better: use getComputedStyle
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00FFFF';
            ctx.strokeStyle = accentColor;
            ctx.shadowBlur = 10;
            ctx.shadowColor = accentColor;

            // Calculate volume/energy for amplitude
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] - 128; // Center at 0 (-128 to 128)
                sum += v * v;
            }
            const rms = Math.sqrt(sum / bufferLength); 
            // Scale RMS to a reasonable amplitude (e.g. 0 to height/2)
            // base amplitude + music reaction
            const amplitude = (rms / 64) * (height / 3); 

            // Increment phase for movement
            // Storing phase on the canvas element or closure would be better, 
            // but for now let's use a static/global-ish approach or just a time-based one.
            // Actually, we can use performance.now()
            const time = performance.now() / 200; // Speed control
            
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            
            // Draw Sine Wave
            // We'll draw one or two periods across the width
            const frequency = 0.02; // Controls how many peaks visible
            
            ctx.moveTo(0, height / 2);

            for (let x = 0; x < width; x++) {
                // y = A * sin(B * x + C) + D
                // A = amplitude
                // B = frequency
                // C = phase (time)
                // D = vertical shift (height / 2)
                
                const y = (height / 2) + Math.sin(x * frequency + time) * amplitude;
                ctx.lineTo(x, y);
            }

            ctx.stroke();

            animationRef.current = requestAnimationFrame(animateWave);
        };
        animateWave();
    } 
    
    // BARS MODE (DOM Elements)
    else if (visualizerMode === 'bars') {
        // Collect refs
        if (containerRef.current) {
          barsRef.current = Array.from(containerRef.current.children) as HTMLDivElement[];
        }

        const animateBars = () => {
          if (playing && analyser) {
            analyser.getByteFrequencyData(dataArray);
          }

          const targetValues = valuesRef.current.map((prevVal, i) => {
            if (!playing || !analyser) return Math.max(5, prevVal * 0.9);
            const dataIndex = Math.floor(i * 1.5) + 2; 
            const rawValue = dataArray[dataIndex] || 0;
            let target = (rawValue / 255) * 100 * 1.2; 
            return Math.max(5, Math.min(100, target));
          });

          valuesRef.current = valuesRef.current.map((prev, i) => {
            const target = targetValues[i];
            const next = prev + (target - prev) * 0.2; 
            
            const bar = barsRef.current[i];
            if (bar) {
                bar.style.height = `${next}%`;
                bar.style.transform = 'none';
            }
            return next;
          });

          animationRef.current = requestAnimationFrame(animateBars);
        };
        animateBars();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser, visualizerMode]);

  if (visualizerMode === 'off' || visualizerMode === 'fade' || visualizerMode === 'scale') return null;

  if (visualizerMode === 'wave') {
      return <canvas ref={canvasRef} className="w-full h-full" />;
  }

  return (
    <div ref={containerRef} className="flex items-end justify-center gap-1 h-full w-full px-4" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          className="w-full max-w-[12px] opacity-90 transition-none"
          style={{
            height: `5%`,
            background: `linear-gradient(to top, var(--accent) 0%, transparent 100%)`
          }}
        />
      ))}
    </div>
  );
}

export function FadeVisualizer({ playing, analyser }: VisualizerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const intensityRef = useRef(0);

  useEffect(() => {
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      let targetOption = 0;

      if (playing && analyser) {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume of lower frequencies (bass)
        let sum = 0;
        const bassCount = 10; // Consider first 10 bins for bass
        for (let i = 0; i < bassCount; i++) {
            sum += dataArray[i];
        }
        const average = sum / bassCount;
        
        // Normalize 0-255 to 0-1
        targetOption = average / 255;
      }

      // Smooth it
      intensityRef.current += (targetOption - intensityRef.current) * 0.1;

      if (overlayRef.current) {
         // visual effect: inset box shadow (Left and Right only)
         // Base intensity + music reaction
         
         // Spread defines how far inward the "fade" reaches
         const spread = 20 + (intensityRef.current * 150); // 20px to 170px reach
         
         // Blur renders the softness
         const blur = 20 + (intensityRef.current * 50);

         // Opacity is handled on the element, so we just set the shadow shape
         const color = 'var(--accent)';
         
         // Left shadow: inset spread 0 blur color
         // Right shadow: inset -spread 0 blur color
         // Note: inset with positive X comes from Left. Inset with negative X comes from Right.
         overlayRef.current.style.boxShadow = `inset ${spread/2}px 0 ${blur}px -10px ${color}, inset -${spread/2}px 0 ${blur}px -10px ${color}`;
         
         const opacity = 0.2 + (intensityRef.current * 0.6); // 0.2 to 0.8
         overlayRef.current.style.opacity = opacity.toString();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser]);

  return (
    <div 
        ref={overlayRef} 
        className="absolute inset-0 pointer-events-none transition-shadow duration-75 ease-out z-0 mix-blend-screen"
        style={{
            boxShadow: 'inset 20px 0 20px -10px var(--accent), inset -20px 0 20px -10px var(--accent)',
            opacity: 0
        }}
    />
  );
}

// Hook for retrieving a scale value based on bass frequencies
export function useBeatScale(playing: boolean, analyser?: AnalyserNode | null) {
  const [scale, setScale] = useState(1);
  const animationRef = useRef<number | null>(null);
  const currentScaleRef = useRef(1);

  useEffect(() => {
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      let targetScale = 1;

      if (playing && analyser) {
        analyser.getByteFrequencyData(dataArray);
        
        // Use very low frequencies for "kick" detection
        // Average first 4 bins (very bassy)
        let sum = 0;
        const kickBins = 4;
        for (let i = 0; i < kickBins; i++) {
            sum += dataArray[i];
        }
        const average = sum / kickBins;
        
        // Map 0-255 to 1.0 - 1.4 (max 40% growth) for high visibility
        // Threshold 50 to catch most kicks
        if (average > 50) {
            // (average - 50) / 205 * 0.4
            const boost = ((average - 50) / 205) * 0.4;
            targetScale = 1 + boost;
        }
      }

      // Smooth transition - faster response (0.3)
      currentScaleRef.current += (targetScale - currentScaleRef.current) * 0.3;
      
      setScale(currentScaleRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser]);

  return scale;
}

export function AmbientBackground({ playing, analyser }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      // Resize
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let intensity = 0;
      if (playing && analyser) {
         analyser.getByteFrequencyData(dataArray);
         // Calculate bass intensity
         let sum = 0;
         for(let i=0; i<20; i++) sum += dataArray[i];
         intensity = sum / 20 / 255; // 0.0 to 1.0
      }

      // Smooth intensity could be added here similar to other hooks, 
      // but direct mapping is responsive.
      
      // Draw Radial Gradient
      // Center of screen
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Max radius covers screen
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.8;
      
      // Radius pulses with intensity
      // Base radius 40% + up to 40% more
      const radius = maxRadius * (0.4 + (intensity * 0.4));
      
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00FFFF';
      
      // Gradient
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      // Inner color: accent with variable opacity
      gradient.addColorStop(0, `${accent}${Math.floor(intensity * 80).toString(16).padStart(2,'0')}`); // hex alpha?
      // Actually closer to CSS: rgba...
      // Let's use globalAlpha for simplicity or just CSS opacity on canvas?
      // Canvas gradient color parsing is strict.
      // Let's use standard CSS color mix or just globalAlpha.
      
      ctx.globalAlpha = 0.1 + (intensity * 0.3); // Base 0.1, max 0.4
      
      ctx.fillStyle = gradient;
      // We need valid color strings for gradient. 
      // Assuming --accent is hex (e.g. #00FFFF).
      gradient.addColorStop(0, accent);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
       if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser]);

  return (
    <canvas 
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none -z-10 transition-colors duration-500"
    />
  );
}