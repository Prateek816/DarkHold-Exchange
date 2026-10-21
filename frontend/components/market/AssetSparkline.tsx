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
  if (!data || data.length < 2) {
    return <div className="h-9 w-28 bg-white/[0.04] rounded-panel animate-shimmer" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 6) + 3;
      const y = height - 5 - ((val - min) / range) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const colorHex = isPositive ? "#19CBB0" : "#F0506E";
  const lastX = width - 3;
  const lastY = height - 5 - ((data[data.length - 1] - min) / range) * (height - 10);

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
          <filter id={`sparkline-glow-${isPositive ? "pos" : "neg"}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow Polyline */}
        <polyline
          fill="none"
          stroke={colorHex}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#sparkline-glow-${isPositive ? "pos" : "neg"})`}
          points={points}
        />

        {/* End Pulse Dot with Halo */}
        <circle cx={lastX} cy={lastY} r="4" fill={colorHex} opacity="0.3" className="animate-ping" />
        <circle cx={lastX} cy={lastY} r="2.5" fill="#FFFFFF" stroke={colorHex} strokeWidth="1" />
      </svg>
    </div>
  );
}
