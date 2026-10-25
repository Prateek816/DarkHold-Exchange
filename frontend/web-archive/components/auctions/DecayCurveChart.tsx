"use client";

import React, { useRef, useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DecayCurveChartProps {
  startPrice: number;
  floorPrice: number;
  ceilingPrice: number;
  currentPrice: number;
  startTime: number;
  endTime: number;
  height?: number;
  className?: string;
}

/**
 * DecayCurveChart — The descent path with a pulsing "now" dot and
 * start/floor/ceiling reference lines. The dot marks the latest server
 * quote; no future ticks are inferred from the client clock.
 */
export function DecayCurveChart({
  startPrice,
  floorPrice,
  ceilingPrice,
  currentPrice,
  startTime,
  endTime,
  height = 180,
  className,
}: DecayCurveChartProps) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.min(endTime - startTime, Date.now() - startTime)));
  const lastSyncedKeyRef = useRef<string>("");

  useEffect(() => {
    const totalDuration = Math.max(1, endTime - startTime);
    const key = `${startTime}:${endTime}`;
    if (lastSyncedKeyRef.current === key) return;
    lastSyncedKeyRef.current = key;
    const initialElapsed = Math.max(0, Math.min(totalDuration, Date.now() - startTime));
    setElapsed(initialElapsed);

    const interval = setInterval(() => {
      setElapsed((prev) => Math.min(totalDuration, prev + 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const totalDuration = Math.max(1, endTime - startTime);
  const progressPct = (elapsed / totalDuration) * 100;

  const minPrice = Math.min(floorPrice, startPrice * 0.8);
  const maxPrice = Math.max(startPrice, ceilingPrice);
  const priceRange = maxPrice - minPrice || 1;

  const points: string[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Slightly convex decay curve
    const price = startPrice - (startPrice - floorPrice) * Math.pow(t, 0.85);
    const x = t * 96 + 2;
    const y = 150 - ((price - minPrice) / priceRange) * 130;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const nowX = (progressPct / 100) * 96 + 2;
  const nowY = 150 - ((currentPrice - minPrice) / priceRange) * 130;
  const ceilingY = 150 - ((ceilingPrice - minPrice) / priceRange) * 130;
  const floorY = 150 - ((floorPrice - minPrice) / priceRange) * 130;
  const startY = 150 - ((startPrice - minPrice) / priceRange) * 130;

  return (
    <section
      className={cn("relative overflow-hidden rounded-card border border-glass-border bg-white/[0.02] shadow-card p-5", className)}
      aria-label="Illustrative auction price path"
      style={{ height }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border pb-3 font-mono">
        <span className="text-[9px] uppercase tracking-[0.13em] text-brand-400">
          Configured descent · illustrative
        </span>
        <span className="text-[10px] text-text-muted">
          Live{" "}
          <span className="font-semibold tabular-nums text-brand-300">
            {formatCurrency(currentPrice)}
          </span>
        </span>
      </div>

      <div className="relative mt-3 w-full overflow-hidden" style={{ height: height - 50 }}>
        <svg
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <filter id="decay-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="now-pulse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A5CFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7A5CFF" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Horizontal grid */}
          {[30, 70, 110].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="rgba(255,255,255,0.035)"
              strokeDasharray="2 4"
              strokeWidth="0.6"
            />
          ))}

          {/* Ceiling reference line */}
          <line
            x1="0"
            y1={ceilingY}
            x2="100"
            y2={ceilingY}
            stroke="#F2B04A"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x="2"
            y={Math.max(10, ceilingY - 4)}
            fill="#F2B04A"
            fontSize="4.5"
            fontFamily="IBM Plex Mono, monospace"
            letterSpacing="0.1"
            fontWeight="600"
          >
            CAP
          </text>

          {/* Floor reference line */}
          <line
            x1="0"
            y1={floorY}
            x2="100"
            y2={floorY}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.8"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x="2"
            y={Math.min(150, floorY + 5)}
            fill="rgba(152,150,168,0.9)"
            fontSize="4.5"
            fontFamily="IBM Plex Mono, monospace"
            letterSpacing="0.1"
            fontWeight="500"
          >
            FLOOR
          </text>

          {/* Start price reference */}
          <line
            x1="2"
            y1={startY}
            x2="10"
            y2={startY}
            stroke="rgba(124,92,255,0.5)"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x="12"
            y={startY + 2}
            fill="rgba(122,92,255,0.75)"
            fontSize="4"
            fontFamily="IBM Plex Mono, monospace"
            letterSpacing="0.1"
          >
            OPEN
          </text>

          {/* Decay curve */}
          <polyline
            fill="none"
            stroke="#7A5CFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            filter="url(#decay-glow)"
            points={points.join(" ")}
          />

          {/* Now vertical hairline */}
          <line
            x1={Math.max(2, Math.min(98, nowX))}
            y1="8"
            x2={Math.max(2, Math.min(98, nowX))}
            y2="144"
            stroke="rgba(124,92,255,0.4)"
            strokeDasharray="3 4"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />

          {/* Pulsing "now" dot */}
          <circle
            cx={Math.max(2, Math.min(98, nowX))}
            cy={Math.max(12, Math.min(142, nowY))}
            r="3.5"
            fill="url(#now-pulse)"
            stroke="#05050A"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
            style={{
              animation: "pulse-ring 1.6s ease-in-out infinite",
            }}
          />
          <circle
            cx={Math.max(2, Math.min(98, nowX))}
            cy={Math.max(12, Math.min(142, nowY))}
            r="7"
            fill="none"
            stroke="rgba(124,92,255,0.25)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            style={{
              animation: "pulse-ring 1.6s ease-in-out infinite 0.4s",
            }}
          />
        </svg>

        <div className="absolute right-3 top-2 rounded-pill border border-ward/40 bg-ward-tint px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-ward">
          Resale cap {formatCurrency(ceilingPrice)}
        </div>
        <div className="absolute left-3 bottom-2 rounded-pill border border-glass-border bg-canvas-elevated/90 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-text-dim">
          Floor {formatCurrency(floorPrice)}
        </div>
        <div className="absolute left-3 top-2 rounded-pill border border-brand-500/40 bg-brand-500/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-brand-400">
          Open {formatCurrency(startPrice)}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t border-glass-border pt-3 font-mono text-[9px] text-text-muted">
        <span>
          Opening{" "}
          <span className="tabular-nums text-text">
            {formatCurrency(startPrice)}
          </span>
        </span>
        <span className="hidden text-text-dim sm:inline">
          Desk marks the quote · path is not a trade history
        </span>
        <span>
          Floor{" "}
          <span className="tabular-nums text-text">{formatCurrency(floorPrice)}</span>
        </span>
      </div>

      <style jsx global>{`
        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.2;
          }
        }
      `}</style>
    </section>
  );
}