"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";

const STAT_ITEMS = [
  { label: "Available credits", value: "100,000", variant: "mint" as const },
  { label: "Reserved credits", value: "25,000", variant: "amber" as const },
  { label: "Held units", value: "1,250", variant: "brand" as const },
  { label: "Open orders", value: "07", note: "3 partial", variant: "mint" as const },
  { label: "Active lots", value: "03", note: "5 total", variant: "brand" as const },
  { label: "Receipts", value: "12", note: "2 pending", variant: "mint" as const },
];

export function DemoStatsSection() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STAT_ITEMS.map((item, index) => (
        <div key={item.label} className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-tile border border-brand-500/35 bg-brand-500/[0.08] text-brand-400">
              <div className="h-5 w-5" />
            </div>
            <span className="data-label truncate">{item.label}</span>
          </div>
          <span className="figure text-[25px] text-text">
            {item.value}
          </span>
          {item.note && (
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
              {item.note}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}