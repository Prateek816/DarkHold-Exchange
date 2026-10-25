"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricsCharts } from "@/components/admin/MetricsCharts";
import { cn } from "@/lib/utils";

interface DemoChartsSectionProps {
  rings: any[];
}

export function DemoChartsSection({ rings }: DemoChartsSectionProps) {
  const passedCount = rings.filter((r) => r.passed).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4 lg:col-span-2">
        <MetricsCharts />

        <div className="glass-card p-5 space-y-4" style={{border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(255,255,255,0.065) 6.5%, rgba(255,255,255,0.01) 100%)', backdropFilter: 'blur(18px)'}}>
          <div className="flex items-center justify-between gap-4 border-b border-glass-border pb-4">
            <div>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-brand-400">
                Reconciliation summary
              </span>
              <p className="pt-1 font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-dim">
                All 8 invariants verified against the mock ledger snapshot.
              </p>
            </div>
            <span className="rounded-full border border-buy/30 bg-buy-tint px-2 py-0.5 font-mono text-[9px] font-bold text-buy-text">
              {passedCount} / 8 rings green
            </span>
          </div>

          <dl className="divide-y divide-glass-border/70 space-y-3">
            {[
              { label: "Engine throughput", value: "1,240 ops/s", note: "Peak 1,850" },
              { label: "Match→settle latency", value: "18 ms p50", note: "p99 82 ms" },
              { label: "Book update fanout", value: "3.2 ms p50", note: "p99 11 ms" },
              { label: "Reconciliation pass", value: "All 8 rings green", note: "Last run 04:12" },
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <dt className="text-[10.5px] font-medium text-text">{item.label}</dt>
                  <dd className="pt-0.5 font-mono text-[8.5px] text-text-dim">{item.note}</dd>
                </div>
                <dd className="font-mono text-[11px] tabular-nums text-text">{item.value}</dd>
              </div>
            ))}
          </dl>

          <p className="pt-2 font-mono text-[8.5px] text-text-dim">
            <span className="text-text-muted">Artifact:</span>{" "}
            <span className="link-line">bench-2026-10-22T04-12.json</span>
          </p>
        </div>
      </div>
    </div>
  );
}
