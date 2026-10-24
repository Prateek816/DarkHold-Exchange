'use client';

import React, { useState } from 'react';
import { soundFx } from '@/lib/sound';
import { fmt } from '@/lib/formatters';
import { ShieldCheck, ShieldAlert, CheckCircle2, Zap, ArrowRight, Play } from 'lucide-react';

export function LiveSimulatorSandbox() {
  const [lastAction, setLastAction] = useState<{
    status: 'IDLE' | 'SUCCESS' | 'BLOCKED';
    message: string;
    details?: string;
  }>({
    status: 'IDLE',
    message: 'Click any scenario below to trigger the live matching engine in real-time.',
  });

  const [orderCount, setOrderCount] = useState(148);

  const handleFairTrade = () => {
    soundFx.playChime(620);
    setOrderCount((c) => c + 1);
    setLastAction({
      status: 'SUCCESS',
      message: 'Order Accepted & Matched: 1x DFEST-WKD @ $138.50',
      details: 'Price is within the $144.00 ceiling. Double-entry ledger debited $138.50, trade settled with txHash: 0x9b4...2a1.',
    });
  };

  const handleScalperAttempt = () => {
    soundFx.playChime(220);
    setLastAction({
      status: 'BLOCKED',
      message: 'REJECTED: PRICE_ABOVE_CEILING ($190.00 > $144.00)',
      details: 'Resale cap is strictly 120% of face value ($120.00). The matching engine dropped this order with zero slippage to genuine fans.',
    });
  };

  return (
    <div className="surface p-6 md:p-8 rounded-3xl border border-[rgba(185,167,255,0.25)] relative overflow-hidden shadow-deep">
      {/* Background ambient lighting */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--lavender)' }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="chip chip-mint text-[10px]">LIVE SANDBOX</span>
            <span className="text-xs font-mono text-[var(--text-dim)]">Engine Engine-v2.4</span>
          </div>
          <h3 className="font-display font-bold text-lg text-white mt-1">
            Test the Anti-Scalping Engine Live
          </h3>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-[var(--buy)] animate-pulse" />
          <span className="text-[var(--text-muted)]">Verified Executions:</span>
          <span className="text-white font-bold">{orderCount}</span>
        </div>
      </div>

      {/* Simulator Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <button
          onClick={handleFairTrade}
          className="p-4 rounded-2xl bg-[rgba(52,210,123,0.06)] hover:bg-[rgba(52,210,123,0.12)] border border-[rgba(52,210,123,0.25)] text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-sm text-[var(--buy)]">1. Execute Fair Trade ($138.50)</span>
            <CheckCircle2 size={16} className="text-[var(--buy)] group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Submits a market buy order below the ceiling cap. Instant execution & ledger reservation.
          </p>
        </button>

        <button
          onClick={handleScalperAttempt}
          className="p-4 rounded-2xl bg-[rgba(255,90,95,0.06)] hover:bg-[rgba(255,90,95,0.12)] border border-[rgba(255,90,95,0.25)] text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-sm text-[var(--sell)]">2. Simulate Scalper Order ($190.00)</span>
            <ShieldAlert size={16} className="text-[var(--sell)] group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Attempts to list or bid at predatory markup. See the matching engine block it immediately.
          </p>
        </button>
      </div>

      {/* Live Engine Output Console */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          lastAction.status === 'SUCCESS'
            ? 'bg-[rgba(52,210,123,0.08)] border-[var(--buy)]'
            : lastAction.status === 'BLOCKED'
            ? 'bg-[rgba(255,90,95,0.08)] border-[var(--sell)]'
            : 'surface-2 border-[var(--border)]'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {lastAction.status === 'SUCCESS' && <CheckCircle2 size={16} className="text-[var(--buy)] shrink-0" />}
          {lastAction.status === 'BLOCKED' && <ShieldAlert size={16} className="text-[var(--sell)] shrink-0" />}
          {lastAction.status === 'IDLE' && <Zap size={16} className="text-[var(--lavender)] shrink-0" />}
          <span className="font-mono text-xs font-bold text-white">{lastAction.message}</span>
        </div>
        {lastAction.details && (
          <p className="text-xs text-[var(--text-muted)] font-mono pl-6 leading-relaxed">
            {lastAction.details}
          </p>
        )}
      </div>
    </div>
  );
}
