import { useEffect, useRef } from "react";
import { useSettings, THEME_COLORS } from "../contexts/SettingsContext";

export function MatrixBackground() {
  const { theme, matrixBg } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!matrixBg) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const selectedTheme = THEME_COLORS[theme] || THEME_COLORS.aqua;
    const accentColor = selectedTheme.primary;

    const fontSize = 14;
    let columns = Math.floor(window.innerWidth / fontSize);
    let drops = new Array(columns).fill(1).map(() => Math.random() * -100); // Start at random negative heights for natural fall
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=<>?[]{}|;:,.".split("");

    const animateMatrix = () => {
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        columns = Math.floor(canvas.width / fontSize);
        // Preserve old drops if resizing, fill new ones
        const newDrops = new Array(columns).fill(1).map((_, i) => drops[i] !== undefined ? drops[i] : Math.random() * -50);
        drops = newDrops;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Fading effect for trails on a transparent canvas
      ctx.globalCompositeOperation = 'destination-out';
      ctx.shadowBlur = 0; // Reset shadow so it doesn't bleed into the fade
      ctx.fillStyle = `rgba(0, 0, 0, 0.05)`; 
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      
      for (let i = 0; i < drops.length; i++) {
        // Only draw if on screen
        if (drops[i] * fontSize > 0) {
          const text = chars[Math.floor(Math.random() * chars.length)];
          
          // Rare white glow for heads of the streams
          if (Math.random() > 0.98) {
             ctx.fillStyle = '#FFFFFF';
             ctx.shadowBlur = 15;
             ctx.shadowColor = '#FFFFFF';
          } else {
             // Subtle accent color
             ctx.fillStyle = accentColor;
             ctx.shadowBlur = 5;
             ctx.shadowColor = accentColor;
          }

          const x = i * fontSize + (fontSize / 2);
          const y = drops[i] * fontSize;

          // Make the background matrix semi-transparent overall
          ctx.globalAlpha = 0.4;
          ctx.fillText(text, x, y);
          ctx.globalAlpha = 1.0;
        }

        // Reset if off screen
        if (drops[i] * fontSize > height && Math.random() > 0.98) {
          drops[i] = 0;
        }

        // Discrete falling (exactly 1 row) prevents text smudging/overlapping
        drops[i] += 1;
      }

      // Throttle to ~25fps for the classic discrete matrix look
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animateMatrix);
      }, 40);
    };

    animateMatrix();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [matrixBg, theme]);

  if (!matrixBg) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full z-[-5] pointer-events-none opacity-80" 
    />
  );
}
