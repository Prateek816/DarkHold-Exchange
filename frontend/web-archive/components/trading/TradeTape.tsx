"use client";

import React, { useState, useEffect } from "react";
import type { TradeTick } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { SimBadge } from "@/components/ui/SimBadge";
import { cn } from "@/lib/utils";

interface TradeTapeProps {
  trades: TradeTick[];
  className?: string;
}

export function TradeTape({ trades, className }: TradeTapeProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className={cn("flex flex-col overflow-hidden border border-glass-border bg-surface", className)}
      role="region"
      aria-label="Simulated trades tape"
    >
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
          Trade tape
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-sim">
          <span className="h-1.5 w-1.5 rounded-full bg-sim" style={{ boxShadow: "0 0 6px var(--sim-glow)" }} />
          Mock prints
        </span>
      </div>

      <div className="grid grid-cols-4 border-b border-glass-border bg-canvas-elevated/50 px-4 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.09em] text-text-dim">
        <span>Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Age</span>
        <span className="text-right">Flag</span>
      </div>

      <div className="no-scrollbar max-h-[300px] divide-y divide-white/[0.025] overflow-y-auto">
        {trades.length === 0 ? (
          <div className="p-5 text-center font-mono text-[10px] leading-relaxed text-text-dim">
            No simulated prints yet. A candle or tape row appears only after the mock engine
            produces a trade.
          </div>
        ) : (
          trades.map((trade, index) => {
            const isBuy = trade.aggressor_side === "BUY";
            const isLatest = index === 0;
            const diffSec = Math.floor((now - trade.timestamp) / 1000);
            const timeStr =
              diffSec < 5
                ? "now"
                : diffSec < 60
                  ? `${diffSec}s`
                  : `${Math.floor(diffSec / 60)}m`;

            return (
              <div
                key={trade.seq}
                className={cn(
                  "grid grid-cols-4 items-center px-4 py-1.5 font-mono text-[10px] transition-colors hover:bg-white/[0.02]",
                  isLatest && "animate-count-flash"
                )}
                title={`Sequence ${trade.seq} · ${new Date(trade.timestamp).toLocaleTimeString(
                  "en-US",
                  { hour12: false }
                )}`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn("h-1.5 w-1.5 shrink-0", isBuy ? "bg-buy" : "bg-sell")}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "tabular-nums",
                      isBuy ? "text-buy-text" : "text-sell-text"
                    )}
                  >
                    {formatCurrency(trade.price)}
                  </span>
                </span>

                <span className="text-right tabular-nums text-text-muted">
                  {formatQuantity(trade.qty)}
                </span>

                <span
                  className={cn(
                    "text-right tabular-nums",
                    timeStr === "now" ? "text-lime" : "text-text-dim"
                  )}
                >
                  {timeStr}
                </span>

                <div className="flex justify-end">
                  {trade.is_sim ? (
                    <SimBadge label="SIM" />
                  ) : (
                    <span
                      className="font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-dim"
                      title="This print is not marked simulated by the feed"
                    >
                      unsim
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="border-t border-glass-border px-4 py-2 font-mono text-[8px] leading-relaxed text-text-dim">
        Every mocked print is fictional. The tape is keyed by server sequence; duplicate ticks are
        ignored.
      </p>
    </section>
  );
}
