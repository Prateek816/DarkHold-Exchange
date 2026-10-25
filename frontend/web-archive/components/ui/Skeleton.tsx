"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Skeleton variant */
  variant?: "text" | "card" | "circle" | "rect" | "stat" | "table-row";
  /** Number of lines for text variant */
  lines?: number;
  className?: string;
}

/**
 * Skeleton — Shimmer placeholders matching final layout.
 * No layout shift when data arrives.
 */
export function Skeleton({
  variant = "rect",
  lines = 3,
  className,
  style,
  ...props
}: SkeletonProps) {
  const baseStyles: React.CSSProperties = {
    background: "linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%)",
    backgroundSize: "200% 100%",
    animation: "skeleton-shimmer 1.5s ease-in-out infinite",
    borderRadius: "var(--radius-panel)",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    text: { height: "1em", borderRadius: "4px" },
    card: { borderRadius: "var(--radius-card)" },
    circle: { borderRadius: "50%" },
    rect: { borderRadius: "var(--radius-panel)" },
    stat: { height: "1.5em", borderRadius: "var(--radius-panel)" },
    "table-row": { height: "2.5em", borderRadius: "var(--radius-panel)" },
  };

  const variants = variant.split(" ");
  const combinedStyle = variants.reduce<React.CSSProperties>(
    (acc, v) => ({ ...acc, ...variantStyles[v] }),
    baseStyles
  );

  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...combinedStyle,
              width: i === lines - 1 ? "60%" : "100%",
              height: "1em",
            }}
            {...props}
          />
        ))}
      </div>
    );
  }

  if (variant === "stat") {
    return (
      <div className={cn("flex flex-col justify-between gap-4 p-5", className)} {...props}>
        <div className="flex items-center gap-3">
          <div style={{ ...combinedStyle, width: 40, height: 40, borderRadius: "var(--radius-tile)" }} />
          <div style={{ ...combinedStyle, width: "80px", height: "10px" }} />
        </div>
        <div style={{ ...combinedStyle, width: "100px", height: "28px" }} />
        <div style={{ ...combinedStyle, width: "60px", height: "10px" }} />
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <div className={cn("grid grid-cols-4 gap-4", className)} {...props}>
        <div style={{ ...combinedStyle, height: "24px" }} />
        <div style={{ ...combinedStyle, height: "24px" }} />
        <div style={{ ...combinedStyle, height: "24px" }} />
        <div style={{ ...combinedStyle, height: "24px" }} />
      </div>
    );
  }

  return (
    <div
      className={cn(className)}
      style={{ ...combinedStyle, ...style }}
      {...props}
    />
  );
}

/** Card skeleton with full structure */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-5 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <Skeleton variant="text" className="w-32" />
      </div>
      <Skeleton variant="text" lines={1} className="w-1/2" />
      <Skeleton variant="text" lines={1} className="w-1/3" />
    </div>
  );
}

/** Chart skeleton */
export function ChartSkeleton({ height = 300, className }: { height?: number; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center border border-glass-border bg-white/[0.015] rounded-panel", className)} style={{ height }}>
      <div className="flex flex-col items-center gap-3 text-text-dim">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
        <span className="font-mono text-[11px]">Loading chart data…</span>
      </div>
    </div>
  );
}

/** Table skeleton */
export function TableSkeleton({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="grid gap-4 font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-dim" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} variant="text" className="h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`r${rowIndex}-c${colIndex}`} variant="text" className="h-5" />
          ))}
        </div>
      ))}
    </div>
  );
}