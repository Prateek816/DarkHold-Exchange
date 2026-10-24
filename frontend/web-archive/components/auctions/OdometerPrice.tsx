"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import { Clock, ArrowDown, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

interface OdometerPriceProps {
  currentPrice: number;
  nextStepSeconds: number;
  priceDecrement: number;
  isActive?: boolean;
  className?: string;
}

/**
 * Hourglass Odometer — Huge odometer-style price with a soft violet glow,
 * a countdown pill to the next step, and a subtle progress indicator.
 */
export function OdometerPrice({
  currentPrice,
  nextStepSeconds,
  priceDecrement,
  isActive = true,
  className,
}: OdometerPriceProps) {
  const reduceMotion = useReducedMotion();
  const [secondsRemaining, setSecondsRemaining] = useState(nextStepSeconds || 0);

  const lastSyncedStepRef = useRef(nextStepSeconds);
  const lastSyncedPriceRef = useRef(currentPrice);

  useEffect(() => {
    if (lastSyncedStepRef.current !== nextStepSeconds || lastSyncedPriceRef.current !== currentPrice) {
      lastSyncedStepRef.current = nextStepSeconds;
      lastSyncedPriceRef.current = currentPrice;
      setSecondsRemaining(nextStepSeconds || 0);
    }
  }, [nextStepSeconds, currentPrice]);

  useEffect(() => {
    if (!isActive || nextStepSeconds <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? nextStepSeconds : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, nextStepSeconds]);

  const formatted = formatCurrency(currentPrice);
  const progressPct =
    nextStepSeconds > 0
      ? Math.min(100, Math.max(0, (secondsRemaining / nextStepSeconds) * 100))
      : 0;
  const atFloor = isActive && nextStepSeconds <= 0;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-card border border-glass-border bg-white/[0.02] shadow-card",
        className
      )}
      aria-label="Current Dutch auction price"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-6 py-4">
        <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-brand-400">
          <Hourglass className="h-3.5 w-3.5" />
          Current asking price
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          {isActive ? "Descending on server steps" : "Closed — final tick shown"}
        </span>
      </div>

      {/* Odometer display */}
      <div className="relative px-6 py-8 text-center sm:py-10">
        <div className="relative">
          {/* Soft violet glow behind price */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[120px] w-full bg-gradient-to-b from-brand-500/12 via-brand-500/4 to-transparent pointer-events-none"
          />

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={currentPrice}
              initial={reduceMotion ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -14, filter: "blur(8px)" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              aria-live="polite"
              className="figure select-none text-[58px] md:text-[80px] sm:text-[92px] text-text drop-shadow-[0_0_36px_rgba(122,92,255,0.45)]"
            >
              {formatted}
            </motion.p>
          </AnimatePresence>

          <p className="mx-auto max-w-sm pt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-text-dim">
            Price read from the mock auction ledger. The client never lowers this amount on its own.
          </p>
        </div>
      </div>

      {/* Countdown + step info */}
      <div className="flex flex-col gap-4 border-t border-glass-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 font-mono text-[10px]">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-ward/40 bg-ward-tint px-3 py-1.5 text-ward">
            <Clock className="h-3 w-3" />
            {atFloor ? (
              <span className="font-semibold text-ward">At floor</span>
            ) : isActive ? (
              <>
                Next step in{" "}
                <span className="font-semibold tabular-nums text-text">
                  {secondsRemaining}s
                </span>
              </>
            ) : (
              <span className="text-text-dim">No further steps</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-text-dim">
            <ArrowDown className="h-3.5 w-3.5 text-warning" />
            <span className="tabular-nums">{formatCurrency(priceDecrement)}</span>
            <span className="text-text-dim">per step</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04] sm:max-w-[200px]">
          <div
            className="h-full bg-gradient-to-r from-warning to-ward shadow-[0_0_8px_rgba(245,181,68,0.6)] transition-[width] duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}