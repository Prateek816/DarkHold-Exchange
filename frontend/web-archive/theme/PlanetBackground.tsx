'use client';

import React, { useEffect, useRef } from 'react';

export function PlanetBackground() {
  const starsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // 1. Procedural Starfield
    const starsCanvas = starsCanvasRef.current;
    if (starsCanvas) {
      const ctx = starsCanvas.getContext('2d');
      if (ctx) {
        const resizeStars = () => {
          starsCanvas.width = window.innerWidth;
          starsCanvas.height = Math.max(window.innerHeight, 1200);

          ctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
          const count = 180;
          for (let i = 0; i < count; i++) {
            const x = Math.random() * starsCanvas.width;
            const y = Math.random() * starsCanvas.height;
            const r = Math.random() * 1.2 + 0.3;
            const alpha = Math.random() * 0.7 + 0.2;
            const isViolet = Math.random() > 0.75;

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = isViolet
              ? `rgba(195, 98, 255, ${alpha * 0.85})`
              : `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
          }
        };

        resizeStars();
        window.addEventListener('resize', resizeStars);
      }
    }

    // 2. Planet Rim Fallback Canvas Drawing
    const fallbackCanvas = fallbackCanvasRef.current;
    if (fallbackCanvas) {
      const fCtx = fallbackCanvas.getContext('2d');
      if (fCtx) {
        const drawRim = () => {
          const w = (fallbackCanvas.width = window.innerWidth);
          const h = (fallbackCanvas.height = Math.min(window.innerHeight * 0.75, 717));
          fCtx.clearRect(0, 0, w, h);

          const centerX = w / 2;
          const centerY = -h * 0.45;
          const radius = w * 0.65;

          // Ambient Outer Glow
          const outerGrad = fCtx.createRadialGradient(
            centerX,
            centerY,
            radius - 80,
            centerX,
            centerY,
            radius + 220
          );
          outerGrad.addColorStop(0, 'rgba(147, 18, 255, 0.45)');
          outerGrad.addColorStop(0.35, 'rgba(122, 28, 248, 0.22)');
          outerGrad.addColorStop(0.75, 'rgba(84, 0, 255, 0.08)');
          outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          fCtx.fillStyle = outerGrad;
          fCtx.beginPath();
          fCtx.arc(centerX, centerY, radius + 220, 0, Math.PI * 2);
          fCtx.fill();

          // Intense Core Rim
          const coreGrad = fCtx.createRadialGradient(
            centerX,
            centerY,
            radius - 20,
            centerX,
            centerY,
            radius + 40
          );
          coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          coreGrad.addColorStop(0.25, 'rgba(225, 90, 255, 0.85)');
          coreGrad.addColorStop(0.6, 'rgba(147, 18, 255, 0.6)');
          coreGrad.addColorStop(1, 'rgba(147, 18, 255, 0)');

          fCtx.strokeStyle = coreGrad;
          fCtx.lineWidth = 14;
          fCtx.beginPath();
          fCtx.arc(centerX, centerY, radius, 0.2 * Math.PI, 0.8 * Math.PI);
          fCtx.stroke();
        };

        drawRim();
        window.addEventListener('resize', drawRim);
      }
    }

    // 3. Video handling & loop
    const video = videoRef.current;
    if (video) {
      video.addEventListener('canplay', () => {
        video.style.opacity = '1';
        if (fallbackCanvasRef.current) {
          fallbackCanvasRef.current.style.opacity = '0.15';
        }
      });
      video.play().catch(() => {
        console.log('Video autoplay blocked; canvas fallback active');
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      {/* Procedural Stars */}
      <canvas ref={starsCanvasRef} className="absolute inset-0 w-full h-full" />

      {/* Planet Rim Arc & Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1672px] h-[717px] mix-blend-screen overflow-hidden">
        <canvas
          ref={fallbackCanvasRef}
          className="absolute inset-0 w-full h-full transition-opacity duration-700"
        />
        <video
          ref={videoRef}
          src="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e859f229-8ebd-43fb-a5a0-58006ba75327.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full object-cover opacity-0 transition-opacity duration-800 hidden md:block"
        />
      </div>
    </div>
  );
}
