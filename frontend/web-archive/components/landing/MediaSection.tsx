"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CandleChart } from "@/components/trading/CandleChart";
import { DepthChart } from "@/components/trading/DepthChart";
import { TradeTape } from "@/components/trading/TradeTape";
import { api } from "@/lib/api-client";
import type { Candle, TradeTick } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

interface MediaSectionProps {
  className?: string;
}

const FEATURED_ASSET = "DARKHOLD-PASS-2026";

function PinnedStep({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 py-6 border-b border-white/[0.04] last:border-0">
      <span className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-[10px] font-bold text-text">
        0{number}
      </span>
      <div>
        <p className="font-display text-[15px] font-semibold leading-none text-text">{title}</p>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-text-muted">{body}</p>
      </div>
    </div>
  );
}

export function MediaSection({ className }: MediaSectionProps) {
  const { data: candles, isLoading: candleLoading } = useQuery({
    queryKey: ["landing-candles", FEATURED_ASSET, "1m"],
    queryFn: () => api.getCandles(FEATURED_ASSET, "1m"),
    refetchInterval: 15_000,
  });
  const { data: trades, isLoading: tradeLoading } = useQuery({
    queryKey: ["landing-trades", FEATURED_ASSET],
    queryFn: () => api.getTrades(FEATURED_ASSET),
    refetchInterval: 5_000,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (!scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      setPinned(rect.top <= 80 && rect.bottom >= window.innerHeight - 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className={cn("relative z-10 border-y border-white/[0.04] bg-white/[0.01]", className)}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row lg:gap-12 items-start">
          {/* Pinned scroll story: Reserve → Match → Settle */}
          <div
            ref={scrollRef}
            className={cn(
              "lg:w-[340px] lg:shrink-0",
              pinned ? "lg:sticky lg:top-24" : "",
            )}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim mb-6">
              The ledger sequence
            </p>
            <PinnedStep
              number={1}
              title="Reserve"
              body="Credits are held against a working buy; units are held against a sell. Nothing moves optimistically."
            />
            <PinnedStep
              number={2}
              title="Match"
              body="The engine crosses bid against ask inside the ceiling. A Dutch lot steps down until accepted."
            />
            <PinnedStep
              number={3}
              title="Settle"
              body="After server confirmation, the seal completes and a ledger receipt is posted."
            />
          </div>

          {/* Tilted glass frame with real terminal components */}
          <div className={cn("flex-1 mt-12 lg:mt-0 relative")}>
            <div
              className={cn(
                "relative -rotate-[2deg] sm:-rotate-[1.5deg] lg:rotate-0 origin-center transform transition-transform duration-700",
                "border border-white/[0.08] rounded-card bg-white/[0.02] backdrop-blur-xl shadow-card p-6 sm:p-8",
              )}
            >
              <div className="absolute inset-0 bg-white/[0.02] rounded-card pointer-events-none" />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <CandleChart
                    candles={candles ?? []}
                    ceilingPrice={27500}
                    lastTradePrice={candles?.[candles.length - 1]?.close}
                    interval="1m"
                    onIntervalChange={() => {}}
                    loading={candleLoading}
                  />
                  <TradeTape trades={trades ?? []} />
                </div>
                <div className="flex flex-col gap-4">
                  <DepthChart
                    bids={[]}
                    asks={[]}
                    height={200}
                    className="hidden lg:block"
                  />
                  <div className="glass-card p-5 space-y-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                      Vault bar
                    </p>
                    <div className="flex items-center justify-between gap-3 border border-white/[0.06] rounded-panel bg-white/[0.03] p-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-verdigris-400">
                        Available
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-text">
                        $100,000
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-verdigris-500 to-brand-500 w-[55%]" />
                    </div>
                    <div className="flex items-center justify-between gap-3 border border-white/[0.06] rounded-panel bg-white/[0.03] p-3 mt-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-warning">
                        Reserved
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-text">
                        $25,000
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-warning to-brand-600 w-[20%]" />
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
                Live mock data rendered through the real terminal components — no stock imagery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
