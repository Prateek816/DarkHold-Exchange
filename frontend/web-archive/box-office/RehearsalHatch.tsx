'use client';

import React from 'react';
import { Bot, Scissors } from 'lucide-react';

export function RehearsalBadge({ text = 'SIM BOT' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet/20 border border-violet/40 text-violet text-[10px] font-mono font-bold tracking-wider uppercase select-none shadow-[0_0_10px_rgba(168,85,247,0.3)]">
      <Bot className="w-3 h-3" />
      <span>{text}</span>
    </span>
  );
}

export function RehearsalDivider() {
  return (
    <div className="relative w-full my-2 flex items-center justify-center text-cyan font-mono text-[10px] uppercase tracking-wider select-none">
      <div className="absolute inset-x-0 h-[1px] bg-cyan/30 border-t border-dashed border-cyan" />
      <div className="relative z-10 bg-[#080d1a] px-3 py-1 border border-cyan/40 rounded-full flex items-center gap-1.5 shadow-cyan-glow">
        <Scissors className="w-3 h-3 transform -rotate-90 text-cyan" />
        <span>LIVE SEQUENCER EXECUTION ➔ (LEFT: PRE-SEEDED HISTORICAL DATA)</span>
      </div>
    </div>
  );
}

export function RehearsalOverlay({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none opacity-40 z-10 ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(0,240,255,0.1), rgba(0,240,255,0.1) 10px, transparent 10px, transparent 20px)',
      }}
      title="Simulated Rehearsal Historical Data"
    />
  );
}
