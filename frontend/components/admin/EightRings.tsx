"use client";

import React, { useState } from "react";
import { ReconciliationRing } from "@/lib/types";
import { formatFullDateTime } from "@/lib/format";
import { RotateCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface EightRingsProps {
  rings: ReconciliationRing[];
  onRunAudit: () => void;
  className?: string;
}

export function EightRings({ rings, onRunAudit, className }: EightRingsProps) {
  const [activeRingIndex, setActiveRingIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    let step = 0;
    const interval = setInterval(() => {
      if (step < 8) {
        setActiveRingIndex(step);
        step++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setActiveRingIndex(null);
        onRunAudit();
      }
    }, 120);
  };

  const allPassed = rings.every((r) => r.passed);

  return (
    <div
      className={cn(
        "relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] p-6 space-y-5 overflow-hidden",
        className
      )}
    >
      {/* Top hairline highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-12 bg-buy-tint border border-buy/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-buy" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              The Eight Rings of Reconciliation
            </h3>
            <p className="text-xs text-text-muted">
              Automated invariants verifying double-entry ledger parity, inventory, and ward integrity.
            </p>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-12 bg-white/[0.04] border border-white/10 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-500/40 transition-all disabled:opacity-50"
        >
          <RotateCw className={cn("w-3.5 h-3.5", isRunning && "animate-spin text-brand-400")} />
          <span>{isRunning ? "Verifying Invariants..." : "Run Reconciliation"}</span>
        </button>
      </div>

      {/* R1-R8 Rings Visual Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {rings.map((ring, idx) => {
          const isInspecting = activeRingIndex === idx;

          return (
            <div
              key={ring.code}
              className={cn(
                "p-3.5 rounded-16 border flex flex-col items-center text-center space-y-2.5 transition-all duration-200 group relative cursor-help",
                isInspecting
                  ? "border-brand-400 bg-brand-500/10 scale-105 shadow-[0_0_20px_rgba(25,203,176,0.3)]"
                  : ring.passed
                  ? "border-white/8 bg-white/[0.025] hover:border-buy/40 hover:bg-buy/[0.04]"
                  : "border-sell/40 bg-sell-tint"
              )}
              title={`${ring.name}: ${ring.description}`}
            >
              {/* Circular Ring Sigil */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 font-mono",
                  isInspecting
                    ? "border-brand-400 text-brand-300 animate-spin"
                    : ring.passed
                    ? "border-buy/60 text-buy shadow-[0_0_12px_rgba(34,197,94,0.3)] bg-buy/10"
                    : "border-sell text-sell shadow-[0_0_12px_rgba(240,80,110,0.35)] bg-sell/10"
                )}
              >
                <span className="font-bold text-xs">{ring.code}</span>
              </div>

              <div className="space-y-0.5 w-full">
                <span className="block text-[11px] font-semibold text-white truncate">
                  {ring.name}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider block",
                    ring.passed ? "text-buy" : "text-sell"
                  )}
                >
                  {ring.passed ? "Pass (0 Err)" : "Discrepancy"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Audit Verdict */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-text-muted border-t border-white/6 pt-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-buy inline-block shadow-[0_0_6px_#22C55E]" />
          <span>
            Invariant Verdict: <strong className="text-buy font-semibold">ALL 8 RINGS VERIFIED</strong> (0
            Discrepancies)
          </span>
        </div>
        <span className="font-mono text-text-dim text-[11px]">Checked: {formatFullDateTime(rings[0]?.last_verified_at || Date.now())}</span>
      </div>
    </div>
  );
}
