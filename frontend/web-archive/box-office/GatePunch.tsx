'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertOctagon, RotateCw, ShieldCheck } from 'lucide-react';
import { useDemoStore } from '@/lib/store';
import { formatTime } from '@/lib/formatters';

export function GatePunch() {
  const reconRules = useDemoStore((s) => s.reconRules);
  const isReconciling = useDemoStore((s) => s.isReconciling);
  const runReconciliation = useDemoStore((s) => s.runReconciliation);

  return (
    <div className="w-full bg-[#080d1a]/85 border border-cyan/40 p-7 rounded-3xl shadow-cyan-glow cyber-top-rim backdrop-blur-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-cyan" />
            <h3 className="font-display text-2xl uppercase tracking-tight text-white font-extrabold">
              GATE PUNCH // RECONCILIATION PROOF (R1–R8)
            </h3>
          </div>
          <p className="text-xs font-mono text-ink-muted mt-1">
            Double-entry ledger invariant verification. Conservation proofs without solipsism.
          </p>
        </div>

        <button
          onClick={() => runReconciliation()}
          disabled={isReconciling}
          className="btn-cyan text-xs font-bold uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
          {isReconciling ? 'PUNCHING AUDIT...' : 'EXECUTE GATE PUNCH AUDIT'}
        </button>
      </div>

      {/* Grid of 8 inspection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {reconRules.map((rule) => {
          const isPassed = rule.status === 'PASSED';
          return (
            <div
              key={rule.id}
              className="p-4.5 bg-white/[0.03] border border-white/[0.08] hover:border-cyan/40 rounded-2xl flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-cyan bg-cyan/15 px-2.5 py-0.5 rounded-full border border-cyan/30">
                    {rule.id}
                  </span>
                  <span className="text-[10px] text-ink-muted">
                    {formatTime(rule.last_checked)}
                  </span>
                </div>

                <div className="font-sans font-bold text-sm text-white mt-3 leading-snug">
                  {rule.name}
                </div>
                <div className="text-[11px] font-mono text-ink-muted mt-1.5 leading-relaxed">
                  {rule.description}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <div className="text-[10px] font-mono text-ink-muted truncate">
                  {rule.invariant}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-ink-muted">
                    DRIFT: {rule.drift_value}
                  </span>

                  {isPassed ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-market-buy">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-market-sell">
                      <AlertOctagon className="w-3.5 h-3.5" /> DRIFT
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
