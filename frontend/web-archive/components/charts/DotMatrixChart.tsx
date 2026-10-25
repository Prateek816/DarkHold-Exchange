"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DotMatrixDataPoint {
  label: string;
  value: number;
  /** Highlight this group (latest) */
  highlight?: boolean;
}

interface DotMatrixChartProps {
  data: DotMatrixDataPoint[];
  /** Dot columns per group */
  columnsPerGroup?: number;
  /** Dot size in px */
  dotSize?: number;
  /** Pitch (spacing) in px */
  pitch?: number;
  /** Max height in px */
  maxHeight?: number;
  /** Color for normal dots */
  dotColor?: string;
  /** Color for highlighted dots */
  highlightColor?: string;
  /** Show vertical hairlines between groups */
  showHairlines?: boolean;
  /** Show labels beneath */
  showLabels?: boolean;
  /** Animate column rise on mount */
  animateRise?: boolean;
  className?: string;
}

/**
 * DotMatrixChart — Columns of small dots (3px dots, 5px pitch, white at 85%),
 * thin vertical hairlines between groups, latest group in lime, labels beneath.
 * Like ref-teal's highlight chart.
 *
 * Each time bucket is a group of `columnsPerGroup` vertical dot-columns that
 * rise from a shared baseline, so the group reads as one bar made of dots.
 */
export function DotMatrixChart({
  data,
  columnsPerGroup = 3,
  dotSize = 3,
  pitch = 5,
  maxHeight = 80,
  dotColor = "rgba(255,255,255,0.85)",
  highlightColor = "#DCF45C",
  showHairlines = true,
  showLabels = true,
  animateRise = true,
  className,
}: DotMatrixChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn("flex w-full items-center justify-center", className)}
        style={{ height: maxHeight + 30 }}
      >
        <span className="font-mono text-[10.5px] text-text-dim">No data</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const rowGap = pitch - dotSize;
  const groupGap = pitch * 3;

  return (
    <div className={cn("w-full select-none", className)}>
      <div
        className="flex items-end justify-center"
        style={{ height: maxHeight }}
        role="img"
        aria-label="Volume distribution by time bucket"
      >
        {data.map((group, groupIndex) => {
          const groupHeight = Math.max(
            dotSize,
            Math.round((group.value / maxValue) * (maxHeight - 4))
          );
          const dotRows = Math.max(1, Math.floor((groupHeight - dotSize) / pitch) + 1);
          const isHighlight = group.highlight;

          return (
            <div
              key={`${group.label}-${groupIndex}`}
              className="flex items-end"
              style={{ marginRight: showHairlines && groupIndex < data.length - 1 ? groupGap : 0 }}
            >
              {/* Dot columns */}
              <div className="flex items-end" style={{ gap: rowGap }}>
                {Array.from({ length: columnsPerGroup }).map((_, colIndex) => {
                  // Each column is slightly shorter than the last so the group
                  // reads as a stack of dots with a soft shoulder.
                  const columnRows = Math.max(
                    1,
                    Math.round(dotRows * (1 - colIndex * 0.11))
                  );
                  const delay = animateRise
                    ? (groupIndex * columnsPerGroup + colIndex) * 22
                    : 0;

                  return (
                    <div
                      key={colIndex}
                      className="flex flex-col-reverse"
                      style={{
                        gap: rowGap,
                        animation: animateRise
                          ? `dot-rise 420ms ${delay}ms cubic-bezier(0.22, 1, 0.36, 1) both`
                          : "none",
                      }}
                    >
                      {Array.from({ length: columnRows }).map((_, rowIndex) => (
                        <span
                          key={rowIndex}
                          className="rounded-[1px]"
                          style={{
                            width: dotSize,
                            height: dotSize,
                            backgroundColor: isHighlight ? highlightColor : dotColor,
                            boxShadow: isHighlight
                              ? `0 0 7px ${highlightColor}`
                              : "none",
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Hairline between groups */}
              {showHairlines && groupIndex < data.length - 1 && (
                <span
                  className="ml-[7px] h-full w-px self-stretch"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, rgba(255,255,255,0.14), transparent)",
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="mt-2 flex items-center justify-center" style={{ columnGap: groupGap }}>
          {data.map((group, index) => (
            <span
              key={`label-${group.label}-${index}`}
              className={cn(
                "font-mono text-[8.5px] uppercase tracking-[0.06em]",
                group.highlight ? "text-lime" : "text-text-dim"
              )}
            >
              {group.label}
            </span>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes dot-rise {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/** Settlement lag histogram variant with p50/p99 markers */
interface SettlementLagHistogramProps {
  data: DotMatrixDataPoint[];
  p50?: number;
  p99?: number;
  maxHeight?: number;
  className?: string;
}

export function SettlementLagHistogram({
  data,
  p50,
  p99,
  maxHeight = 100,
  className,
}: SettlementLagHistogramProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <DotMatrixChart
        data={data}
        maxHeight={maxHeight}
        dotSize={2.5}
        pitch={4}
        columnsPerGroup={2}
        highlightColor="#DCF45C"
        animateRise={true}
      />
      {(p50 || p99) && (
        <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
          {p50 && (
            <span className="flex items-center gap-1 text-mint-400">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-500" />
              p50: {p50}ms
            </span>
          )}
          {p99 && (
            <span className="flex items-center gap-1 text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              p99: {p99}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
}
