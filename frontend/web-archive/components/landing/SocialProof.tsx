"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/lib/format";
import { api } from "@/lib/api-client";

interface SocialProofProps {
  className?: string;
}

interface SocialStat {
  label: string;
  value: number;
  note: string;
  formatter: (v: number) => string;
}

export function SocialProof({ className }: SocialProofProps) {
  const [stats, setStats] = useState<SocialStat[]>([
    {
      label: "Trades matched",
      value: 0,
      note: "Simulated fills this session",
      formatter: (v) => formatQuantity(v),
    },
    {
      label: "Listings blocked at ceiling",
      value: 0,
      note: "Orders rejected by The Ward",
      formatter: (v) => formatQuantity(v),
    },
    {
      label: "Reconciliation drift",
      value: 0,
      note: "Across all 8 rings",
      formatter: (v) => formatQuantity(v),
    },
  ]);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    if (counted) return;
    // Fetch live numbers from mock engine, count up once on mount
    let loaded = false;
    Promise.all([
      api.getOrders().then((orders) =>
        orders.filter((o) => o.status === "FILLED").length
      ),
      api.getOrders().then((orders) =>
        orders.filter((o) => o.reject_reason?.includes("PRICE_ABOVE_CEILING")).length
      ),
      api.getReconciliationRings().then((rings) =>
        rings.filter((r) => !r.passed).length
      ),
    ]).then(([filled, blocked, drift]) => {
      loaded = true;
      const targets = [filled, blocked, drift];
      setStats((prev) =>
        prev.map((s, i) => ({ ...s, value: targets[i] }))
      );

      // Count up each stat once
      const duration = 900;
      const start = performance.now();
      const rafs: number[] = [];
      stats.forEach((_, i) => {
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setStats((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], value: Math.floor(stats[i].value + (targets[i] - stats[i].value) * p) };
            return next;
          });
          if (p < 1) rafs[i] = requestAnimationFrame(tick);
          else setCounted(true);
        };
        rafs[i] = requestAnimationFrame(tick);
      });
      return () => rafs.forEach((r) => cancelAnimationFrame(r));
    });
    return () => { loaded = true; };
  }, [counted]);

  return (
    <section
      className={cn("relative z-10 border-y border-white/[0.04] bg-white/[0.01]", className)}
      aria-label="Simulated market social proof"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <p className="mx-auto max-w-[56ch] font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim text-center">
          Simulated market, live from the demo engine.
        </p>

        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row gap-8 items-center justify-center">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "flex flex-col items-center gap-3 text-center",
                "transition-all duration-700 ease-out",
                `opacity-0 translate-y-8 delay-${i * 150}`,
                "animate-[tick-in_0.25s_ease-out_forwards]",
              )}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <span className="font-mono text-[clamp(2rem,4vw,3rem)] font-bold tabular-nums text-text leading-none">
                {stat.formatter(stat.value)}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                {stat.label}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-text-dim">
                {stat.note}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/[0.04] pt-8 flex items-center justify-center gap-3">
          <span className="w-1 h-1 rounded-full bg-verdigris-400 shadow-[0_0_8px_rgba(62,230,200,0.6)]" />
          <span className="font-mono text-[9px] text-text-dim">Live counts · no customer numbers · no logo wall</span>
        </div>
      </div>
    </section>
  );
}
