"use client";

import React from "react";
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

export function DecayCurveChart({
  startPrice,
  floorPrice,
  ceilingPrice,
  currentPrice,
  startTime,
  endTime,
  height = 160,
  className,
}: DecayCurveChartProps) {
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  const totalDuration = Math.max(1, endTime - startTime);
  const elapsed = Math.max(0, Math.min(totalDuration, Date.now() - startTime));
  const progressPct = (elapsed / totalDuration) * 100;

  const minPrice = Math.min(floorPrice, startPrice * 0.8);
  const maxPrice = Math.max(startPrice, ceilingPrice);
  const priceRange = maxPrice - minPrice || 1;

  const points: string[] = [];
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const price = startPrice - (startPrice - floorPrice) * Math.pow(t, 0.85);
    const x = t * 96 + 2;
    const y = 150 - ((price - minPrice) / priceRange) * 130;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const nowX = (progressPct / 100) * 96 + 2;
  const nowY = 150 - ((currentPrice - minPrice) / priceRange) * 130;

  const ceilingY = 150 - ((ceilingPrice - minPrice) / priceRange) * 130;
  const floorY = 150 - ((floorPrice - minPrice) / priceRange) * 130;

  return (
    <div
      className={cn(
        "space-y-3 rounded-[14px] border border-glass-border bg-white/[0.02] p-3.5 backdrop-blur-[12px] sm:p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 font-mono">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-dim">
          <span className="h-1 w-1 rounded-full bg-brand-400" />
          Decay curve geometry
        </span>
        <span className="text-[10px] text-text-muted">
          Now <span className="font-semibold tabular-nums text-brand-400">{formatCurrency(currentPrice)}</span>
        </span>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          viewBox="0 0 100 160"
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${uid}-decay-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#19CBB0" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#19CBB0" stopOpacity="0" />
            </linearGradient>
            <filter id={`${uid}-decay-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#19CBB0" floodOpacity="0.55" />
            </filter>
          </defs>

          {[30, 70, 110].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="rgba(255,255,255,0.035)"
              strokeDasharray="2 2"
            />
          ))}

          <line
            x1="0"
            y1={ceilingY}
            x2="100"
            y2={ceilingY}
            stroke="#F5B544"
            strokeWidth="0.9"
            strokeDasharray="2.5 2"
            vectorEffect="non-scaling-stroke"
          />

          <line
            x1="0"
            y1={floorY}
            x2="100"
            y2={floorY}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.8"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />

          <polygon points={`2,160 ${points.join(" ")} 98,160`} fill={`url(#${uid}-decay-grad)`} />

          <polyline
            fill="none"
            stroke="#19CBB0"
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            filter={`url(#${uid}-decay-glow)`}
            points={points.join(" ")}
          />

          <line
            x1={Math.max(2, Math.min(98, nowX))}
            y1="8"
            x2={Math.max(2, Math.min(98, nowX))}
            y2="152"
            stroke="rgba(214,242,74,0.28)"
            strokeDasharray="2 2"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />

          <circle
            cx={Math.max(2, Math.min(98, nowX))}
            cy={Math.max(10, Math.min(150, nowY))}
            r="4.5"
            fill="#D6F24A"
            fillOpacity="0.22"
            className="animate-ping"
          />
          <circle
            cx={Math.max(2, Math.min(98, nowX))}
            cy={Math.max(10, Math.min(150, nowY))}
            r="2.4"
            fill="#D6F24A"
            stroke="#04060A"
            strokeWidth="0.8"
          />
        </svg>

        <div className="absolute right-2 top-1 flex items-center gap-1 rounded-full border border-warning/20 bg-warning/[0.08] px-1.5 py-0.5 font-mono text-[8.5px] font-medium text-warning">
          Resale cap {formatCurrency(ceilingPrice)}
        </div>
        <div className="absolute bottom-1 right-2 rounded-full bg-canvas/60 px-1.5 py-0.5 font-mono text-[8.5px] text-text-dim">
          Floor {formatCurrency(floorPrice)}
        </div>
      </div>

      <div className="flex justify-between border-t border-glass-border pt-2 font-mono text-[9px] text-text-muted">
        <span>
          Start <span className="tabular-nums text-text">{formatCurrency(startPrice)}</span>
        </span>
        <span className="hidden text-brand-400 sm:inline">Price ticks down every step</span>
        <span>
          Floor <span className="tabular-nums text-text">{formatCurrency(floorPrice)}</span>
        </span>
      </div>
    </div>
  );
}
