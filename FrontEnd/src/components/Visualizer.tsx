import { useEffect, useRef, useState } from "react";
import { useSettings, THEME_COLORS, hexToRgb } from "../contexts/SettingsContext";

interface VisualizerProps {
  playing: boolean;
  analyser?: AnalyserNode | null;
  position?: 'center' | 'bottom';
}

export function Visualizer({ playing, analyser, position = 'center' }: VisualizerProps) {
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
        if (document.hidden) {
          if (playing) animationRef.current = requestAnimationFrame(animateWave);
          return;
        }

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
          const cy = position === 'bottom' ? height * 0.75 : height / 2;
          ctx.beginPath();
          ctx.moveTo(0, cy);
          ctx.lineTo(width, cy);
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
        const cy = position === 'bottom' ? height * 0.75 : height / 2;

        ctx.moveTo(0, cy);

        for (let x = 0; x < width; x++) {
          // y = A * sin(B * x + C) + D
          // A = amplitude
          // B = frequency
          // C = phase (time)
          // D = vertical shift (height / 2)

          const y = cy + Math.sin(x * frequency + time) * amplitude;
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

      // Holographic Neon Ribbons - 4 distinct layers
      const waveConfigs = [
        { color: '147, 51, 234', freqMod: 0.1, ampMod: 1.8, phaseSpeed: 0.5, name: 'Bass' },
        { color: '236, 72, 153', freqMod: 0.3, ampMod: 1.2, phaseSpeed: 0.8, name: 'LowMid' },
        { color: '59, 130, 246', freqMod: 0.6, ampMod: 0.8, phaseSpeed: 1.2, name: 'HighMid' },
        { color: '34, 197, 94',  freqMod: 0.9, ampMod: 0.5, phaseSpeed: 1.6, name: 'Treble' }
      ];
      const numWaves = waveConfigs.length;

      const animateMultiWave = () => {
        if (document.hidden) {
          if (playing) animationRef.current = requestAnimationFrame(animateMultiWave);
          return;
        }

        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const centerY = position === 'bottom' ? height * 0.75 : height / 2;

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

        // Performance: Draw by taking steps instead of every pixel
        const step = Math.max(1, Math.floor(width / 250)); // ~250 points across screen

        // Use 'screen' for additive blending, but without expensive shadowBlur
        ctx.globalCompositeOperation = 'screen';

        for (let w = 0; w < numWaves; w++) {
          const config = waveConfigs[w];
          const wavePhase = time * config.phaseSpeed;
          
          // Focus on different frequency bands based on layer
          const freqIdx = Math.floor((w / numWaves) * (freqData.length * 0.7)); 
          const freqAmpModifier = 1 + (freqData[freqIdx] / 255) * config.ampMod;

          ctx.beginPath();
          ctx.moveTo(0, centerY);

          // Top Half (forward)
          for (let x = 0; x <= width; x += step) {
            const normX = x / width;
            const envelope = Math.pow(Math.sin(normX * Math.PI), 2);

            const dataIdxFloat = normX * (bufferLength - 1);
            const idx1 = Math.floor(dataIdxFloat);
            const idx2 = Math.min(idx1 + 1, bufferLength - 1);
            const frac = dataIdxFloat - idx1;
            const smoothFrac = frac * frac * (3 - 2 * frac);

            const val1 = (dataArray[idx1] - 128) / 128;
            const val2 = (dataArray[idx2] - 128) / 128;
            const signal = val1 + (val2 - val1) * smoothFrac;

            // Sine wave offset to give flow even when audio is quiet
            const sineOffset = Math.sin(normX * 10 * config.freqMod + wavePhase);
            const yOffset = (sineOffset * 0.3 + signal * config.ampMod) * baseAmplitude * freqAmpModifier * envelope;

            ctx.lineTo(x, centerY - Math.abs(yOffset));
          }

          // Bottom Half (backward reflection)
          for (let x = width; x >= 0; x -= step) {
            const normX = x / width;
            const envelope = Math.pow(Math.sin(normX * Math.PI), 2);

            const dataIdxFloat = normX * (bufferLength - 1);
            const idx1 = Math.floor(dataIdxFloat);
            const idx2 = Math.min(idx1 + 1, bufferLength - 1);
            const frac = dataIdxFloat - idx1;
            const smoothFrac = frac * frac * (3 - 2 * frac);

            const val1 = (dataArray[idx1] - 128) / 128;
            const val2 = (dataArray[idx2] - 128) / 128;
            const signal = val1 + (val2 - val1) * smoothFrac;

            const sineOffset = Math.sin(normX * 10 * config.freqMod + wavePhase);
            const yOffset = (sineOffset * 0.3 + signal * config.ampMod) * baseAmplitude * freqAmpModifier * envelope;

            ctx.lineTo(x, centerY + Math.abs(yOffset));
          }

          ctx.closePath();

          // Fill with subtle transparent color
          ctx.fillStyle = `rgba(${config.color}, 0.15)`;
          ctx.fill();

          // Stroke with solid glowing color
          ctx.strokeStyle = `rgba(${config.color}, 0.8)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Add a central bright pulse line
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        const centerAmp = baseAmplitude * 0.6;
        for (let x = 0; x <= width; x += step) {
          const normX = x / width;
          const envelope = Math.pow(Math.sin(normX * Math.PI), 2);
          
          const dataIdxFloat = normX * (bufferLength - 1);
          const idx1 = Math.floor(dataIdxFloat);
          const idx2 = Math.min(idx1 + 1, bufferLength - 1);
          const frac = dataIdxFloat - idx1;
          const signal = ((dataArray[idx1] - 128) / 128) * (1 - frac) + ((dataArray[idx2] - 128) / 128) * frac;

          ctx.lineTo(x, centerY + signal * centerAmp * envelope);
        }

        ctx.strokeStyle = `rgba(${accentRgbRef.current}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner glowing core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

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
        if (document.hidden) {
          if (playing) animationRef.current = requestAnimationFrame(animateBars);
          return;
        }

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
        if (document.hidden) {
          if (playing) animationRef.current = requestAnimationFrame(animateAurora);
          return;
        }

        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const cy = position === 'bottom' ? height * 0.75 : height / 2;

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
    // STARS / WARP DRIVE MODE
    else if (visualizerMode === 'stars') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const numStars = 400;
      const stars = Array.from({ length: numStars }, () => ({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        z: Math.random() * 2000,
        o: 0.1 + Math.random() * 0.9,
      }));

      const animateStars = () => {
        if (document.hidden) {
          if (playing) animationRef.current = requestAnimationFrame(animateStars);
          return;
        }

        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = position === 'bottom' ? height * 0.75 : height / 2;

        // Dark background with trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);

        let bass = 0;
        let rms = 0;
        if (playing && analyser) {
          analyser.getByteFrequencyData(dataArray);
          let bSum = 0;
          for (let i = 0; i < 15; i++) bSum += dataArray[i];
          bass = bSum / (15 * 255);

          let tSum = 0;
          for (let i = 0; i < Math.min(bufferLength, 128); i++) tSum += dataArray[i];
          rms = tSum / (Math.min(bufferLength, 128) * 255);
        }

        const [r, g, b] = accentRgbRef.current.split(',').map(Number);
        
        // Speed up the warp drive with bass
        const speed = 2 + (bass * 40);

        ctx.save();
        ctx.translate(cx, cy);

        // Center explosion / glow on heavy bass
        if (bass > 0.6) {
            const glowRad = (bass - 0.5) * 400;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRad);
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${bass * 0.3})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'screen';
        
        stars.forEach(star => {
          star.z -= speed;
          if (star.z <= 0) {
            star.z = 2000;
            star.x = Math.random() * 2000 - 1000;
            star.y = Math.random() * 2000 - 1000;
          }

          const k = 128.0 / star.z;
          const px = star.x * k;
          const py = star.y * k;
          
          if (px > -cx && px < cx && py > -cy && py < cy) {
            const size = (1 - star.z / 2000) * (1.5 + rms * 4);
            const intensity = (1 - star.z / 2000);
            
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.o * intensity})`;
            ctx.fill();
            
            // Warp trail (streak)
            if (bass > 0.3) {
              const trailLength = speed * (bass * 3);
              const oldK = 128.0 / (star.z + trailLength);
              const opx = star.x * oldK;
              const opy = star.y * oldK;
              ctx.beginPath();
              ctx.moveTo(opx, opy);
              ctx.lineTo(px, py);
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${star.o * intensity * 0.6})`;
              ctx.lineWidth = size * 0.6;
              ctx.stroke();
            }
          }
        });

        ctx.restore();

        if (playing) {
          animationRef.current = requestAnimationFrame(animateStars);
        }
      };

      animateStars();
    }

    // HEX MODE (Canvas)
    if (visualizerMode === 'hex') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const hexRadius = 35;
      const hexWidth = Math.sqrt(3) * hexRadius;
      const hexHeight = 2 * hexRadius;
      const xOffset = hexWidth;
      const yOffset = hexHeight * 0.75;

      const drawHexagon = (x: number, y: number, radius: number, fillOpacity: number, strokeOpacity: number, glowIntensity: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i - 30);
          const px = x + radius * Math.cos(angle);
          const py = y + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        const [r, g, b] = accentRgbRef.current.split(',').map(Number);
        
        // Add glow only for active hexes to save performance
        if (glowIntensity > 0.1) {
          ctx.shadowBlur = 20 * glowIntensity;
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowIntensity})`;
        } else {
          ctx.shadowBlur = 0;
        }

        if (fillOpacity > 0) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillOpacity})`;
          ctx.fill();
        }
        if (strokeOpacity > 0) {
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${strokeOpacity})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        
        // Reset shadow to avoid leaking
        ctx.shadowBlur = 0;
      };

      const animateHex = () => {
        if (document.hidden) {
          if (playing) animationRef.current = requestAnimationFrame(animateHex);
          return;
        }

        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        if (!playing || !analyser) {
          const cols = Math.ceil(width / xOffset) + 1;
          const rows = Math.ceil(height / yOffset) + 1;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const x = col * xOffset + (row % 2 === 1 ? hexWidth / 2 : 0);
              const y = row * yOffset;
              
              drawHexagon(x, y, hexRadius - 2, 0, 0.1, 0);
            }
          }
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        const cols = Math.ceil(width / xOffset) + 1;
        const rows = Math.ceil(height / yOffset) + 1;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        const time = performance.now() / 1000;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * xOffset + (row % 2 === 1 ? hexWidth / 2 : 0);
            const y = row * yOffset;

            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const normDist = Math.min(1, dist / maxDist);
            
            // Map 0-1 distance to frequency array index (only using lower 60% of frequencies)
            const freqIdx = Math.floor(Math.pow(normDist, 1.2) * (bufferLength * 0.6));
            const val = dataArray[freqIdx] / 255;

            // Ripple effect moving outwards
            const ripple = (Math.sin(dist / 40 - time * 4) * 0.5 + 0.5) * 0.4;
            const intensity = val * 0.7 + ripple * val;

            const radiusScale = 0.7 + intensity * 0.3;
            drawHexagon(
              x, y, 
              (hexRadius - 3) * radiusScale, 
              intensity * 0.7, 
              0.1 + intensity * 0.9,
              intensity // glow intensity
            );
          }
        }

        if (playing) {
          animationRef.current = requestAnimationFrame(animateHex);
        }
      };
      
      animateHex();
    }

    // SONAR RADAR MODE (Canvas)
    if (visualizerMode === 'sonar') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let sweepAngle = 0;
      // Fixed tactical contacts (radar blips) with polar coordinates
      const blips = [
        { angle: 0.52, distRatio: 0.38, label: 'TRK-01', intensity: 0 },
        { angle: 1.15, distRatio: 0.65, label: 'TRK-02', intensity: 0 },
        { angle: 1.88, distRatio: 0.45, label: 'TRK-03', intensity: 0 },
        { angle: 2.62, distRatio: 0.78, label: 'TRK-04', intensity: 0 },
        { angle: 3.35, distRatio: 0.30, label: 'TRK-05', intensity: 0 },
        { angle: 3.92, distRatio: 0.55, label: 'TRK-06', intensity: 0 },
        { angle: 4.61, distRatio: 0.72, label: 'TRK-07', intensity: 0 },
        { angle: 5.24, distRatio: 0.42, label: 'TRK-08', intensity: 0 },
        { angle: 5.85, distRatio: 0.85, label: 'TRK-09', intensity: 0 },
        { angle: 0.12, distRatio: 0.60, label: 'TRK-10', intensity: 0 },
      ];

      const animateSonar = () => {
        if (document.hidden) {
          if (playing) animationRef.current = requestAnimationFrame(animateSonar);
          return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.min(width, height) * 0.44;

        const [r, g, b] = accentRgbRef.current.split(',').map(Number);

        let bass = 0;
        let mid = 0;
        if (playing && analyser) {
          analyser.getByteFrequencyData(dataArray);
          let bassSum = 0;
          for (let i = 0; i < 8; i++) bassSum += dataArray[i];
          bass = bassSum / (8 * 255);

          let midSum = 0;
          for (let i = 8; i < 32; i++) midSum += dataArray[i];
          mid = midSum / (24 * 255);
        } else {
          dataArray.fill(0);
        }

        ctx.clearRect(0, 0, width, height);

        // 1. Concentric Range Rings (4 range rings)
        const ringSteps = [0.25, 0.5, 0.75, 1.0];
        ringSteps.forEach((step, idx) => {
          const radius = maxR * step;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = idx === 3
            ? `rgba(${r}, ${g}, ${b}, ${0.4 + bass * 0.3})`
            : `rgba(${r}, ${g}, ${b}, 0.12)`;
          ctx.lineWidth = idx === 3 ? 1.5 : 1;
          if (idx === 1) {
            ctx.setLineDash([4, 6]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Range markings
          ctx.font = '8px monospace';
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
          ctx.fillText(`${Math.round(step * 100)}NM`, cx + 4, cy - radius + 10);
        });

        // 2. Crosshair Grid Lines
        ctx.beginPath();
        // Horizontal
        ctx.moveTo(cx - maxR, cy);
        ctx.lineTo(cx + maxR, cy);
        // Vertical
        ctx.moveTo(cx, cy - maxR);
        ctx.lineTo(cx, cy + maxR);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Diagonal dashed lines (45 deg)
        ctx.beginPath();
        ctx.setLineDash([2, 8]);
        const diagR = maxR * 0.95;
        const cos45 = Math.cos(Math.PI / 4) * diagR;
        const sin45 = Math.sin(Math.PI / 4) * diagR;
        ctx.moveTo(cx - cos45, cy - sin45);
        ctx.lineTo(cx + cos45, cy + sin45);
        ctx.moveTo(cx - cos45, cy + sin45);
        ctx.lineTo(cx + cos45, cy - sin45);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
        ctx.stroke();
        ctx.setLineDash([]);

        // Degree Tick Marks around outer rim
        for (let deg = 0; deg < 360; deg += 30) {
          const rad = (deg * Math.PI) / 180;
          const innerTick = maxR - (deg % 90 === 0 ? 8 : 4);
          const outerTick = maxR;
          const x1 = cx + Math.cos(rad) * innerTick;
          const y1 = cy + Math.sin(rad) * innerTick;
          const x2 = cx + Math.cos(rad) * outerTick;
          const y2 = cy + Math.sin(rad) * outerTick;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${deg % 90 === 0 ? 0.6 : 0.25})`;
          ctx.lineWidth = deg % 90 === 0 ? 1.5 : 1;
          ctx.stroke();

          if (deg % 90 === 0) {
            const labelDist = maxR + 12;
            const lx = cx + Math.cos(rad) * labelDist;
            const ly = cy + Math.sin(rad) * labelDist;
            const cardinals: Record<number, string> = { 0: '090°', 90: '180°', 180: '270°', 270: '000°' };
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
            ctx.fillText(cardinals[deg] || `${deg}°`, lx, ly);
          }
        }

        // 3. Circular Audio Waveform (Oscilloscope Ring at 62% radius)
        if (playing) {
          ctx.beginPath();
          const wavePoints = Math.min(bufferLength, 128);
          for (let i = 0; i <= wavePoints; i++) {
            const angle = (i / wavePoints) * Math.PI * 2 - Math.PI / 2;
            const sample = (dataArray[i % wavePoints] / 255);
            const waveR = maxR * 0.62 + (sample - 0.4) * 32 * (0.6 + bass * 0.8);
            const wx = cx + Math.cos(angle) * waveR;
            const wy = cy + Math.sin(angle) * waveR;
            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + mid * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // 4. Perimeter Audio Spectrum Ticks (64 radial bars on outer ring)
        const barCount = 64;
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2;
          const dataIdx = Math.floor((i / barCount) * (bufferLength / 2));
          const val = dataArray[dataIdx] / 255;
          const barLen = val * 22 * (0.8 + bass * 0.5);

          if (barLen > 2) {
            const bx1 = cx + Math.cos(angle) * (maxR + 2);
            const by1 = cy + Math.sin(angle) * (maxR + 2);
            const bx2 = cx + Math.cos(angle) * (maxR + 2 + barLen);
            const by2 = cy + Math.sin(angle) * (maxR + 2 + barLen);

            ctx.beginPath();
            ctx.moveTo(bx1, by1);
            ctx.lineTo(bx2, by2);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + val * 0.7})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // 5. Rotating Radar Sweep Beam & Phosphor Fading Wedge
        const sweepSpeed = playing ? 0.024 + bass * 0.015 : 0.016;
        sweepAngle = (sweepAngle + sweepSpeed) % (Math.PI * 2);

        // Phosphor Trailing Wedge (Afterglow)
        const trailSlices = 24;
        const trailSpan = Math.PI / 3.2; // ~56 degrees of phosphor tail
        for (let s = 0; s < trailSlices; s++) {
          const aStart = sweepAngle - (s / trailSlices) * trailSpan;
          const aEnd = sweepAngle - ((s + 1) / trailSlices) * trailSpan;
          const alpha = (1 - s / trailSlices) * 0.22 * (0.7 + bass * 0.5);

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, maxR, aEnd, aStart);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fill();
        }

        // The Laser Sweep Beam Line
        const sx = cx + Math.cos(sweepAngle) * maxR;
        const sy = cy + Math.sin(sweepAngle) * maxR;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.shadowBlur = 12 + bass * 12;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.9)`;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 6. Target Contacts (Radar Blips)
        blips.forEach(blip => {
          // Check if sweep line just passed over blip
          const diff = (sweepAngle - blip.angle + Math.PI * 2) % (Math.PI * 2);
          if (diff < 0.08) {
            blip.intensity = 1.0;
          } else {
            blip.intensity *= 0.965; // smooth phosphor decay
          }

          if (blip.intensity > 0.03) {
            const bx = cx + Math.cos(blip.angle) * (maxR * blip.distRatio);
            const by = cy + Math.sin(blip.angle) * (maxR * blip.distRatio);

            // Blip core dot
            ctx.beginPath();
            ctx.arc(bx, by, 2.5 + blip.intensity * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${blip.intensity})`;
            ctx.fill();

            // Expanding ripple ping ring
            const pingR = 4 + (1 - blip.intensity) * 18;
            ctx.beginPath();
            ctx.arc(bx, by, pingR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${blip.intensity * 0.6})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Tactical callout text
            if (blip.intensity > 0.25) {
              ctx.font = '7px monospace';
              ctx.textAlign = 'left';
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${blip.intensity * 0.8})`;
              ctx.fillText(`${blip.label} [${Math.round(blip.distRatio * 100)}NM]`, bx + 7, by - 4);
            }
          }
        });

        // 7. Center Pulsing Bullseye Core
        const coreRadius = 4 + bass * 8;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.6 + bass * 0.4})`;
        ctx.shadowBlur = 10 * bass;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 8. Tactical Telemetry Overlay in corners
        ctx.font = '8px monospace';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.45)`;
        ctx.textAlign = 'left';
        ctx.fillText('SYS.RADAR // ACTIVE_360°', 14, 20);
        ctx.fillText(`BEARING: ${Math.round((sweepAngle * 180 / Math.PI) % 360).toString().padStart(3, '0')}°`, 14, 32);

        ctx.textAlign = 'right';
        ctx.fillText(`CONTACTS: ${blips.filter(b => b.intensity > 0.2).length} ACQ`, width - 14, 20);
        ctx.fillText(`FREQ: ${(44.1 + bass * 5).toFixed(1)}KHZ`, width - 14, 32);

        if (playing) {
          animationRef.current = requestAnimationFrame(animateSonar);
        }
      };

      animateSonar();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, analyser, visualizerMode, theme]);

  if (visualizerMode === 'off' || visualizerMode === 'fade' || visualizerMode === 'scale') return null;

  if (visualizerMode === 'wave' || visualizerMode === 'multiwave' || visualizerMode === 'aurora' || visualizerMode === 'stars' || visualizerMode === 'hex' || visualizerMode === 'sonar') {
    return (
      <canvas 
        ref={canvasRef} 
        className="w-full h-full" 
        style={['hex', 'sonar'].includes(visualizerMode) ? {
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 96%)',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 96%)'
        } : undefined}
      />
    );
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
      if (document.hidden) {
        if (playing) animationRef.current = requestAnimationFrame(animate);
        return;
      }

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
      if (document.hidden) {
        if (playing) animationRef.current = requestAnimationFrame(animate);
        return;
      }

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