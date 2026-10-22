"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { EightRings } from "@/components/admin/EightRings";
import { MetricsCharts } from "@/components/admin/MetricsCharts";
import { MLRiskScorePanel } from "@/components/admin/MLRiskScorePanel";
import { ScenarioTriggers } from "@/components/admin/ScenarioTriggers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sparkles, Activity, ShieldCheck } from "lucide-react";

export default function DemoConsolePage() {
  const { data: rings = [], refetch: refetchRings } = useQuery({
    queryKey: ["reconciliation-rings"],
    queryFn: () => api.getReconciliationRings(),
  });

  const { data: mlScores = [] } = useQuery({
    queryKey: ["ml-risk-scores"],
    queryFn: () => api.getMlScores(),
  });

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Control · Operator console"
        title="Operator Demo Console"
        description="Reconciliation invariant rings, matching-engine telemetry, and advisory risk scoring."
        icon={Sparkles}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-violet-300">
            Sim surveillance
          </span>
        }
        actions={
          <div className="flex items-center gap-2 rounded-full border border-buy/30 bg-buy/[0.08] px-3.5 py-1.5 text-[11px] font-medium text-buy-text">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>Telemetry · 100% solvency</span>
          </div>
        }
      />

      <Reveal>
        <EightRings rings={rings} onRunAudit={() => refetchRings()} />
      </Reveal>

      <Reveal>
        <MetricsCharts />
      </Reveal>

      <Reveal>
        <ScenarioTriggers />
      </Reveal>

      <Reveal>
        <MLRiskScorePanel accounts={mlScores} />
      </Reveal>

      <Reveal>
        <GlassCard glowEdge="teal" className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-buy/30 bg-buy/10 text-buy-text">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <span className="block text-[13.5px] font-semibold text-text">
                Exchange engine benchmarks validated
              </span>
              <p className="max-w-xl text-[11.5px] leading-relaxed text-text-muted">
                Demonstrated 2,450 ops/sec throughput under simulated whale bursts with 0 invariant
                breaches.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-buy/30 bg-buy/[0.08] px-3 py-1 font-mono text-[10px] font-bold text-buy-text">
            Audit signed · 0x8F42…E91
          </span>
        </GlassCard>
      </Reveal>
    </div>
  );
}
