'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ShieldCheck, Lock, Stamp, Zap } from 'lucide-react';
import { formatCurrency, formatSerial } from '@/lib/formatters';
import { UserOrder } from '@/lib/types';

interface TheStubProps {
  order: UserOrder | null;
  step: 'RESERVED' | 'MATCHED' | 'SETTLED' | null;
  onDismiss?: () => void;
}

export function TheStub({ order, step, onDismiss }: TheStubProps) {
  if (!order || !step) return null;

  const isReserved = step === 'RESERVED' || step === 'MATCHED' || step === 'SETTLED';
  const isMatched = step === 'MATCHED' || step === 'SETTLED';
  const isSettled = step === 'SETTLED';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full my-3 p-5 bg-[#080d1a]/85 border border-cyan/40 text-ink rounded-3xl shadow-cyan-glow backdrop-blur-2xl cyber-top-rim"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/[0.08] text-xs font-mono uppercase">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_#00F0FF] animate-ping" />
            <span className="font-bold text-cyan tracking-wider">
              SETTLEMENT PROTOCOL // {formatSerial(order.id, 'ORD')}
            </span>
          </div>
          <span className="text-white font-semibold">
            {order.side} {order.quantity}x {order.asset_symbol} @ {formatCurrency(order.price)}
          </span>
        </div>

        {/* 3-segment rounded cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
          {/* Segment 1: RESERVED */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isReserved
                ? 'border-cyan/50 bg-cyan/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'border-white/[0.05] bg-white/[0.02] opacity-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-ink-muted font-bold">1. ESCROW LOCK</span>
              <Lock className={`w-3.5 h-3.5 ${isReserved ? 'text-cyan' : 'text-ink-dim'}`} />
            </div>
            <div className="my-2">
              <div className="font-display text-lg font-bold tracking-tight text-white uppercase">RESERVED</div>
              <div className="text-[11px] font-mono text-ink-muted">
                {formatCurrency(order.reserved_amount)} locked in drawer
              </div>
            </div>
            <div className="text-[10px] font-mono text-cyan font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> PRE-FUNDED OK
            </div>
          </div>

          {/* Segment 2: MATCHED */}
          <div
            className={`p-4 rounded-2xl border relative transition-all ${
              isMatched
                ? 'border-indigo/50 bg-indigo/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                : 'border-white/[0.05] bg-white/[0.02] opacity-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-ink-muted font-bold">2. SEQUENCER MATCH</span>
              <ShieldCheck className={`w-3.5 h-3.5 ${isMatched ? 'text-indigo' : 'text-ink-dim'}`} />
            </div>
            <div className="my-2">
              <div className="font-display text-lg font-bold tracking-tight text-white uppercase">MATCHED</div>
              <div className="text-[11px] font-mono text-ink-muted">
                {isMatched ? 'Sequencer seq #' + Math.floor(100000 + Math.random() * 50000) : 'Resting in book...'}
              </div>
            </div>
            <div className="text-[10px] font-mono font-semibold">
              {isMatched ? (
                <span className="text-indigo font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> MATCHED IOC
                </span>
              ) : (
                <span className="text-ink-dim">WAITING FILL</span>
              )}
            </div>
          </div>

          {/* Segment 3: SETTLED */}
          <div
            className={`p-4 rounded-2xl border relative overflow-hidden transition-all ${
              isSettled
                ? 'border-market-buy bg-market-buy/15 shadow-emerald-glow'
                : 'border-white/[0.05] bg-white/[0.02] opacity-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-ink-muted font-bold">3. LEDGER COMMIT</span>
              <Stamp className={`w-3.5 h-3.5 ${isSettled ? 'text-market-buy' : 'text-ink-dim'}`} />
            </div>
            <div className="my-2">
              <div className="font-display text-lg font-bold tracking-tight text-white uppercase">
                {isSettled ? 'SETTLED' : 'AWAITING FINALITY'}
              </div>
              <div className="text-[11px] font-mono text-ink-muted">
                {isSettled ? 'Double-entry posted' : 'Deterministic finality'}
              </div>
            </div>

            {isSettled ? (
              <motion.div
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 text-market-buy font-mono text-xs font-bold"
              >
                <Check className="w-3.5 h-3.5" /> DOUBLE-ENTRY VERIFIED
              </motion.div>
            ) : (
              <div className="text-[10px] font-mono text-ink-dim">STEP 3 PENDING</div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
