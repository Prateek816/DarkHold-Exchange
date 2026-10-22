"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddressChip } from "@/components/ui/AddressChip";
import { LivePill } from "@/components/ui/LivePill";
import { GaugeBar } from "@/components/ui/GaugeBar";
import { DotMatrixChart } from "@/components/charts/DotMatrixChart";
import { AreaGlowChart } from "@/components/charts/AreaGlowChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { Drawer } from "@/components/ui/Drawer";
import {
  Shield,
  Activity,
  Sparkles,
  Gavel,
  TrendingUp,
} from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">
      <span className="h-px w-5 bg-gradient-to-r from-brand-500/80 to-transparent" />
      {children}
    </h2>
  );
}

export default function DevThemePage() {
  const [activeTab, setActiveTab] = useState("LIMIT");
  const [activeBuySell, setActiveBuySell] = useState("BUY");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const demoChartData = [
    { label: "10:00", value: 25000 },
    { label: "10:15", value: 25800 },
    { label: "10:30", value: 25400 },
    { label: "10:45", value: 26200 },
    { label: "11:00", value: 26850 },
  ];

  const demoDotColumns = [
    { id: "1", label: "1h", value: 4 },
    { id: "2", label: "2h", value: 7 },
    { id: "3", label: "3h", value: 3 },
    { id: "4", label: "4h", value: 9 },
    { id: "5", label: "5h", value: 5 },
    { id: "6", label: "6h", value: 8 },
    { id: "7", label: "7h", value: 12 },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Design system · internal"
        title="Obsidian glass"
        description="Visual verification of primitives, surfaces, typography, motion, and the glassmorphism recipe."
        icon={Sparkles}
        badge={
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-300">
            DEV ONLY
          </span>
        }
        actions={
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-[11px] bg-gradient-to-r from-brand-400 to-brand-500 px-4 py-2.5 text-[11.5px] font-bold text-canvas shadow-[0_8px_24px_-8px_rgba(25,203,176,0.55)] transition-all hover:-translate-y-px hover:shadow-glow-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            Test drawer
          </button>
        }
      />

      {/* 1. StatCards */}
      <section className="space-y-4">
        <SectionLabel>01. StatCards & delta treatments</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            iconVariant="teal"
            label="Last price"
            value="$268.50"
            delta={4.8}
            glowEdge="teal"
            subValue="Volume 24h: 382 passes"
          />
          <StatCard
            icon={Activity}
            iconVariant="sell"
            label="Hoodie index"
            value="$142.00"
            delta={-1.4}
            glowEdge="sell"
            subValue="Ask depth: 12 units"
          />
          <StatCard
            icon={Shield}
            iconVariant="violet"
            label="Vault reserve"
            value="$5,000.00"
            delta={0.0}
            glowEdge="violet"
            subValue="100% solvency backed"
          />
          <StatCard
            icon={Gavel}
            iconVariant="amber"
            label="Dutch drop"
            value="$258.00"
            delta={-8.5}
            subValue="Floor $240.00 · Cap $275.00"
          />
        </div>
      </section>

      {/* 2. Tabs, pills, chips */}
      <section className="space-y-4">
        <SectionLabel>02. Segmented tabs, live pills & address chips</SectionLabel>
        <GlassCard className="flex flex-wrap items-center gap-6 p-6">
          <SegmentedTabs
            tabs={[
              { id: "LIMIT", label: "Limit order" },
              { id: "MARKET", label: "Market fill" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
            variant="brand"
            layoutId="theme-order-tab"
          />

          <SegmentedTabs
            tabs={[
              { id: "BUY", label: "Buy asset" },
              { id: "SELL", label: "Sell asset" },
            ]}
            activeId={activeBuySell}
            onChange={setActiveBuySell}
            variant="buy-sell"
            layoutId="theme-side-tab"
          />

          <div className="flex items-center gap-2">
            <LivePill state="LIVE" />
            <LivePill state="RECONNECTING" />
            <LivePill state="DISCONNECTED" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AddressChip value="ORD-849201" label="Order" />
            <AddressChip value="LTX-99481203" label="Ledger tx" truncate />
          </div>
        </GlassCard>
      </section>

      {/* 3. Status pills and gauges */}
      <section className="space-y-4">
        <SectionLabel>03. Status pills & two-tone gauge bars</SectionLabel>
        <GlassCard className="space-y-6 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="SETTLED" />
            <StatusPill status="MATCHED_SETTLING" />
            <StatusPill status="OPEN" />
            <StatusPill status="PARTIALLY_FILLED" />
            <StatusPill status="CANCELED" />
            <StatusPill status="REJECTED" />
            <StatusPill status="SIM" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <GaugeBar
              valuePct={75}
              secondaryPct={15}
              leftLabel="Available"
              leftValue="$4,470.00"
              rightLabel="Reserved"
              rightValue="$530.00"
              variant="brand-violet"
            />
            <GaugeBar
              valuePct={88}
              leftLabel="Face $250.00"
              leftValue="Current $268.50"
              rightLabel="Ward cap"
              rightValue="$275.00"
              variant="ward"
            />
          </div>
        </GlassCard>
      </section>

      {/* 4. Charts */}
      <section className="space-y-4">
        <SectionLabel>04. Glowing curves & dot-matrix columns</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GlassCard className="space-y-4 p-6">
            <SectionHeader
              title="Monotone area glow"
              subtitle="SVG glow filter plus a fading area fill."
            />
            <AreaGlowChart data={demoChartData} color="teal" height={160} />
          </GlassCard>

          <GlassCard className="space-y-4 p-6">
            <SectionHeader
              title="Dot-matrix columns"
              subtitle="Brand dots for history, lime for the latest window."
            />
            <DotMatrixChart columns={demoDotColumns} maxRows={10} />
          </GlassCard>
        </div>
      </section>

      {/* 5. Typography */}
      <section className="space-y-4">
        <SectionLabel>05. Type system</SectionLabel>
        <GlassCard className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
          <div className="space-y-2">
            <span className="data-label block">Display · Sora</span>
            <p className="font-display text-[28px] font-semibold leading-tight tracking-tight text-text">
              The Grimoire Ledger
            </p>
            <p className="text-[11.5px] leading-relaxed text-text-muted">
              Headlines, page titles, and the largest numeric moments use Sora.
            </p>
          </div>

          <div className="space-y-2">
            <span className="data-label block">UI · Plus Jakarta Sans</span>
            <p className="text-[15px] font-medium leading-snug text-text">
              Sealed trades, verified balances, and dutch auctions without the noise.
            </p>
            <p className="text-[11.5px] leading-relaxed text-text-muted">
              Body copy, labels, controls, and descriptions use Plus Jakarta Sans.
            </p>
          </div>

          <div className="space-y-2">
            <span className="data-label block">Data · JetBrains Mono</span>
            <p className="font-mono text-[13px] leading-relaxed text-text">
              LTX-9948-1203 · $268.50 · +4.8%
            </p>
            <p className="text-[11.5px] leading-relaxed text-text-muted">
              Prices, quantities, IDs, and timestamps use JetBrains Mono.
            </p>
          </div>
        </GlassCard>
      </section>

      {/* 6. Skeletons */}
      <section className="space-y-4">
        <SectionLabel>06. Shimmer glass skeletons</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </section>

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ledger settlement receipt"
        subtitle="Cryptographically verified on the Darkhold double-entry ledger."
      >
        <AddressChip value="LTX-8849201" label="Ledger tx" />
        <div className="space-y-2.5 rounded-panel border border-glass-border bg-white/[0.02] p-4">
          <div className="flex justify-between gap-3">
            <span className="text-[11.5px] text-text-muted">Asset</span>
            <span className="text-right text-[11.5px] font-medium text-text">
              Darkhold Fest Weekend Pass
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[11.5px] text-text-muted">Quantity</span>
            <span className="font-mono text-[11.5px] text-text">1 unit</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-glass-border pt-2.5">
            <span className="text-[11.5px] text-text-muted">Settled cost</span>
            <span className="font-mono text-[12px] font-bold text-brand-400">$265.00</span>
          </div>
        </div>
        <StatusPill status="SETTLED" label="Settlement completed · 0ms drift" />
      </Drawer>
    </div>
  );
}
