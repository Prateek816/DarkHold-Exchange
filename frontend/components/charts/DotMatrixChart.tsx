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
    <div className={cn("w-full select-none font-mono", className)}>
      <div className="no-scrollbar flex items-end justify-between gap-1 overflow-x-auto py-2">
        {columns.map((col, colIdx) => {
          const isLatest = highlightLatest && colIdx === columns.length - 1;
          const activeRows = Math.min(
            maxRows,
            Math.max(col.value > 0 ? 1 : 0, Math.round((col.value / maxValue) * maxRows))
          );

          return (
            <div
              key={col.id || colIdx}
              className="group relative flex min-w-[26px] flex-1 flex-col items-center gap-1.5"
            >
              <div
                className="flex flex-col-reverse items-center justify-start"
                style={{ gap: `${dotPitch - dotSize}px`, height: `${maxRows * dotPitch}px` }}
              >
                {Array.from({ length: maxRows }).map((_, rIdx) => {
                  const isActive = rIdx < activeRows;

                  return (
                    <span
                      key={rIdx}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        isActive
                          ? isLatest
                            ? "bg-lime shadow-[0_0_6px_rgba(214,242,74,0.7)]"
                            : "bg-brand-400/80 shadow-[0_0_5px_rgba(25,203,176,0.35)]"
                          : "bg-white/[0.06]"
                      )}
                      style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
                    />
                  );
                })}
              </div>

              <span
                className={cn(
                  "max-w-full truncate text-center text-[9px] transition-colors",
                  isLatest ? "font-bold text-lime" : "text-text-dim group-hover:text-text"
                )}
              >
                {col.label}
              </span>

              <div className="pointer-events-none absolute -top-7 z-20 whitespace-nowrap rounded-[6px] border border-glass-border bg-canvas-elevated px-2 py-0.5 text-[9px] text-text opacity-0 shadow-glass transition-opacity group-hover:opacity-100">
                {col.subLabel || `${col.value}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
