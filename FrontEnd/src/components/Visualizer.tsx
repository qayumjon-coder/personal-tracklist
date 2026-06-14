import { useEffect, useRef, useState } from "react";
import { useSettings, THEME_COLORS, hexToRgb } from "../contexts/SettingsContext";

interface VisualizerProps {
  playing: boolean;
  analyser?: AnalyserNode | null;
}

export function Visualizer({ playing, analyser }: VisualizerProps) {
  const { visualizerMode, theme } = useSettings();
  const accentColorRef = useRef('#00E5FF');
  const accentRgbRef = useRef('0, 255, 255');

  useEffect(() => {
    const selected = THEME_COLORS[theme] || THEME_COLORS.aqua;
    accentColorRef.current = selected.primary;
    accentRgbRef.current = hexToRgb(selected.primary);
  }, [theme, visualizerMode]);

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
          ctx.strokeStyle = `rgba(${accentRgbRef.current}, 0.2)`; // Faint line
          ctx.lineWidth = 2;
          ctx.stroke();
          // animationRef.current = requestAnimationFrame(animateWave); // Optional: keep animating? No need if static.
          return;
        }

        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        // We use the dynamic accent color
        const accentColor = accentColorRef.current;
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

        if (playing) {
          animationRef.current = requestAnimationFrame(animateWave);
        }
      };
      animateWave();
    }

    // MULTIWAVE MODE (Canvas)
    else if (visualizerMode === 'multiwave') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Colors based on the provided image
      const waveColors = [
        'rgba(147, 51, 234, 0.7)',  // Purple
        'rgba(236, 72, 153, 0.7)',  // Pink
        'rgba(245, 158, 11, 0.7)',  // Orange
        'rgba(253, 224, 71, 0.7)',  // Yellow
        'rgba(34, 197, 94, 0.7)',   // Green
        'rgba(59, 130, 246, 0.7)'   // Blue
      ];
      const numWaves = waveColors.length;

      const animateMultiWave = () => {
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        if (!playing || !analyser) {
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          ctx.lineTo(width, centerY);
          ctx.strokeStyle = `rgba(${accentRgbRef.current}, 0.2)`;
          ctx.lineWidth = 2;
          ctx.stroke();
          return;
        }

        analyser.getByteTimeDomainData(dataArray);

        // To make it react more dynamically like a visualizer, we can also use frequency data
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] - 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / bufferLength);
        const baseAmplitude = (rms / 64) * (height / 3);

        const time = performance.now() / 1000;

        // Setup global styles for glowing, overlapping look
        ctx.globalCompositeOperation = 'screen';

        for (let w = 0; w < numWaves; w++) {
          const color = waveColors[w];
          ctx.fillStyle = color;

          // Add a subtle glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;

          const wavePhase = time * (1 + w * 0.5);
          const waveFreq = 0.003 + (w * 0.001);

          // Sample frequency data for this specific wave layer to give them independent reactions
          const freqIdx = Math.floor((w / numWaves) * (freqData.length * 0.5)); // Focus on lower/mid freq
          const freqAmpModifier = 1 + (freqData[freqIdx] / 255) * 1.5;

          ctx.beginPath();
          ctx.moveTo(0, centerY);

          // Draw Top Half
          for (let x = 0; x < width; x++) {
            const normX = x / width;

            // Envelope to taper ends to zero
            // Using a power sine curve for smoother tapering that matches the image
            const envelope = Math.pow(Math.sin(normX * Math.PI), 2);

            const dataIdx = Math.floor(normX * bufferLength);
            const signal = ((dataArray[dataIdx] - 128) / 128); // -1 to 1

            // Combine sine wave, audio signal, and envelope
            // The sine function gives the basic rolling wave shape
            const sineOffset = Math.sin(x * waveFreq + wavePhase);

            // Modulate the offset heavily by the frequency and amplitude
            const yOffset = (sineOffset * 0.5 + signal * (0.5 + w * 0.2)) * baseAmplitude * freqAmpModifier * envelope;

            const y = centerY - Math.abs(yOffset); // Top half only
            ctx.lineTo(x, y);
          }

          // Draw Bottom Half (Reflection)
          for (let x = width; x >= 0; x--) {
            const normX = x / width;
            const envelope = Math.pow(Math.sin(normX * Math.PI), 2);
            const dataIdx = Math.floor(normX * bufferLength);
            const signal = ((dataArray[dataIdx] - 128) / 128);

            const sineOffset = Math.sin(x * waveFreq + wavePhase);
            const yOffset = (sineOffset * 0.5 + signal * (0.5 + w * 0.2)) * baseAmplitude * freqAmpModifier * envelope;

            const y = centerY + Math.abs(yOffset); // Bottom half reflection
            ctx.lineTo(x, y);
          }

          ctx.closePath();
          ctx.fill();
        }

        // Reset composite operation to default
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;

        // Add a central bright line to accentuate the audio center
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        // We use the raw signal for the center line for crisp reaction
        const centerAmp = baseAmplitude * 0.5;
        for (let x = 0; x < width; x++) {
          const normX = x / width;
          const envelope = Math.pow(Math.sin(normX * Math.PI), 2);
          const dataIdx = Math.floor(normX * bufferLength);
          const signal = ((dataArray[dataIdx] - 128) / 128);

          const y = centerY + signal * centerAmp * envelope;
          ctx.lineTo(x, y);
        }

        // Use dynamic color for the line
        const accentColor = accentColorRef.current;
        ctx.strokeStyle = `rgba(${accentRgbRef.current}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.shadowColor = accentColor;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (playing) {
          animationRef.current = requestAnimationFrame(animateMultiWave);
        }
      };
      animateMultiWave();
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

        if (playing) {
          animationRef.current = requestAnimationFrame(animateBars);
        }
      };

      // We always run once to set the static baseline
      animateBars();
    }


    // AURORA NEON BEATS MODE (Vertical Aurora/Neon bars with high performance)
    else if (visualizerMode === 'aurora') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // const numBeams = 100; // Increased to 100 for exact high-density neon line replication

      // Define atmospheric colors dynamically linked to the website's themes
      const themePalettes: Record<string, {
        primary: string;
        secondary: string;
      }> = {
        aqua: { primary: '0, 255, 255', secondary: '0, 136, 136' },
        green: { primary: '0, 255, 0', secondary: '0, 136, 0' },
        amber: { primary: '255, 176, 0', secondary: '136, 85, 0' },
        pink: { primary: '255, 0, 255', secondary: '136, 0, 136' },
        red: { primary: '255, 0, 0', secondary: '136, 0, 0' },
        neon: { primary: '0, 255, 255', secondary: '255, 0, 255' },
        toxic: { primary: '0, 255, 0', secondary: '157, 0, 255' },
        sunset: { primary: '255, 204, 0', secondary: '255, 0, 102' },
        matrix: { primary: '0, 255, 0', secondary: '0, 51, 0' }
      };

      // Initialize 40 ambient floating particles (Aurora dust)
      const numParticles = 45;
      const particles = Array.from({ length: numParticles }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.2 + Math.random() * 2.0,
        speedY: 0.15 + Math.random() * 0.35,
        amplitudeX: 0.3 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speedPhase: 0.01 + Math.random() * 0.02
      }));
      const animateAurora = () => {
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const cy = height / 2;

        ctx.clearRect(0, 0, width, height);

        let bassIntensity = 0;
        let rms = 0;

        if (playing && analyser) {
          analyser.getByteFrequencyData(dataArray);

          // Calculate bass energy (first 15 frequency bands)
          let bassSum = 0;
          const bassBins = 15;
          for (let b = 0; b < bassBins; b++) {
            bassSum += dataArray[b] || 0;
          }
          bassIntensity = bassSum / (bassBins * 255);

          // Calculate overall RMS/volume energy
          let totalSum = 0;
          const totalBins = Math.min(bufferLength, 128);
          for (let b = 0; b < totalBins; b++) {
            totalSum += dataArray[b] || 0;
          }
          rms = totalSum / (totalBins * 255);
        }

        const palette = themePalettes[theme] || themePalettes.aqua;

        // 1. Draw deep ambient radial backdrop glow pulsing with bass
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const bgGlowRad = Math.max(100, Math.min(width, height) * (0.35 + bassIntensity * 0.25));
        const bgGradient = ctx.createRadialGradient(width / 2, cy, 0, width / 2, cy, bgGlowRad);
        bgGradient.addColorStop(0, `rgba(${palette.primary}, ${0.12 + bassIntensity * 0.18})`);
        bgGradient.addColorStop(0.5, `rgba(${palette.secondary}, ${0.04 + bassIntensity * 0.06})`);
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // 2. Render & Update Floating Particles (Aurora Dust)
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let p = 0; p < numParticles; p++) {
          const part = particles[p];

          // Particles float upwards, speed is modulated by overall music volume
          part.y -= part.speedY * (1.0 + rms * 2.5);
          part.phase += part.speedPhase;

          // Recycle particles going off-screen
          if (part.y < -5) {
            part.y = 105;
            part.x = Math.random() * 100;
          }

          const px = (part.x / 100) * width + Math.sin(part.phase) * part.amplitudeX * 20;
          const py = (part.y / 100) * height;

          // Glow bubble for the particle
          const pRadius = part.size * (2.0 + rms * 2.5);
          const pGlow = ctx.createRadialGradient(px, py, 0, px, py, pRadius);
          pGlow.addColorStop(0, `rgba(${palette.primary}, ${0.8 + rms * 0.2})`);
          pGlow.addColorStop(0.3, `rgba(${palette.secondary}, ${0.35 * (1.0 + rms)})`);
          pGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = pGlow;
          ctx.beginPath();
          ctx.arc(px, py, pRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 3. Ultra-Realistic Aurora Borealis Effect
        ctx.globalCompositeOperation = 'lighter';
        const time = performance.now() * 0.0003;

        const sliceWidth = 3;
        const numSlices = Math.ceil(width / sliceWidth);

        const getBaseY = (normX: number, layer: number) => {
          const sway1 = Math.sin(time * 0.5 + normX * 3 + layer);
          const sway2 = Math.sin(time * 0.8 + normX * 5 - layer * 2);
          const sway3 = Math.cos(time * 0.3 + normX * 7 + layer * 3);

          return cy + 60 + (sway1 * 40 + sway2 * 20 + sway3 * 10) - (bassIntensity * 40);
        };

        const [r1, g1, b1] = palette.primary.split(',').map(Number);
        const [r2, g2, b2] = palette.secondary.split(',').map(Number);

        // Pre-calculate smoothed frequency data to avoid jagged spikes (removes "fluid stream" look)
        const smoothedAudio = new Array(numSlices).fill(0);
        for (let i = 0; i < numSlices; i++) {
          const normDist = Math.abs((i / numSlices) - 0.5) * 2;
          const freqIdx = Math.floor(Math.min(1, normDist) * (bufferLength * 0.35));
          const freqVal = playing && analyser ? dataArray[freqIdx] / 255 : 0;
          smoothedAudio[i] = freqVal;
        }

        // Moving average to create broad majestic pillars instead of narrow fluid drops
        const smoothRadius = Math.max(10, Math.floor(numSlices / 15));
        const finalAudio = new Array(numSlices).fill(0);
        for (let i = 0; i < numSlices; i++) {
          let sum = 0;
          let count = 0;
          for (let j = -smoothRadius; j <= smoothRadius; j++) {
            if (i + j >= 0 && i + j < numSlices) {
              sum += smoothedAudio[i + j];
              count++;
            }
          }
          finalAudio[i] = sum / count;
        }

        // Draw 3 layers of aurora for immense depth
        for (let layer = 0; layer < 3; layer++) {
          const layerScale = 1 - layer * 0.2;

          // Background layers naturally shift toward the secondary theme color
          const blendL = layer * 0.4;
          const rL = Math.round(r1 * (1 - blendL) + r2 * blendL);
          const gL = Math.round(g1 * (1 - blendL) + g2 * blendL);
          const bL = Math.round(b1 * (1 - blendL) + b2 * blendL);

          for (let i = 0; i < numSlices; i++) {
            const x = i * sliceWidth;
            const normX = i / numSlices;
            const normDist = Math.abs(normX - 0.5) * 2;
            const envelope = Math.max(0, 1 - Math.pow(normDist, 2.0));

            const baseY = getBaseY(normX, layer);

            // Broad, majestic folds instead of narrow jittery ones
            const fold = Math.sin(time * 2 + normX * 8 + layer * 5);
            const foldIntensity = Math.max(0, fold); // 0 to 1

            // Shimmering effect for the pillar
            const shimmer = Math.sin(time * 3 + normX * 4 + layer) * 0.5 + 0.5;

            // Smooth audio
            const freqVal = finalAudio[i];

            // Pillar height: emphasize smooth folds over jagged frequencies for a true aurora look
            let rayHeight = (height * 0.15) + (freqVal * height * 0.35) + (foldIntensity * height * 0.5);
            rayHeight *= (1.0 + rms * 1.5);
            rayHeight *= envelope * layerScale;

            // Ensure no harsh box cutoff, let it flow naturally
            rayHeight = Math.min(rayHeight, height * 0.9);

            if (rayHeight <= 1) continue;

            const grad = ctx.createLinearGradient(x, baseY, x, baseY - rayHeight);

            // The brightness at the bottom creates the "ribbon" naturally without drawing a harsh stroke line
            let alpha = (0.05 + shimmer * 0.15 + foldIntensity * 0.2 + freqVal * 0.3) * layerScale * envelope;
            alpha *= 1.0; // Reduced to let individual rays breathe and prevent solid white blocks

            grad.addColorStop(0, `rgba(${rL}, ${gL}, ${bL}, ${alpha * 1.5})`); // Stronger base
            grad.addColorStop(0.2, `rgba(${rL}, ${gL}, ${bL}, ${alpha * 0.8})`);
            grad.addColorStop(0.6, `rgba(${rL}, ${gL}, ${bL}, ${alpha * 0.3})`);
            grad.addColorStop(1, `rgba(${rL}, ${gL}, ${bL}, 0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(x, baseY - rayHeight, sliceWidth + 1, rayHeight);

            // Add downward rays (mirrored effect)
            let downRayHeight = rayHeight * 0.7; // Slightly shorter for a reflection feel
            downRayHeight = Math.min(downRayHeight, height - baseY);

            if (downRayHeight > 1) {
              const downGrad = ctx.createLinearGradient(x, baseY, x, baseY + downRayHeight);
              downGrad.addColorStop(0, `rgba(${rL}, ${gL}, ${bL}, ${alpha * 1.2})`); // Slightly softer base
              downGrad.addColorStop(0.2, `rgba(${rL}, ${gL}, ${bL}, ${alpha * 0.6})`);
              downGrad.addColorStop(0.6, `rgba(${rL}, ${gL}, ${bL}, ${alpha * 0.2})`);
              downGrad.addColorStop(1, `rgba(${rL}, ${gL}, ${bL}, 0)`);

              ctx.fillStyle = downGrad;
              ctx.fillRect(x, baseY, sliceWidth + 1, downRayHeight);
            }
          }
        }

        // Reset global alpha and states for safety
        ctx.globalAlpha = 1.0;

        if (playing) {
          animationRef.current = requestAnimationFrame(animateAurora);
        }
      };

      animateAurora();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser, visualizerMode, theme]);

  if (visualizerMode === 'off' || visualizerMode === 'fade' || visualizerMode === 'scale') return null;

  if (visualizerMode === 'wave' || visualizerMode === 'multiwave' || visualizerMode === 'aurora') {
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
        overlayRef.current.style.boxShadow = `inset ${spread / 2}px 0 ${blur}px -10px ${color}, inset -${spread / 2}px 0 ${blur}px -10px ${color}`;

        const opacity = 0.2 + (intensityRef.current * 0.6); // 0.2 to 0.8
        overlayRef.current.style.opacity = opacity.toString();
      }

      if (playing) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Run once to initialize
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

