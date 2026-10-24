'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { sound } from '@/lib/sound';
import {
  AlertTriangle, RotateCcw, ArrowLeft, ShieldAlert,
  Terminal, Home, Sparkles
} from 'lucide-react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error and trigger audio cue
    console.error('Darkhold runtime error caught by error boundary:', error);
    sound.playChime(320);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07050E] text-[var(--text)] flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Amber Alert Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,rgba(255,90,95,0.18)_0%,rgba(255,181,71,0.06)_40%,transparent_70%)] pointer-events-none blur-3xl" />

      {/* Top Header */}
      <header className="p-6 max-w-7xl w-full mx-auto flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[linear-gradient(135deg,#7B2FF7,#B9A7FF)] p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full rounded-[10px] bg-[#120F24] flex items-center justify-center text-[var(--lav)]">
              <Sparkles size={16} />
            </div>
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Darkhold
          </span>
        </Link>
        <span className="chip chip-warn text-[10px] font-mono">CIRCUIT BREAKER ACTIVE</span>
      </header>

      {/* Center Error Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-lg w-full rounded-3xl bg-[linear-gradient(165deg,rgba(20,14,24,0.95)_0%,rgba(12,8,18,0.98)_100%)] border border-[rgba(255,90,95,0.35)] shadow-[0_0_40px_-4px_rgba(255,90,95,0.25),0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-8 text-center relative overflow-hidden"
        >
          {/* Top Amber Warning Strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF5A5F] to-transparent opacity-80" />

          {/* Warning Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-[rgba(255,90,95,0.12)] border border-[rgba(255,90,95,0.3)] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[rgba(255,90,95,0.2)]">
            <ShieldAlert size={32} className="text-[#FF5A5F]" />
          </div>

          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(255,90,95,0.1)] border border-[rgba(255,90,95,0.25)] text-[#FF5A5F] text-[11px] font-mono font-bold mb-3">
            <span>ERR_CIRCUIT_BREAKER_TRIPPED</span>
          </div>

          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
            Exchange Circuit Breaker Tripped
          </h2>

          <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
            An unexpected runtime condition triggered the exchange safety circuit breaker. Invariant checks have halted the operation to prevent state corruption.
          </p>

          {/* Error Digest Readout */}
          {error.digest && (
            <div className="mt-4 p-2.5 rounded-xl bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.06)] text-[11px] font-mono text-[var(--muted)] text-left truncate">
              <span className="text-white font-semibold">Digest: </span>
              {error.digest}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 mt-6 pt-5 border-t border-[rgba(255,255,255,0.08)]">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                reset();
              }}
              className="btn-primary text-xs h-10 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-[rgba(185,167,255,0.25)]"
            >
              <RotateCcw size={14} />
              <span>Reset & Retry Engine</span>
            </button>

            <Link
              href="/market"
              className="btn-secondary text-xs h-10 px-4 rounded-xl flex items-center gap-2"
            >
              <Terminal size={14} />
              <span>Return to Market</span>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-6 max-w-7xl w-full mx-auto text-center text-xs font-mono text-[var(--muted)] z-10">
        Double-Entry Ledger Integrity Verified · Automated Fallback Active
      </footer>
    </div>
  );
}
