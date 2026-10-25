'use client';

import React, { useEffect, useRef } from 'react';

export function Cosmic3DBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // 3D Lattice Points Configuration
    const COLS = 26;
    const ROWS = 18;
    const SPACING = 85;
    let time = 0;

    // Ambient floating orbs (dust / light photons)
    const orbs: Array<{
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
    }> = [];

    for (let i = 0; i < 60; i++) {
      orbs.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 + 200,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1,
        color: i % 3 === 0 ? '#00F0FF' : i % 3 === 1 ? '#6366F1' : '#00E599',
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const render = () => {
      time += 0.015;

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const tiltX = (mouseY / height - 0.5) * 0.35;
      const tiltY = (mouseX / width - 0.5) * 0.45;

      // Deep space clear with radial lighting gradient
      ctx.fillStyle = '#030509';
      ctx.fillRect(0, 0, width, height);

      // Ambient radial light bloom centered around top/middle
      const bloomGrad = ctx.createRadialGradient(
        width * 0.5 + (mouseX - width * 0.5) * 0.15,
        height * 0.25 + (mouseY - height * 0.5) * 0.1,
        100,
        width * 0.5,
        height * 0.35,
        width * 0.75
      );
      bloomGrad.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
      bloomGrad.addColorStop(0.35, 'rgba(0, 240, 255, 0.08)');
      bloomGrad.addColorStop(0.7, 'rgba(0, 229, 153, 0.03)');
      bloomGrad.addColorStop(1, 'rgba(3, 5, 9, 0)');

      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, width, height);

      // Render 3D Perspective Wave Mesh
      const fov = 500;
      const originX = width / 2;
      const originY = height * 0.42;

      const gridPoints: Array<Array<{ sx: number; sy: number; z: number; wave: number }>> = [];

      for (let r = 0; r < ROWS; r++) {
        const rowArr = [];
        for (let c = 0; c < COLS; c++) {
          const rawX = (c - COLS / 2) * SPACING;
          const rawZ = (r - ROWS / 4) * SPACING + 300;

          // Wave equation: combination of sine waves and distance ripple
          const dist = Math.hypot(rawX, rawZ - 600);
          const wave =
            Math.sin(c * 0.3 + time * 1.5) * 35 +
            Math.cos(r * 0.35 + time * 1.2) * 30 +
            Math.sin(dist * 0.008 - time * 2) * 20;

          const rawY = 220 + wave;

          // 3D rotation based on mouse tilt
          const cosY = Math.cos(tiltY);
          const sinY = Math.sin(tiltY);
          const rx = rawX * cosY - rawZ * sinY;
          const rz1 = rawX * sinY + rawZ * cosY;

          const cosX = Math.cos(tiltX);
          const sinX = Math.sin(tiltX);
          const ry = rawY * cosX - rz1 * sinX;
          const rz = rawY * sinX + rz1 * cosX;

          if (rz > 50) {
            const scale = fov / rz;
            const sx = originX + rx * scale;
            const sy = originY + ry * scale;
            rowArr.push({ sx, sy, z: rz, wave });
          } else {
            rowArr.push(null);
          }
        }
        gridPoints.push(rowArr as any);
      }

      // Draw Grid Lines with Depth Falloff
      ctx.lineWidth = 1;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const p = gridPoints[r][c];
          if (!p) continue;

          const alpha = Math.max(0, Math.min(0.28, 1 - (p.z - 200) / 900));

          // Draw horizontal connection
          if (c < COLS - 1) {
            const nextP = gridPoints[r][c + 1];
            if (nextP) {
              ctx.beginPath();
              ctx.moveTo(p.sx, p.sy);
              ctx.lineTo(nextP.sx, nextP.sy);
              ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.7})`;
              ctx.stroke();
            }
          }

          // Draw depth connection
          if (r < ROWS - 1) {
            const downP = gridPoints[r + 1][c];
            if (downP) {
              ctx.beginPath();
              ctx.moveTo(p.sx, p.sy);
              ctx.lineTo(downP.sx, downP.sy);
              ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.6})`;
              ctx.stroke();
            }
          }

          // Draw glowing node points on active crests
          if (p.wave > 15 && alpha > 0.08) {
            const nodeRadius = Math.max(1, (1.8 * fov) / p.z);
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 153, ${alpha * 1.5})`;
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw Ambient Floating 3D Orbs
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Wrap around bounds
        if (orb.x < -width) orb.x = width;
        if (orb.x > width) orb.x = -width;
        if (orb.y < -height) orb.y = height;
        if (orb.y > height) orb.y = -height;

        const scale = fov / orb.z;
        const sx = originX + orb.x * scale;
        const sy = originY + orb.y * scale;

        if (sx > 0 && sx < width && sy > 0 && sy < height) {
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.5, orb.size * scale), 0, Math.PI * 2);
          ctx.fillStyle = orb.color;
          ctx.globalAlpha = orb.alpha;
          ctx.shadowColor = orb.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#030509]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