// Hook for retrieving a scale value based on bass frequencies and applying it directly to a DOM element
export function useBeatScale(playing: boolean, analyser?: AnalyserNode | null, targetRef?: React.RefObject<HTMLElement | null>, isActive = true) {
  const animationRef = useRef<number | null>(null);
  const currentScaleRef = useRef(1);

  useEffect(() => {
    if (!isActive || !targetRef) {
      // Reset scale if disabled
      if (targetRef?.current) {
        targetRef.current.style.transform = 'none';
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

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

      if (targetRef.current) {
        targetRef.current.style.transform = `scale(${currentScaleRef.current})`;
      }

      if (playing) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Run once to initialize
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser, targetRef, isActive]);
}

export function AmbientBackground({ playing, analyser }: VisualizerProps) {
  const { theme } = useSettings();
  const accentColorRef = useRef('#00E5FF');

  useEffect(() => {
    const selected = THEME_COLORS[theme] || THEME_COLORS.aqua;
    accentColorRef.current = selected.primary;
  }, [theme]);

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
        for (let i = 0; i < 20; i++) sum += dataArray[i];
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
      const radius = maxRadius * (0.4 + (intensity * 0.4));

      const accentColor = accentColorRef.current;

      // Gradient
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

      ctx.globalAlpha = 0.1 + (intensity * 0.3); // Base 0.1, max 0.4

      ctx.fillStyle = gradient;
      gradient.addColorStop(0, accentColor);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (playing) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Run once to initialize
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 transition-colors duration-500"
    />
  );
}

export function ConcentricWavesVisualizer({ playing, analyser }: VisualizerProps) {
  const { theme } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    // Array of objects holding phase and color for each ring
    const numRings = 10;
    const rings: { freqModifier: number; speedOffset: number; nodes: number }[] = [];
    for (let i = 0; i < numRings; i++) {
      rings.push({
        freqModifier: 1 + (i * 0.15),
        speedOffset: 0.5 + (i * 0.1),
        nodes: 4 + Math.floor(i / 2) * 2 // Evens only for symmetrical waves
      });
    }

    const currentAccent = (THEME_COLORS[theme] || THEME_COLORS.aqua).primary;

    const animate = () => {
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height); // completely clear previous frame

      if (!playing || !analyser) {
        // Draw static faint rings when not playing
        for (let r = 0; r < numRings; r++) {
          const radius = 60 + (r * 20);
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = currentAccent;
          ctx.globalAlpha = 0.1;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      ctx.globalCompositeOperation = 'screen';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const time = performance.now() / 1000;

      for (let r = 0; r < numRings; r++) {
        const ringInfo = rings[r];
        // Smaller base radius for a tighter look
        const baseRadius = 60 + (r * 25);

        ctx.beginPath();

        ctx.strokeStyle = currentAccent;
        ctx.globalAlpha = Math.max(0.05, 0.7 - (r * 0.05));
        ctx.lineWidth = 1 + (r * 0.05); // Thinner outer lines compared to original
        ctx.shadowBlur = 5;
        ctx.shadowColor = currentAccent;

        const numPoints = 180; // fidelity of the circle
        const angleStep = (Math.PI * 2) / numPoints;

        // Speed offsets
        const waveTime = time * ringInfo.speedOffset * 3;

        for (let i = 0; i <= numPoints; i++) {
          const angle = i * angleStep;

          // Sample frequency data symmetrically
          const freqIndex = Math.floor(Math.abs(Math.sin(angle)) * (bufferLength * 0.3));
          const freqValue = dataArray[freqIndex] || 0;

          const audioResponse = (freqValue / 255);

          // Combine sine waves to make "wavy" circle edges explicitly linked to audio
          const waviness = audioResponse * 30 * ringInfo.freqModifier * Math.sin(angle * ringInfo.nodes + waveTime);

          const currentRadius = baseRadius + waviness + (audioResponse * 10);

          const x = cx + Math.cos(angle) * currentRadius;
          const y = cy + Math.sin(angle) * currentRadius;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      if (playing) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Run once to initialize
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-80"
      style={{ zIndex: 0 }}
    />
  );
}