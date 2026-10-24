'use client';

import React, { useState } from 'react';
import { fmt } from '@/lib/formatters';
import { soundFx } from '@/lib/sound';
import { Gavel, Clock, Sparkles, ShieldCheck, CheckCircle2, X } from 'lucide-react';

export function DutchDecaySimulator() {
  const [minutesElapsed, setMinutesElapsed] = useState(24);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const startPrice = 420;
  const floorPrice = 250;
  const totalMinutes = 60;

  // Exponential stepped decay formula
  const t = Math.min(1, Math.max(0, minutesElapsed / totalMinutes));
  const decayRatio = Math.exp(-1.4 * t);
  const currentPrice = Math.round(floorPrice + (startPrice - floorPrice) * decayRatio);

  const handleSimulateBuy = () => {
    soundFx.playSuccess();
    setIsReceiptOpen(true);
  };

  // Stepped chart coordinates
  const width = 500;
  const height = 140;
  const padding = 24;
  const steps = 10;
  const stepPoints: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const x = padding + fraction * (width - 2 * padding);
    const p = floorPrice + (startPrice - floorPrice) * Math.exp(-1.4 * fraction);
    const y = padding + (1 - (p - floorPrice) / (startPrice - floorPrice)) * (height - 2 * padding);
    stepPoints.push({ x, y });
  }

  let steppedPath = `M ${stepPoints[0].x},${stepPoints[0].y}`;
  for (let i = 1; i < stepPoints.length; i++) {
    steppedPath += ` H ${stepPoints[i].x} V ${stepPoints[i].y}`;
  }

  const markerX = padding + t * (width - 2 * padding);
  const markerY = padding + (1 - (currentPrice - floorPrice) / (startPrice - floorPrice)) * (height - 2 * padding);
  const areaPath = `${steppedPath} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <div className="surface p-6 sm:p-8 rounded-3xl border border-[rgba(185,167,255,0.25)] relative overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--lavender)' }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="chip chip-mint text-[10px]">DYNAMIC PRICE DECAY</span>
            <span className="text-xs font-mono text-[var(--text-dim)]">Dutch Auction Drop #DH-AUC-04</span>
          </div>
          <h3 className="font-display font-bold text-xl text-white">
            Dutch Auction Interactive Decay Sandbox
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-[rgba(25,227,177,0.12)] border border-[rgba(25,227,177,0.3)] text-xs font-mono text-[var(--mint)] font-bold">
            Live Drop Active
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Curve + Live Price Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-6">
        {/* Left 7 cols: SVG Stepped Chart & Scrub Slider */}
        <div className="lg:col-span-7 bg-[rgba(0,0,0,0.3)] p-4 rounded-2xl border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-dim)] mb-2">
            <span>Price Curve Trajectory</span>
            <span className="text-[var(--lavender)]">Drag slider below to scrub time</span>
          </div>

          <svg className="w-full h-32 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="dutchSimGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B9A7FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#B9A7FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Fill under stepped path */}
            <path d={areaPath} fill="url(#dutchSimGrad)" />

            {/* Stepped decay path */}
            <path
              d={steppedPath}
              fill="none"
              stroke="#B9A7FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Ceiling dashed line */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#FFB547" strokeDasharray="3 3" />

            {/* Current marker */}
            <circle cx={markerX} cy={markerY} r="7" fill="#0A0A10" stroke="#19E3B1" strokeWidth="2.5" />
            <circle cx={markerX} cy={markerY} r="3" fill="#19E3B1" />
          </svg>

          {/* Interactive Scrub Slider */}
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex justify-between items-center text-xs font-mono text-[var(--text-dim)] mb-1.5">
              <span>Time Elapsed: <strong className="text-white">{minutesElapsed} mins</strong></span>
              <span>Reserve Floor in: <strong className="text-[var(--lavender)]">{totalMinutes - minutesElapsed} mins</strong></span>
            </div>
            <input
              type="range"
              min="0"
              max={totalMinutes}
              value={minutesElapsed}
              onChange={(e) => {
                soundFx.playHover();
                setMinutesElapsed(Number(e.target.value));
              }}
              className="w-full accent-[var(--lavender)] cursor-pointer h-2 bg-[rgba(255,255,255,0.1)] rounded-lg"
            />
          </div>
        </div>

        {/* Right 5 cols: Instant Clearing Price + Buy Simulation Button */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-[rgba(185,167,255,0.04)] border border-[rgba(185,167,255,0.2)]">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] block mb-1">
              Current Instant Clearing Price
            </span>
            <div className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              ${currentPrice}.00
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Price drops every minute. The first fan to accept locks in ownership and triggers instant double-entry settlement.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <button
              onClick={handleSimulateBuy}
              className="w-full btn-mint py-3.5 rounded-xl font-bold text-sm shadow-mint flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gavel size={16} />
              <span>Simulate Buy Now (${currentPrice}.00)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verified Settlement Receipt Modal */}
      {isReceiptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md surface p-6 rounded-3xl border border-[rgba(25,227,177,0.4)] shadow-2xl relative">
            <button
              onClick={() => setIsReceiptOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[var(--text-dim)] hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 text-[var(--mint)] mb-3">
              <CheckCircle2 size={22} />
              <h4 className="font-display font-bold text-base text-white">Instant Ledger Settlement Complete</h4>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-4">
              You acquired 1x Darkhold Fest Weekend Pass at the clearing price of ${currentPrice}.00.
            </p>

            <div className="space-y-2 p-3.5 rounded-2xl bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Status:</span>
                <span className="text-[var(--mint)] font-bold">SETTLED (R1 Invariant OK)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Debited:</span>
                <span className="text-white">${currentPrice}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Pass Serial:</span>
                <span className="text-[var(--lavender)]">DH-2026-FEST-AUC04</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">txHash:</span>
                <span className="text-[var(--text-dim)]">0x9d3a...84f1</span>
              </div>
            </div>

            <button
              onClick={() => setIsReceiptOpen(false)}
              className="w-full mt-4 btn-primary py-2.5 rounded-xl text-xs font-semibold"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
