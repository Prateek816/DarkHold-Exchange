"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AssetSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
  className?: string;
}

export function AssetSparkline({
  data,
  width = 110,
  height = 36,
  isPositive = true,
  className,
}: AssetSparklineProps) {
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!data || data.length < 2) {
    return (
      <div className="h-9 w-28 animate-pulse rounded-panel border border-glass-border bg-white/[0.03]" />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const coords = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 6) + 3;
    const y = height - 5 - ((val - min) / range) * (height - 10);
    return { x, y };
  });

  const points = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `3,${height} ${points} ${width - 3},${height}`;

  const colorHex = isPositive ? "#14CBAA" : "#E0405E";
  const last = coords[coords.length - 1];
  const lastX = last.x;
  const lastY = last.y;

  return (
    <div className={cn("inline-block select-none", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorHex} stopOpacity="0.24" />
            <stop offset="100%" stopColor={colorHex} stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon points={area} fill={`url(#${uid}-area)`} />

        <polyline
          fill="none"
          stroke={colorHex}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${uid}-glow)`}
          points={points}
        />

        <circle cx={lastX} cy={lastY} r="4" fill={colorHex} opacity="0.22" className="animate-ping" />
        <circle cx={lastX} cy={lastY} r="2.2" fill={colorHex} stroke="#04060A" strokeWidth="1" />
      </svg>
    </div>
  );
}
