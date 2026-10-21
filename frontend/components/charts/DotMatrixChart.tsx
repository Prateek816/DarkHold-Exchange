"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DotMatrixColumn {
  id: string;
  label: string;
  value: number; // 0 to maxRows
  subLabel?: string;
}

interface DotMatrixChartProps {
  columns: DotMatrixColumn[];
  maxRows?: number;
  highlightLatest?: boolean;
  dotSize?: number;
  dotPitch?: number;
  className?: string;
}

export function DotMatrixChart({
  columns,
  maxRows = 10,
  highlightLatest = true,
  dotSize = 3,
  dotPitch = 5,
  className,
}: DotMatrixChartProps) {
  const maxValue = Math.max(...columns.map((c) => c.value), 1);

  return (
    <div className={cn("w-full space-y-2 font-mono text-xs select-none", className)}>
      <div className="flex items-end justify-between gap-1 overflow-x-auto py-2">
        {columns.map((col, colIdx) => {
          const isLatest = highlightLatest && colIdx === columns.length - 1;
          const activeRows = Math.min(
            maxRows,
            Math.max(col.value > 0 ? 1 : 0, Math.round((col.value / maxValue) * maxRows))
          );

          return (
            <div
              key={col.id || colIdx}
              className="flex-1 flex flex-col items-center gap-1 group relative min-w-[28px]"
            >
              {/* Dot Column (stacked from bottom to top) */}
              <div
                className="flex flex-col-reverse justify-start items-center"
                style={{ gap: `${dotPitch - dotSize}px`, height: `${maxRows * dotPitch}px` }}
              >
                {Array.from({ length: maxRows }).map((_, rIdx) => {
                  const isActive = rIdx < activeRows;

                  let dotColor = "bg-white/[0.08]";
                  if (isActive) {
                    dotColor = isLatest
                      ? "bg-lime shadow-[0_0_6px_rgba(214,242,74,0.8)]"
                      : "bg-white/[0.85]";
                  }

                  return (
                    <span
                      key={rIdx}
                      className={cn("rounded-full transition-colors duration-200", dotColor)}
                      style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
                    />
                  );
                })}
              </div>

              {/* Bottom Label */}
              <span
                className={cn(
                  "text-[10px] truncate max-w-full text-center transition-colors",
                  isLatest ? "text-lime font-bold" : "text-text-dim group-hover:text-text"
                )}
              >
                {col.label}
              </span>

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-8 px-2 py-0.5 rounded-md bg-canvas-elevated border border-glass-border shadow-glass text-[10px] text-text opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                {col.subLabel || `${col.value}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
