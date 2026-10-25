"use client";

import React, { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AreaDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  timestamp?: number;
}

interface AreaGlowChartProps {
  data: AreaDataPoint[];
  color?: "brand" | "mint" | "sell" | "ward";
  height?: number;
  showGrid?: boolean;
  formatValue?: (val: number) => string;
  /** Animate line draw-in on first mount */
  animateDrawIn?: boolean;
  /** Show area fill */
  showArea?: boolean;
  /** Stroke width */
  strokeWidth?: number;
  className?: string;
}

const colorMap = {
  brand: { hex: "#7A5CFF", glow: "rgba(122,92,255,0.42)" },
  mint: { hex: "#14CBAA", glow: "rgba(20,203,170,0.32)" },
  sell: { hex: "#E0405E", glow: "rgba(224,64,94,0.32)" },
  ward: { hex: "#F2B04A", glow: "rgba(242,176,74,0.36)" },
} as const;

/**
 * AreaGlowChart — Smooth monotone line with SVG glow, gradient fill fading to 0.
 * Hover: white dot with dark ring + halo, hairline, floating glass tooltip pill.
 * First-load: stroke draw-in 700ms.
 */
export function AreaGlowChart({
  data,
  color = "mint",
  height = 180,
  showGrid = true,
  formatValue = (v) => formatCurrency(v),
  animateDrawIn = true,
  showArea = true,
  strokeWidth = 2,
  className,
}: AreaGlowChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [drawProgress, setDrawProgress] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useRef(`areaglow-${Math.random().toString(36).slice(2, 9)}`).current;

  // Animate draw-in on mount
  useEffect(() => {
    if (!animateDrawIn) return;
    setDrawProgress(0);
    const timer = setTimeout(() => {
      setDrawProgress(1);
    }, 10);
    return () => clearTimeout(timer);
  }, [animateDrawIn, data.length]);

  if (!data || data.length < 2) {
    return (
      <div
        className={cn("relative w-full select-none", className)}
        style={{ height }}
        aria-label="Awaiting data"
      >
        <div className="flex h-full w-full items-center justify-center rounded-panel border border-glass-border bg-white/[0.015]">
          <span className="font-mono text-[10.5px] text-text-dim">Awaiting series…</span>
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const { hex, glow } = colorMap[color];

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 90 - ((d.value - min) / range) * 75;
    return { x, y, ...d };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const polygonStr = `0,95 ${polylineStr} 100,95`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div className="relative w-full" style={{ height }}>
        <svg
          ref={svgRef}
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
            {/* Glow filter */}
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Area gradient */}
            {showArea && (
              <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hex} stopOpacity="0.28" />
                <stop offset="100%" stopColor={hex} stopOpacity="0" />
              </linearGradient>
            )}

            {/* Stroke dash for draw-in animation */}
            <path
              id={`${uid}-path`}
              d={`M${polylineStr}`}
              fill="none"
              stroke={hex}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </defs>

          {/* Grid lines */}
          {showGrid && (
            <>
              <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />
              <line x1="0" y1="55" x2="100" y2="55" stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />
              <line x1="0" y1="85" x2="100" y2="85" stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />
            </>
          )}

          {/* Area fill */}
          {showArea && (
            <polygon
              points={polygonStr}
              fill={`url(#${uid}-grad)`}
              style={{ opacity: drawProgress }}
            />
          )}

          {/* Stroke with draw-in animation */}
          <use
            href={`#${uid}-path`}
            filter={`url(#${uid}-glow)`}
            strokeDasharray={`${points.length * 2} ${points.length * 2}`}
            strokeDashoffset={drawProgress === 1 ? 0 : points.length * 2}
            style={{
              transition: animateDrawIn ? "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            }}
          />

          {/* Hover indicator */}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1="4"
                x2={activePoint.x}
                y2="95"
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="2 2"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="3"
                fill={hex}
                stroke="#04060A"
                strokeWidth="1.5"
                filter={`url(#${uid}-glow)`}
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5.5"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            </>
          )}
        </svg>

        {/* Floating tooltip */}
        {activePoint && (
          <div
            className="pointer-events-none absolute top-1 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-glass-border bg-canvas-elevated/95 px-3 py-1.5 font-mono text-[10.5px] shadow-glass backdrop-blur-md"
            style={{ left: `clamp(60px, ${activePoint.x}%, calc(100% - 60px))` }}
          >
            <span className="text-text-dim">{activePoint.label}</span>
            <span className="font-semibold tabular-nums" style={{ color: hex }}>
              {formatValue(activePoint.value)}
            </span>
          </div>
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between border-t border-glass-border pt-2 font-mono text-[9.5px] text-text-dim">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}