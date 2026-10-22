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
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!data || data.length < 2) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-panel border border-glass-border bg-white/[0.015]"
        style={{ height }}
      >
        <span className="font-mono text-[10.5px] text-text-dim">Awaiting series…</span>
      </div>
    );
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
    <div className={cn("relative w-full select-none", className)}>
      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          onPointerLeave={() => setHoverIndex(null)}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const idx = Math.min(
              data.length - 1,
              Math.max(0, Math.round(relX * (data.length - 1)))
            );
            setHoverIndex(idx);
          }}
        >
          <defs>
            <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hexColor} stopOpacity="0.3" />
              <stop offset="92%" stopColor={hexColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {showGrid && (
            <>
              <line
                x1="0"
                y1="25"
                x2="100"
                y2="25"
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2 2"
              />
              <line
                x1="0"
                y1="55"
                x2="100"
                y2="55"
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2 2"
              />
              <line
                x1="0"
                y1="85"
                x2="100"
                y2="85"
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2 2"
              />
            </>
          )}

          <polygon points={polygonStr} fill={`url(#${uid}-grad)`} />

          <polyline
            fill="none"
            stroke={hexColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            filter={`url(#${uid}-glow)`}
            points={polylineStr}
          />

          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1="4"
                x2={activePoint.x}
                y2="95"
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="2 2"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="2.2"
                fill={hexColor}
                stroke="#04060A"
                strokeWidth="1.2"
                filter={`url(#${uid}-glow)`}
              />
            </>
          )}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute top-1 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-glass-border bg-canvas-elevated/95 px-3 py-1.5 font-mono text-[10.5px] shadow-glass backdrop-blur-md"
            style={{ left: `clamp(70px, ${activePoint.x}%, calc(100% - 70px))` }}
          >
            <span className="text-text-dim">{activePoint.label}</span>
            <span className="font-semibold tabular-nums" style={{ color: hexColor }}>
              {formatValue(activePoint.value)}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t border-glass-border pt-2 font-mono text-[9.5px] text-text-dim">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
