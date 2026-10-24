'use client';

import React from 'react';
import { ShieldAlert, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface TheBarrierProps {
  ceilingPrice: number;
  faceValue: number;
  isTriggered?: boolean;
  className?: string;
}

export function TheBarrier({
  ceilingPrice,
  faceValue,
  isTriggered = false,
  className = '',
}: TheBarrierProps) {
  return (
    <div
      className={`relative w-full py-2.5 px-4 flex items-center justify-between text-xs font-mono select-none transition-all duration-200 overflow-hidden rounded-2xl border ${
        isTriggered
          ? 'bg-market-sell/20 border-market-sell shadow-crimson-glow animate-bounce'
          : 'bg-cyan/10 border-cyan/30 shadow-[0_0_18px_rgba(0,240,255,0.18)]'
      } ${className}`}
    >
      {/* Top glowing laser line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan to-transparent shadow-[0_0_12px_#00F0FF]" />

      <div className="flex items-center gap-2.5 z-10">
        <div className="w-5 h-5 rounded-full bg-cyan/20 border border-cyan/50 flex items-center justify-center text-cyan">
          <ShieldAlert className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 font-bold tracking-wide">
          <span className="text-cyan font-black">▲ NASDAQ/COLLAR BARRIER</span>
          <span className="text-white/30">•</span>
          <span className="text-white">
            HARD RESALE CEILING 1.2× ({formatCurrency(ceilingPrice)})
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3 z-10 text-[11px] text-ink-muted">
        <span>ORIGINAL FACE: <strong className="text-white">{formatCurrency(faceValue)}</strong></span>
        <span className="px-2.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30 font-bold uppercase text-[9px] shadow-[0_0_8px_rgba(255,184,0,0.3)]">
          ORDERS ABOVE VOID
        </span>
      </div>
    </div>
  );
}
