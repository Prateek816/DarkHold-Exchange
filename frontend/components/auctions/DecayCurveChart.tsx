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
  const totalDuration = Math.max(1, endTime - startTime);
  const elapsed = Math.max(0, Math.min(totalDuration, Date.now() - startTime));
  const progressPct = (elapsed / totalDuration) * 100;

  const minPrice = Math.min(floorPrice, startPrice * 0.8);
  const maxPrice = Math.max(startPrice, ceilingPrice);
  const priceRange = maxPrice - minPrice || 1;

  // Generate SVG curve points for descending decay curve
  const points: string[] = [];
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 to 1
    // Exponential decay curve
    const price = startPrice - (startPrice - floorPrice) * Math.pow(t, 0.85);
    const x = t * 96 + 2;
    const y = 150 - ((price - minPrice) / priceRange) * 130;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // Calculate coordinates for the "Now" marker
  const nowX = (progressPct / 100) * 96 + 2;
  const nowY = 150 - ((currentPrice - minPrice) / priceRange) * 130;

  const ceilingY = 150 - ((ceilingPrice - minPrice) / priceRange) * 130;
  const floorY = 150 - ((floorPrice - minPrice) / priceRange) * 130;

  return (
    <div className={cn("p-4 rounded-16 border border-white/8 bg-white/[0.025] backdrop-blur-[12px] font-mono space-y-3", className)}>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="uppercase tracking-wider font-semibold">Decay Curve Geometry</span>
        <span className="text-brand-400 font-medium">Now: {formatCurrency(currentPrice)}</span>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg viewBox="0 0 100 160" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="decayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#19CBB0" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#19CBB0" stopOpacity="0.0" />
            </linearGradient>
            <filter id="decayGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#19CBB0" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Ceiling line (The Ward) - Amber dashed glowing line */}
          <line
            x1="0"
            y1={ceilingY}
            x2="100"
            y2={ceilingY}
            stroke="#F5B544"
            strokeWidth="0.9"
            strokeDasharray="2.5 2"
          />

          {/* Floor price line */}
          <line
            x1="0"
            y1={floorY}
            x2="100"
            y2={floorY}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />

          {/* Shaded Area under decay */}
          <polygon
            points={`2,160 ${points.join(" ")} 98,160`}
            fill="url(#decayGrad)"
          />

          {/* The Decay Path */}
          <polyline
            fill="none"
            stroke="#19CBB0"
            strokeWidth="1.8"
            strokeLinecap="round"
            filter="url(#decayGlow)"
            points={points.join(" ")}
          />

          {/* Glowing "NOW" Marker halo & dot */}
          <circle
            cx={Math.max(2, Math.min(98, nowX))}
            cy={Math.max(10, Math.min(150, nowY))}
            r="4.5"
            fill="#3EE6C8"
            fillOpacity="0.25"
            className="animate-ping"
          />
          <circle
            cx={Math.max(2, Math.min(98, nowX))}
            cy={Math.max(10, Math.min(150, nowY))}
            r="2.5"
            fill="#3EE6C8"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            className="drop-shadow-[0_0_8px_rgba(62,230,200,0.8)]"
          />
        </svg>

        {/* Labels overlay */}
        <div className="absolute top-1 right-2 text-[10px] text-warning font-medium flex items-center gap-1 bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
          <span>Resale cap {formatCurrency(ceilingPrice)}</span>
        </div>
        <div className="absolute bottom-1 right-2 text-[10px] text-text-dim">
          Floor {formatCurrency(floorPrice)}
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-text-muted border-t border-white/6 pt-2">
        <span>Start: {formatCurrency(startPrice)}</span>
        <span className="text-brand-400">Price ticks down every step</span>
        <span>Floor: {formatCurrency(floorPrice)}</span>
      </div>
    </div>
  );
}
