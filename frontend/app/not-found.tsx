'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Compass, ArrowLeft, ArrowUpRight, Sparkles, Terminal,
  Gavel, Layers, Home, AlertOctagon, RotateCcw
} from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#07050E] text-[var(--text)] flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Cybernetic Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(123,47,247,0.22)_0%,rgba(185,167,255,0.06)_40%,transparent_70%)] pointer-events-none blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(25,227,177,0.1)_0%,transparent_70%)] pointer-events-none blur-2xl" />

      {/* Top Header Strip */}
      <header className="p-6 max-w-7xl w-full mx-auto flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-[linear-gradient(135deg,#7B2FF7,#B9A7FF)] p-0.5 shadow-md shadow-[rgba(185,167,255,0.25)] flex items-center justify-center">
            <div className="w-full h-full rounded-[10px] bg-[#120F24] flex items-center justify-center text-[var(--lav)]">
              <Sparkles size={16} />
            </div>
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight group-hover:text-[var(--lav)] transition-colors">
            Darkhold
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="chip chip-new text-[10px] font-mono">ERROR 404</span>
          <span className="hidden sm:inline text-xs font-mono text-[var(--muted)]">Ledger Integrity: Intact</span>
        </div>
      </header>

      {/* Center 404 Void Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl w-full rounded-3xl bg-[linear-gradient(165deg,rgba(18,15,28,0.92)_0%,rgba(10,8,18,0.96)_100%)] border border-[rgba(185,167,255,0.25)] shadow-[0_0_40px_-6px_rgba(123,47,247,0.3),0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-8 sm:p-10 text-center relative overflow-hidden"
        >
          {/* Top Scanner Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--lav)] to-transparent opacity-75" />

          {/* Glowing Holographic Badge */}
          <div className="w-20 h-20 rounded-2xl bg-[rgba(185,167,255,0.06)] border border-[rgba(185,167,255,0.25)] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[rgba(123,47,247,0.25)] relative">
            <Compass size={36} className="text-[var(--lav)] animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--sell)] border-2 border-[#120F24]" />
          </div>

          {/* Diagnostic Code */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(255,90,95,0.1)] border border-[rgba(255,90,95,0.25)] text-[#FF5A5F] text-xs font-mono font-bold mb-4">
            <AlertOctagon size={12} />
            <span>ERR_ROUTE_NOT_FOUND // MATRIX_VOID</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
            Coordinate Dissolved Into Void
          </h1>

          <p className="text-sm text-[var(--muted)] max-w-md mx-auto mt-3 leading-relaxed">
            The target sequence you requested exists outside the Darkhold simulated ledger boundaries or has been settled to archive history.
          </p>

          {/* Suggested Navigation Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 text-left">
            <Link
              href="/market"
              className="p-3.5 rounded-2xl bg-[rgba(185,167,255,0.06)] hover:bg-[rgba(185,167,255,0.14)] border border-[rgba(185,167,255,0.2)] hover:border-[rgba(185,167,255,0.4)] flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[rgba(185,167,255,0.12)] flex items-center justify-center text-[var(--lav)]">
                  <Terminal size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-[var(--lav)] transition-colors">
                    Exchange Floor
                  </h4>
                  <span className="text-[10px] font-mono text-[var(--muted)]">Return to Market Dashboard</span>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-[var(--muted)] group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/auctions"
              className="p-3.5 rounded-2xl bg-[rgba(185,167,255,0.06)] hover:bg-[rgba(185,167,255,0.14)] border border-[rgba(185,167,255,0.2)] hover:border-[rgba(185,167,255,0.4)] flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[rgba(25,227,177,0.12)] flex items-center justify-center text-[var(--mint)]">
                  <Gavel size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-[var(--mint)] transition-colors">
                    Dutch Auctions
                  </h4>
                  <span className="text-[10px] font-mono text-[var(--muted)]">Browse Live Clock Drops</span>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-[var(--muted)] group-hover:text-white transition-colors" />
            </Link>
          </div>

          {/* Primary Home Action */}
          <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-mono text-[var(--muted)] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Home size={13} />
              <span>Back to Landing Portal</span>
            </Link>

            <Link
              href="/market"
              className="btn-primary text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-[rgba(185,167,255,0.25)]"
            >
              <span>Re-enter Exchange</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-6 max-w-7xl w-full mx-auto text-center text-xs font-mono text-[var(--muted)] z-10">
        Darkhold Simulated Exchange · Error Code: ERR_404_MATRIX_VOID
      </footer>
    </div>
  );
}
