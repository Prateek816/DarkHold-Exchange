'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '@/lib/formatters';

interface ThePriceBoardProps {
  priceCents: number;
  label?: string;
  floorPrice?: number;
  startPrice?: number;
}

export function ThePriceBoard({
  priceCents,
  label = 'CURRENT CLEARING TICK',
  floorPrice,
  startPrice,
}: ThePriceBoardProps) {
  const formatted = formatCurrency(priceCents);
  const chars = formatted.split('');

  return (
    <div className="w-full bg-[#080d1a]/85 border border-cyan/40 p-6 rounded-3xl shadow-cyan-glow cyber-top-rim backdrop-blur-2xl">
      <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-4 uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan shadow-[0_0_8px_#00F0FF] animate-pulse" />
          <span className="font-bold text-white">{label}</span>
        </span>
        {startPrice && floorPrice && (
          <span className="text-[11px] text-ink-muted">
            FLOOR: {formatCurrency(floorPrice)} ➔ CEIL: {formatCurrency(startPrice)}
          </span>
        )}
      </div>

      {/* Flap digit cards container */}
      <div className="flex items-center justify-center gap-2.5 py-5 bg-[#030611]/80 border border-white/[0.08] rounded-2xl shadow-inner">
        {chars.map((char, idx) => (
          <div
            key={`${idx}-${char}`}
            className="relative w-10 h-16 sm:w-16 sm:h-22 bg-gradient-to-b from-[#10182e] to-[#080c18] border border-cyan/30 rounded-2xl flex items-center justify-center font-display text-4xl sm:text-6xl text-white font-black tabular-nums shadow-xl overflow-hidden select-none"
          >
            {/* Center split line */}
            <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-black/80 z-10" />

            {/* Digit with motion */}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={char}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={char === '$' ? 'text-cyan' : 'text-white'}
              >
                {char}
              </motion.span>
            </AnimatePresence>

            {/* Top light reflection */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-white/[0.05] pointer-events-none" />
          </div>
        ))}
      </div>

      <div className="mt-3.5 flex items-center justify-between text-[11px] font-mono text-ink-muted">
        <span>QUANTUM DECAY ENGINE</span>
        <span className="text-cyan font-bold">DECAY RATE: -10¢ / 3s</span>
      </div>
    </div>
  );
}
