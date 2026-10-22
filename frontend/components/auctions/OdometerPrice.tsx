"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { Hourglass, ArrowDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OdometerPriceProps {
  currentPrice: number;
  nextStepSeconds: number;
  priceDecrement: number;
  className?: string;
}

export function OdometerPrice({
  currentPrice,
  nextStepSeconds,
  priceDecrement,
  className,
}: OdometerPriceProps) {
  const reduceMotion = useReducedMotion();
  const [secondsRemaining, setSecondsRemaining] = useState(nextStepSeconds || 15);
  const [isTickFlash, setIsTickFlash] = useState(false);

  // Reset countdown when the auction step length changes.
  useEffect(() => {
    setSecondsRemaining(nextStepSeconds || 15);
  }, [nextStepSeconds]);

  // Tick down once per second, loop back at the end of each step.
  useEffect(() => {
    const step = nextStepSeconds || 15;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? step : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [nextStepSeconds]);

  // Flash the odometer and restart the countdown whenever the authoritative price moves.
  useEffect(() => {
    setSecondsRemaining(nextStepSeconds || 15);
    setIsTickFlash(true);
    const timeout = setTimeout(() => setIsTickFlash(false), 320);
    return () => clearTimeout(timeout);
  }, [currentPrice, nextStepSeconds]);

  const formatted = formatCurrency(currentPrice);
  const progressPct = Math.min(
    100,
    Math.max(0, (secondsRemaining / (nextStepSeconds || 15)) * 100)
  );

  return (
    <GlassCard
      glowEdge="teal"
      className={cn(
        "relative flex flex-col items-center justify-center gap-5 overflow-hidden p-7 text-center sm:p-10",
        className
      )}
    >
      {/* Ambient radial glow + sweeping scan line */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(25,203,176,0.14),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-24 animate-scan-line bg-gradient-to-b from-brand-400/[0.07] to-transparent" />

      <span className="relative inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-brand-300">
        <Hourglass className="h-3 w-3" />
        Current Dutch price · descending
      </span>

      <div className="relative flex min-h-[76px] items-center justify-center sm:min-h-[104px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center select-none font-display text-[48px] font-bold tracking-tighter text-brand-400/20 blur-2xl sm:text-[76px]"
        >
          {formatted}
        </span>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h2
            key={currentPrice}
            initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(5px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            aria-live="polite"
            className={cn(
              "relative select-none font-display text-[48px] font-bold leading-none tracking-tighter text-text tabular-nums drop-shadow-[0_0_28px_rgba(25,203,176,0.22)] transition-colors duration-300 sm:text-[76px]",
              isTickFlash && "text-brand-300"
            )}
          >
            {formatted}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-warning/25 bg-warning/[0.08] px-3.5 py-1.5 text-[11px]">
            <Clock className="h-3.5 w-3.5 text-warning" />
            <span className="text-text-muted">Next drop in</span>
            <span className="font-mono text-[12px] font-bold tabular-nums text-text">
              {secondsRemaining}s
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.03] px-3.5 py-1.5 font-mono text-[11px] text-text-muted">
            <ArrowDown className="h-3.5 w-3.5 text-warning" />
            <span className="tabular-nums">{formatCurrency(priceDecrement)}</span>
            <span className="text-text-dim">/ step</span>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full border border-glass-border bg-white/[0.04]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-lime shadow-[0_0_10px_rgba(25,203,176,0.5)] transition-[width] duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          Price decrements automatically · accept at the live tick
        </p>
      </div>
    </GlassCard>
  );
}
