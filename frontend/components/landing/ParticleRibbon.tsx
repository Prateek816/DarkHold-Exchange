'use client';

import React, { useRef, useEffect } from 'react';

interface ParticleRibbonProps {
  onAnchorUpdate?: (anchors: Record<string, { x: number; y: number }>) => void;
}

export function ParticleRibbon({ onAnchorUpdate }: ParticleRibbonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Grid: 34 ribbon rows × 70 columns for a lush, dense, billowing ribbon
    const ROWS = 34;
    const COLS = 70;

    const render = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      time += 0.014;

      const anchors: Record<string, { x: number; y: number }> = {};

      const isMobile = w < 900;
      // Confine ribbon strictly to the right half on desktop
      const startX = isMobile ? w * 0.15 : Math.max(w * 0.46, 560);
      const spanX = isMobile ? w * 0.8 : w - startX + 50;
      const ribbonThickness = Math.min(180, h * 0.3);

      // Draw flowing 3D ribbon of glowing particles matching Futureswap
      for (let r = 0; r < ROWS; r++) {
        const rowPct = r / (ROWS - 1); // 0 (top of ribbon) to 1 (bottom of ribbon)
        const rowOffset = (rowPct - 0.5) * ribbonThickness;

        for (let c = 0; c < COLS; c++) {
          const colPct = c / (COLS - 1); // 0 (start) to 1 (end)

          // 1. Base X along span
          let x = startX + colPct * spanX;

          // 2. Double-S harmonic billowing curve:
          // Arch starts below navbar (~h * 0.26), curves up smoothly, dips into center, then swoops out
          const mainCurve = Math.sin(colPct * Math.PI * 0.95) * (h * 0.28);
          const undulatingWave = Math.sin(colPct * 4.6 - time * 1.2 + rowPct * 1.8) * 36;
          const secondaryHarmonic = Math.cos(colPct * 7.2 + time * 0.7) * 16;
          
          let y = (h * 0.28) + colPct * (h * 0.42) - mainCurve + undulatingWave + secondaryHarmonic + rowOffset;

          // 3. Interactive cursor gravitational wave
          if (mouseRef.current.active) {
            const dx = x - mouseRef.current.x;
            const dy = y - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = 220;
            if (dist < radius && dist > 0) {
              const pull = (1 - dist / radius) * 32;
              x += (dx / dist) * pull;
              y += (dy / dist) * pull;
            }
          }

          // 4. Color grading aligned with Darkhold Workplace Palette
          // Top layer = Lavender (#B9A7FF)
          // Mid-upper = Deep Royal Violet (#7B2FF7)
          // Center = Electric Mint (#19E3B1)
          // Lower layer = Amber Ceiling (#FFB547) & SIM Cyan (#5EDCF5)
          const depth = 0.5 + Math.sin(colPct * 3.8 + time) * 0.5;
          const radius = 1.0 + depth * 1.8 + (1 - rowPct) * 0.7;

          let color: string;
          if (rowPct < 0.25) {
            color = `rgba(185, 167, 255, ${0.5 + depth * 0.5})`; // Lavender
          } else if (rowPct < 0.50) {
            color = `rgba(123, 47, 247, ${0.55 + depth * 0.45})`; // Royal Violet
          } else if (rowPct < 0.75) {
            color = `rgba(25, 227, 177, ${0.55 + depth * 0.45})`; // Electric Mint
          } else {
            color = `rgba(94, 220, 245, ${0.6 + depth * 0.4})`; // SIM Cyan
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          // 5. Precise anchor calculations:
          // Tag 1 (Darkhold Fest): upper crest at colPct ~0.26, row 5
          if (r === 5 && c === Math.floor(COLS * 0.26)) {
            anchors['tag-1'] = { x, y: y + 36 };
          }
          // Tag 2 (Moonrise GA): outer curve at colPct ~0.76, row 12
          if (r === 12 && c === Math.floor(COLS * 0.76)) {
            anchors['tag-2'] = { x, y: y + 24 };
          }
          // Tag 3 (Sigil Pin): inner loop at colPct ~0.50, row 24
          if (r === 24 && c === Math.floor(COLS * 0.50)) {
            anchors['tag-3'] = { x, y: y + 24 };
          }
        }
      }

      if (onAnchorUpdate && anchors['tag-1'] && anchors['tag-2'] && anchors['tag-3']) {
        onAnchorUpdate(anchors);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [onAnchorUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
