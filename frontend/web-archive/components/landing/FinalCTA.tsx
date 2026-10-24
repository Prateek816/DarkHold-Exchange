"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface FinalCTAProps {
  className?: string;
}

export function FinalCTA({ className }: FinalCTAProps) {
  // Live mock Dutch auction: AUC-101 Darkhold Fest Weekend Pass #042
  // start_price: 27500, floor_price: 24000, step every 15s, decrement 50
  const START_PRICE = 27500;
  const FLOOR_PRICE = 24000;
  const STEP_SECONDS = 15;
  const DECREMENT = 50;
  const START_TIME = Date.now() - 480000; // started 8 min ago

  const [currentPrice, setCurrentPrice] = useState(START_PRICE);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const elapsedMs = now - START_TIME;
      const steps = Math.floor(elapsedMs / (STEP_SECONDS * 1000));
      const next = Math.max(FLOOR_PRICE, START_PRICE - steps * DECREMENT);
      setCurrentPrice(next);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const pctRemaining = Math.max(0, ((currentPrice - FLOOR_PRICE) / (START_PRICE - FLOOR_PRICE)) * 100);

  return (
    <section
      className={cn(
        "relative z-10 overflow-hidden",
        className,
      )}
    >
      {/* Full-bleed ember glow behind the CTA */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-ward/[0.15] blur-[100px]"
        />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ward mb-4">
            Live Dutch auction — price falling now
          </p>
          <h2 className="font-display text-[clamp(3rem,6vw,5rem)] font-semibold leading-[0.95] tracking-tight text-text mb-6">
            The floor is approaching.
          </h2>

          {/* Ticking price */}
          <div className="flex items-baseline justify-center gap-2 mb-10">
            <span className="font-mono text-[clamp(3rem,6vw,5rem)] font-bold tabular-nums text-text">
              {formatCurrency(currentPrice)}
            </span>
            <span className="font-mono text-[12px] text-text-muted">
              / pass
            </span>
          </div>

          <div
            className={cn(
              "relative h-2 w-full max-w-xs mx-auto mb-12 rounded-full bg-white/[0.06] overflow-hidden",
              pctRemaining <= 20 ? "bg-sell-bg" : "",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-linear",
                pctRemaining <= 20 ? "bg-sell" : "bg-ward",
              )}
              style={{ width: `${pctRemaining}%` }}
            />
            <span className={cn(
              "absolute -top-8 right-0 font-mono text-[9px] tabular-nums",
              pctRemaining <= 20 ? "text-sell" : "text-verdigris-400",
            )}>
              Floor {formatCurrency(FLOOR_PRICE)}
            </span>
          </div>

          <p className="max-w-[42ch] mx-auto font-mono text-[11px] leading-relaxed text-text-muted mb-10">
            {currentPrice <= FLOOR_PRICE
              ? "This lot has reached its floor and expired."
              : "Accept before the price steps down again. Every tick is server-calculated; no client-side easing."}
          </p>

          <Link
            href="/auctions"
            className={cn(
              "inline-flex h-14 items-center justify-center gap-2 rounded-tile border border-brand-500/40 bg-brand-500/[0.06] px-10 sm:px-12 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300 transition-all duration-200",
              "hover:border-brand-500 hover:bg-brand-500/[0.12] hover:text-brand-200 hover:-translate-y-1",
              "active:scale-95",
              currentPrice <= FLOOR_PRICE ? "opacity-50 pointer-events-none" : "",
            )}
          >
            Enter the sale room
          </Link>
        </div>
      </div>
    </section>
  );
}
