import { useEffect, useRef } from "react";
import { useSettings, THEME_COLORS } from "../contexts/SettingsContext";

export function MatrixBackground() {
  const { theme, matrixBg } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!matrixBg) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.clientWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || window.innerHeight;

    // Immediately clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Strict theme color assignment
    const selectedTheme = THEME_COLORS[theme] || THEME_COLORS.aqua;
    const accentColor = selectedTheme.primary;

    const fontSize = 16;
    // Spaced columns: each column has breathing room
    const colStep = 22; 
    let columns = Math.floor(canvas.width / colStep);
    
    // VARIANT 1: Sparse & Ambient Rain
    // Only ~22% of columns are active on screen at any time; the rest wait with negative delays
    let drops = new Array(columns).fill(0).map(() => {
      return Math.random() < 0.22
        ? Math.floor(Math.random() * (canvas.height / fontSize))
        : Math.floor(Math.random() * -100) - 20;
    });

    // Japanese Katakana + Latin + Digits
    const chars = "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+-=<>".split("");

    let isActive = true;
    let lastTime = 0;
    const frameInterval = 45; // ~22 FPS for smooth retro fall

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
      columns = Math.floor(canvas.width / colStep);
      drops = new Array(columns).fill(0).map((_, i) => 
        drops[i] !== undefined ? drops[i] : (Math.floor(Math.random() * -100) - 20)
      );
    };

    window.addEventListener('resize', handleResize);

    const animateMatrix = (timestamp: number) => {
      if (!isActive) return;

      animationRef.current = requestAnimationFrame(animateMatrix);

      if (timestamp - lastTime < frameInterval) return;
      lastTime = timestamp;

      const width = canvas.width;
      const height = canvas.height;

      // VARIANT 1 FADE: 0.14 fade rate ensures trails are compact comets (~12-16 chars)
      // and eliminates permanent vertical column smudges completely
      ctx.globalCompositeOperation = 'destination-out';
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      
      for (let i = 0; i < drops.length; i++) {
        const yPos = drops[i] * fontSize;

        // Draw only when active on screen
        if (yPos > 0 && yPos < height + fontSize * 2) {
          const text = chars[Math.floor(Math.random() * chars.length)];
          const xPos = i * colStep + (colStep / 2);

          // Head of the stream is brightest accent; trail is softer
          const isHead = Math.random() > 0.92;
          if (isHead) {
            ctx.fillStyle = accentColor;
            ctx.shadowBlur = 10;
            ctx.shadowColor = accentColor;
            ctx.globalAlpha = 0.95;
          } else {
            ctx.fillStyle = accentColor;
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.55;
          }

          ctx.fillText(text, xPos, yPos);
        }

        // When drop goes off-screen, give it a substantial random rest delay
        // This keeps the screen sparse (only ~20% active at any time)
        if (yPos > height) {
          drops[i] = Math.floor(Math.random() * -70) - 15;
        }

        // Advance 1 cell downwards
        drops[i] += 1;
      }
    };

    animationRef.current = requestAnimationFrame(animateMatrix);

    return () => {
      isActive = false;
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [matrixBg, theme]);

  if (!matrixBg) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full z-[-5] pointer-events-none opacity-70" 
    />
  );
}
