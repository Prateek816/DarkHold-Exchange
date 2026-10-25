'use client';

import React from 'react';
import { usePortalTransition } from './PortalTransitionProvider';

export function PortalLoadingScreen() {
  const { isTransitioning, direction, step, progress, message } = usePortalTransition();

  if (!isTransitioning) return null;

  const isEntering = direction === 'ENTERING WORKPLACE' || direction === 'SIGNING IN';

  // 18 Orbiting particle configuration across 3 harmonic rings
  const particles = [
    // Ring 1 (Inner, 6 particles, Mint)
    ...Array.from({ length: 6 }).map((_, i) => ({
      id: `r1-${i}`,
      ring: 1,
      angle: i * 60,
      radius: 64,
      size: 4,
      color: '#19E3B1',
      duration: '4s',
      delay: `${-(i * 0.66).toFixed(2)}s`,
      reverse: false,
    })),
    // Ring 2 (Middle, 6 particles, Lavender)
    ...Array.from({ length: 6 }).map((_, i) => ({
      id: `r2-${i}`,
      ring: 2,
      angle: i * 60 + 30,
      radius: 92,
      size: 5,
      color: '#B9A7FF',
      duration: '6.5s',
      delay: `${-(i * 1.08).toFixed(2)}s`,
      reverse: true,
    })),
    // Ring 3 (Outer, 6 particles, Cyber Cyan)
    ...Array.from({ length: 6 }).map((_, i) => ({
      id: `r3-${i}`,
      ring: 3,
      angle: i * 60 + 15,
      radius: 120,
      size: 4.5,
      color: '#5EDCF5',
      duration: '9s',
      delay: `${-(i * 1.5).toFixed(2)}s`,
      reverse: false,
    })),
  ];

  return (
    <div
      data-testid="portal-overlay"
      role="status"
      aria-live="polite"
      className="portal-loading-screen fixed inset-0 z-[9999] pointer-events-auto select-none flex flex-col items-center justify-center overflow-hidden bg-[#050508]/96 backdrop-blur-2xl animate-fade-in"
      style={{
        background:
          'radial-gradient(circle at center, rgba(123, 47, 247, 0.22) 0%, rgba(25, 227, 177, 0.10) 35%, rgba(5, 5, 8, 0.98) 75%)',
      }}
    >
      {/* ── Background Subtle Cybernetic Calibration Rings ───────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <svg
          viewBox="0 0 600 600"
          className="w-[600px] h-[600px] sm:w-[760px] sm:h-[760px] animate-spin"
          style={{ animationDuration: '45s' }}
        >
          <circle
            cx="300"
            cy="300"
            r="160"
            fill="none"
            stroke="#B9A7FF"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle
            cx="300"
            cy="300"
            r="230"
            fill="none"
            stroke="#19E3B1"
            strokeWidth="1"
            strokeDasharray="8 12"
            opacity="0.6"
          />
          <circle
            cx="300"
            cy="300"
            r="290"
            fill="none"
            stroke="#5EDCF5"
            strokeWidth="0.75"
            strokeDasharray="2 16"
            opacity="0.4"
          />
        </svg>
      </div>

      {/* ── Top Directional Status Pill ────────────────────────────── */}
      <div className="relative z-10 mb-8 sm:mb-10">
        <div
          data-testid="portal-status-pill"
          className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase border transition-all ${
            isEntering
              ? 'border-[#19E3B1]/40 bg-[#19E3B1]/10 text-[#19E3B1] shadow-[0_0_20px_rgba(25,227,177,0.35)]'
              : 'border-[#B9A7FF]/40 bg-[#B9A7FF]/10 text-[#B9A7FF] shadow-[0_0_20px_rgba(185,167,255,0.35)]'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isEntering ? 'bg-[#19E3B1]' : 'bg-[#B9A7FF]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isEntering ? 'bg-[#19E3B1]' : 'bg-[#B9A7FF]'
              }`}
            />
          </span>
          <span>{direction}</span>
        </div>
      </div>

      {/* ── Geometric Darkhold Sigil Beacon + 18 Orbiting Particles ─── */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
        {/* Orbital Particle System */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
                animation: `${p.reverse ? 'portal-orbit-reverse' : 'portal-orbit'} ${p.duration} linear infinite`,
                animationDelay: p.delay,
                transformOrigin: 'center center',
                offsetPath: `circle(${p.radius}px at 50% 50%)`,
              }}
            />
          ))}
        </div>

        {/* Central Darkhold Sigil Beacon */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
          <svg
            viewBox="0 0 128 128"
            className="w-full h-full drop-shadow-[0_0_25px_rgba(123,47,247,0.55)]"
          >
            <defs>
              <linearGradient id="portalSigilGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#B9A7FF" />
                <stop offset="50%" stopColor="#7B2FF7" />
                <stop offset="100%" stopColor="#19E3B1" />
              </linearGradient>
              <radialGradient id="portalSigilGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#7B2FF7" stopOpacity="0.85" />
                <stop offset="60%" stopColor="#19E3B1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0B0914" stopOpacity="0" />
              </radialGradient>
              <filter id="portalGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Ambient Background Aura */}
            <circle cx="64" cy="64" r="54" fill="url(#portalSigilGlow)" opacity="0.75" />

            {/* Outer Diamond Orbit Ring (Rotating Clockwise) */}
            <g className="animate-spin" style={{ animationDuration: '8s', transformOrigin: '64px 64px' }}>
              <path
                d="M 64,16 L 112,64 L 64,112 L 16,64 Z"
                fill="none"
                stroke="rgba(185, 167, 255, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              />
            </g>

            {/* Concentric 8-Tick Ring (Rotating Counter-Clockwise) */}
            <g
              className="animate-spin"
              style={{
                animationDuration: '12s',
                animationDirection: 'reverse',
                transformOrigin: '64px 64px',
              }}
            >
              <circle
                cx="64"
                cy="64"
                r="44"
                fill="none"
                stroke="rgba(25, 227, 177, 0.35)"
                strokeWidth="1"
                strokeDasharray="2 12"
              />
            </g>

            {/* Main 8-Pointed Cybernetic Sigil */}
            <g filter="url(#portalGlow)">
              {/* Primary 4-pointed Star */}
              <path
                d="M 64,18 C 64,44 46,64 18,64 C 46,64 64,84 64,110 C 64,84 82,64 110,64 C 82,64 64,44 64,18 Z"
                fill="url(#portalSigilGrad)"
                stroke="#B9A7FF"
                strokeWidth="1.2"
              />

              {/* Secondary 4-pointed Star rotated 45 degrees */}
              <path
                d="M 64,28 C 64,46 50,64 32,64 C 50,64 64,82 64,100 C 64,82 78,64 96,64 C 78,64 64,46 64,28 Z"
                fill="#120F24"
                stroke="#19E3B1"
                strokeWidth="1.5"
                transform="rotate(45 64 64)"
                opacity="0.95"
              />

              {/* Center Core Spark Pulsing */}
              <circle
                cx="64"
                cy="64"
                r="7"
                fill="#FFFFFF"
                className="animate-pulse"
                style={{ animationDuration: '1.2s' }}
              />
              <circle cx="64" cy="64" r="4" fill="#19E3B1" />
            </g>
          </svg>
        </div>
      </div>

      {/* ── Stepped Sequence Messaging ─────────────────────────────── */}
      <div className="relative z-10 mt-6 flex flex-col items-center text-center px-4 max-w-md w-full">
        {/* Step Indicator Tabs */}
        <div className="flex items-center gap-2 mb-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-gradient-to-r from-[#B9A7FF] to-[#19E3B1] shadow-[0_0_10px_rgba(25,227,177,0.7)]'
                  : s < step
                  ? 'w-4 bg-[#19E3B1]/60'
                  : 'w-4 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Monospace Step Message Readout */}
        <div
          data-testid="portal-step-message"
          className="font-mono text-xs sm:text-sm text-white/90 tracking-widest uppercase min-h-[1.5rem] flex items-center justify-center transition-all duration-200"
        >
          <span className="text-[#19E3B1] mr-2 font-bold">›</span>
          <span>{message}</span>
        </div>

        {/* ── Neon Multi-Stop Progress Beam ──────────────────────────── */}
        <div className="mt-5 w-full max-w-xs sm:max-w-sm">
          <div className="h-2 rounded-full bg-white/10 border border-white/10 overflow-hidden relative shadow-inner">
            <div
              data-testid="portal-progress-beam"
              className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-[#7B2FF7] via-[#5EDCF5] to-[#19E3B1] shadow-[0_0_20px_rgba(25,227,177,0.8),0_0_35px_rgba(185,167,255,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-white/50 tracking-wider">
            <span>DARKHOLD L2 SECURE TUNNEL</span>
            <span
              data-testid="portal-progress-percent"
              className="text-[#19E3B1] font-bold"
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Keyframe Animations for Orbital Particles ───────────────── */}
      <style jsx global>{`
        @keyframes portal-orbit {
          from {
            transform: rotate(0deg) translateX(var(--r, 64px)) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(var(--r, 64px)) rotate(-360deg);
          }
        }
        @keyframes portal-orbit-reverse {
          from {
            transform: rotate(360deg) translateX(var(--r, 92px)) rotate(-360deg);
          }
          to {
            transform: rotate(0deg) translateX(var(--r, 92px)) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
