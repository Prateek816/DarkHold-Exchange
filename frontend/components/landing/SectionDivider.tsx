'use client';

import React from 'react';

interface SectionDividerProps {
  label?: string;
  glowColor?: string;
}

export function SectionDivider({ label, glowColor = '#7B2FF7' }: SectionDividerProps) {
  return (
    <div className="relative w-full max-w-7xl mx-auto py-12 px-6 flex items-center justify-center select-none overflow-hidden">
      {/* Left Laser Line with gradient fade */}
      <div className="flex-1 h-[1px] relative">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 40%, rgba(185,167,255,0.3) 100%)',
          }}
        />
        {/* Animated Traveling Pulse */}
        <div
          className="absolute top-[-1px] right-0 w-24 h-[3px] rounded-full blur-[1px] opacity-70 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, transparent, #22D3EE, #B9A7FF)',
          }}
        />
      </div>

      {/* Center Sigil Node */}
      <div className="px-5 flex items-center gap-2 relative">
        {/* Glow halo behind node */}
        <div
          className="absolute inset-0 rounded-full blur-md opacity-50"
          style={{ background: glowColor }}
        />

        {/* Diamond Sigil */}
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div
            className="w-3 h-3 rotate-45 border border-[var(--border-strong)] bg-[#0A0A18] shadow-sm flex items-center justify-center"
            style={{ borderColor: 'rgba(185,167,255,0.5)' }}
          >
            <div className="w-1 h-1 rounded-full bg-[var(--mint)]" />
          </div>
        </div>

        {label && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-semibold">
            {label}
          </span>
        )}
      </div>

      {/* Right Laser Line with gradient fade */}
      <div className="flex-1 h-[1px] relative">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(90deg, rgba(185,167,255,0.3) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)',
          }}
        />
        {/* Animated Traveling Pulse */}
        <div
          className="absolute top-[-1px] left-0 w-24 h-[3px] rounded-full blur-[1px] opacity-70 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, #B9A7FF, #19E3B1, transparent)',
          }}
        />
      </div>
    </div>
  );
}
