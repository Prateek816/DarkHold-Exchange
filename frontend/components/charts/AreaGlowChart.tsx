"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AreaDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface AreaGlowChartProps {
  data: AreaDataPoint[];
  color?: "teal" | "sell" | "violet" | "ward";
  height?: number;
  showGrid?: boolean;
  formatValue?: (val: number) => string;
  className?: string;
}

export function AreaGlowChart({
  data,
  color = "teal",
  height = 180,
  showGrid = true,
  formatValue = (v) => formatCurrency(v),
  className,
}: AreaGlowChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length < 2) {
    return <div className="h-44 w-full rounded-panel bg-white/[0.02] animate-pulse" />;
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const hexColor =
    color === "teal"
      ? "#19CBB0"
      : color === "sell"
      ? "#F0506E"
      : color === "ward"
      ? "#F5B544"
      : "#7C5CFF";

  const svgPoints = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 90 - ((d.value - min) / range) * 75;
    return { x, y, ...d };
  });

  const polylineStr = svgPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const polygonStr = `0,95 ${polylineStr} 100,95`;

  const activePoint = hoverIndex !== null ? svgPoints[hoverIndex] : null;

  return (
    <div className={cn("relative w-full font-mono text-xs select-none", className)}>
      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onPointerLeave={() => setHoverIndex(null)}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const idx = Math.min(data.length - 1, Math.max(0, Math.round(relX * (data.length - 1))));
            setHoverIndex(idx);
          }}
        >
          <defs>
            {/* SVG Glow Filter */}
            <filter id={`glow-${color}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient fill under curve */}
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hexColor} stopOpacity="0.35" />
              <stop offset="90%" stopColor={hexColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Faint Horizontal Grid lines */}
          {showGrid && (
            <>
              <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
              <line x1="0" y1="55" x2="100" y2="55" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
              <line x1="0" y1="85" x2="100" y2="85" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
            </>
          )}

          {/* Gradient Area Fill */}
          <polygon points={polygonStr} fill={`url(#grad-${color})`} />

          {/* Glowing Monotone Line */}
          <polyline
            fill="none"
            stroke={hexColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${color})`}
            points={polylineStr}
          />

          {/* Hover Crosshair & Dot */}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1="5"
                x2={activePoint.x}
                y2="95"
                stroke="rgba(255,255,255,0.3)"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="3"
                fill="#FFFFFF"
                stroke="#04060A"
                strokeWidth="1.5"
                filter={`url(#glow-${color})`}
              />
            </>
          )}
        </svg>

        {/* Floating Glass Tooltip Pill */}
        {activePoint && (
          <div
            className="pointer-events-none absolute -top-2 px-3 py-1.5 rounded-pill border border-glass-border bg-canvas-elevated/95 backdrop-blur-md shadow-glass text-xs font-semibold text-text transition-all duration-150 -translate-x-1/2 flex items-center gap-2"
            style={{ left: `${activePoint.x}%` }}
          >
            <span className="text-text-muted text-[11px]">{activePoint.label}:</span>
            <span style={{ color: hexColor }}>{formatValue(activePoint.value)}</span>
          </div>
        )}
      </div>

      {/* Axis Labels */}
      <div className="flex justify-between text-[11px] text-text-dim pt-2 border-t border-glass-border">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
