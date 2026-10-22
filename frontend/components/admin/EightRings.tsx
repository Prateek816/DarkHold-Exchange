"use client";

import React, { useEffect, useRef, useState } from "react";
import { ReconciliationRing } from "@/lib/types";
import { formatFullDateTime } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { RotateCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EightRingsProps {
  rings: ReconciliationRing[];
  onRunAudit: () => void;
  className?: string;
}

export function EightRings({ rings, onRunAudit, className }: EightRingsProps) {
  const [activeRingIndex, setActiveRingIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleRun = () => {
    if (isRunning || rings.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsRunning(true);
    let step = 0;
    timerRef.current = setInterval(() => {
      if (step < rings.length) {
        setActiveRingIndex(step);
        step++;
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRunning(false);
        setActiveRingIndex(null);
        onRunAudit();
      }
    }, 120);
  };

  const failedCount = rings.filter((r) => !r.passed).length;
  const allPassed = rings.length > 0 && failedCount === 0;

  return (
    <GlassCard className={cn("overflow-hidden p-0", className)}>
      <div className="flex flex-col justify-between gap-4 border-b border-glass-border p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border",
              allPassed
                ? "border-buy/30 bg-buy-tint text-buy"
                : rings.length === 0
                ? "border-glass-border bg-white/[0.04] text-text-muted"
                : "border-sell/40 bg-sell-tint text-sell"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-text">
              The Eight Rings of Reconciliation
            </h3>
            <p className="pt-0.5 text-[11.5px] leading-relaxed text-text-muted">
              Automated invariants verifying double-entry parity, inventory, and Ward integrity.
            </p>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning || rings.length === 0}
          className="flex shrink-0 items-center gap-2 self-start rounded-full border border-glass-border bg-white/[0.04] px-4 py-2 font-mono text-[10.5px] font-semibold text-text transition-all hover:border-brand-500/40 hover:bg-white/[0.07] disabled:opacity-50 sm:self-auto"
        >
          <RotateCw className={cn("h-3.5 w-3.5 text-brand-400", isRunning && "animate-spin")} />
          <span>{isRunning ? "Verifying invariants…" : "Run reconciliation"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-8">
        {rings.length === 0 ? (
          <div className="col-span-full rounded-[14px] border border-dashed border-glass-border bg-white/[0.015] px-4 py-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
              Awaiting reconciliation snapshot…
            </p>
          </div>
        ) : (
          rings.map((ring, idx) => {
            const isInspecting = activeRingIndex === idx;

            return (
              <div
                key={ring.code}
                className={cn(
                  "group relative flex cursor-help flex-col items-center gap-2.5 rounded-[14px] border p-3.5 text-center transition-all duration-200",
                  isInspecting
                    ? "scale-105 border-brand-400/60 bg-brand-500/10 shadow-[0_0_20px_rgba(25,203,176,0.25)]"
                    : ring.passed
                    ? "border-glass-border bg-white/[0.02] hover:border-buy/35 hover:bg-buy/[0.04]"
                    : "border-sell/40 bg-sell/[0.06]"
                )}
                title={`${ring.name}: ${ring.description}`}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono transition-all duration-300",
                    isInspecting
                      ? "animate-spin border-brand-400 text-brand-300"
                      : ring.passed
                      ? "border-buy/50 bg-buy/10 text-buy-text shadow-[0_0_12px_rgba(34,197,94,0.22)]"
                      : "border-sell bg-sell/10 text-sell-text shadow-[0_0_12px_rgba(240,80,110,0.28)]"
                  )}
                >
                  <span className="text-[11px] font-bold">{ring.code}</span>
                </div>

                <div className="w-full space-y-0.5">
                  <span className="block line-clamp-2 min-h-[2.5em] text-[10.5px] font-semibold leading-tight text-text">
                    {ring.name}
                  </span>
                  <span
                    className={cn(
                      "block font-mono text-[8.5px] font-medium uppercase tracking-[0.1em]",
                      ring.passed ? "text-buy-text" : "text-sell-text"
                    )}
                  >
                    {ring.passed ? "Pass · 0 err" : "Discrepancy"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col justify-between gap-2 border-t border-glass-border px-5 py-3 text-[10.5px] text-text-muted sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isRunning
                ? "animate-pulse bg-brand-400"
                : rings.length === 0
                ? "bg-white/25"
                : allPassed
                ? "bg-buy shadow-[0_0_6px_#22C55E]"
                : "bg-sell shadow-[0_0_6px_#F0506E]"
            )}
          />
          <span>
            Invariant verdict:{" "}
            <strong
              className={cn(
                "font-semibold",
                rings.length === 0
                  ? "text-text-muted"
                  : allPassed
                  ? "text-buy-text"
                  : "text-sell-text"
              )}
            >
              {rings.length === 0
                ? "AWAITING SNAPSHOT"
                : isRunning
                ? "AUDIT IN PROGRESS"
                : allPassed
                ? `ALL ${rings.length} RINGS VERIFIED`
                : `${failedCount} RING${failedCount === 1 ? "" : "S"} OUT OF BALANCE`}
            </strong>
            {!isRunning && allPassed && (
              <span className="text-text-dim"> · 0 discrepancies</span>
            )}
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-dim">
          {rings.length > 0
            ? `Checked ${formatFullDateTime(rings[0].last_verified_at)}`
            : "Awaiting first snapshot"}
        </span>
      </div>
    </GlassCard>
  );
}
