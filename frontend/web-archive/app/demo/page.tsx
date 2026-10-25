"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { DemoStatsSection } from "@/components/demo/DemoStatsSection";
import { DemoChartsSection } from "@/components/demo/DemoChartsSection";
import { DemoLimitsSection } from "@/components/demo/DemoLimitsSection";
import { MLRiskScorePanel } from "@/components/admin/MLRiskScorePanel";
import { EightRings } from "@/components/admin/EightRings";
import { ScenarioTriggers } from "@/components/admin/ScenarioTriggers";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SimBadge } from "@/components/ui/SimBadge";
import { Gavel, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DemoConsolePage() {
  const { data: rings = [], isLoading: ringsLoading } = useQuery({
    queryKey: ["reconciliation-rings"],
    queryFn: () => api.getReconciliationRings(),
    refetchInterval: 15_000,
  });
  const { data: mlScores = [], isLoading: mlLoading } = useQuery({
    queryKey: ["ml-scores"],
    queryFn: () => api.getMlScores(),
    refetchInterval: 15_000,
  });

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight tracking-tight text-text">
            Control room
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
            A readback of the mock exchange: reconciliation invariants, advisory ML risk scores,
            engine metrics and operator scenario controls. Nothing here touches production.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-glass-border bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-buy" />
            SIMULATED VENUE
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
            Mock adapter
          </span>
        </div>
      </div>

      <DemoStatsSection />

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <DemoChartsSection rings={rings} />
        <EightRings rings={rings} onRunAudit={() => {}} />
      </section>

      <section className="mt-12">
        <MLRiskScorePanel accounts={mlScores} />
      </section>

      <section className="mt-12">
        <ScenarioTriggers />
      </section>

      <DemoLimitsSection />

      <p className="mt-12 text-center text-text-muted">
        The console surfaces readback from the in-memory mock server only. All figures are
        simulated; no real venue, exchange or counterparty is involved.
      </p>
    </div>
  );
}
