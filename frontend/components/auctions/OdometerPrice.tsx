"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
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
  nextStepSeconds: initialNextStep,
  priceDecrement,
  className,
}: OdometerPriceProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialNextStep);
  const [isTickFlash, setIsTickFlash] = useState(false);

  // Local second ticker countdown
  useEffect(() => {
    setSecondsRemaining(initialNextStep);
  }, [initialNextStep]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsTickFlash(true);
          setTimeout(() => setIsTickFlash(false), 200);
          return 15; // Reset interval loop
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatted = formatCurrency(currentPrice);

  return (
    <div
      className={cn(
        "relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.06] via-white/[0.025] to-white/[0.01] p-8 backdrop-blur-[18px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center text-center space-y-4 overflow-hidden",
        className
      )}
    >
      {/* Top hairline highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      {/* Ambient center soft glow */}
      <div className="absolute inset-0 bg-radial-gradient from-brand-500/[0.07] to-transparent pointer-events-none" />

      {/* Header Tag */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[11px] font-medium text-brand-400 uppercase tracking-wider">
        <Hourglass className="w-3.5 h-3.5 animate-pulse" />
        <span>Current Dutch Price (Descending)</span>
      </div>

      {/* Odometer Numeric Display */}
      <div className="relative py-1">
        <h2
          className={cn(
            "text-5xl sm:text-7xl font-bold font-sans tracking-tight text-white tabular-nums select-none drop-shadow-[0_0_24px_rgba(25,203,176,0.25)] transition-transform duration-150",
            isTickFlash && "scale-95 text-brand-300"
          )}
        >
          {formatted}
        </h2>
      </div>

      {/* Step Countdown Bar */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 border border-warning/25 text-warning font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-text-muted font-sans text-xs">Next price drop in:</span>
          <span className="font-bold text-white text-sm tabular-nums">{secondsRemaining}s</span>
        </div>
        <span className="text-white/20">•</span>
        <div className="flex items-center gap-1 text-text-muted font-mono">
          <ArrowDown className="w-3.5 h-3.5 text-warning" />
          <span className="tabular-nums">-{formatCurrency(priceDecrement)} / step</span>
        </div>
      </div>
    </div>
  );
}
