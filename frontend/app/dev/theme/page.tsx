"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DeltaPill } from "@/components/ui/DeltaPill";
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
  Layers,
  Sparkles,
  Gavel,
  Zap,
  TrendingUp,
  FileText,
} from "lucide-react";

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
    <div className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-10">
      <SectionHeader
        icon={Sparkles}
        iconVariant="teal"
        title="Theme Component Kitchen Sink: Obsidian Glass"
        subtitle="Visual verification of all primitives, glow edges, typography scale, and glassmorphism recipe."
        actions={
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-4 py-2 rounded-pill bg-gradient-to-r from-brand-400 to-brand-500 text-canvas font-bold text-xs uppercase tracking-wider shadow-glow-teal hover:opacity-95 transition-all"
          >
            Test Drawer
          </button>
        }
      />

      {/* 1. StatCards & DeltaPills */}
      <section className="space-y-4">
        <h4 className="text-xs uppercase tracking-wider text-text-dim font-mono">
          01. StatCards & DeltaPills
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            iconVariant="teal"
            label="Last Price"
            value="$268.50"
            delta={4.8}
            glowEdge="teal"
            subValue="Volume 24h: 382 passes"
          />
          <StatCard
            icon={Activity}
            iconVariant="sell"
            label="Hoodie Index"
            value="$142.00"
            delta={-1.4}
            glowEdge="sell"
            subValue="Ask depth: 12 units"
          />
          <StatCard
            icon={Shield}
            iconVariant="violet"
            label="Vault Reserve"
            value="$5,000.00"
            delta={0.0}
            glowEdge="violet"
            subValue="100% Solvency Backed"
          />
          <StatCard
            icon={Gavel}
            iconVariant="amber"
            label="Dutch Drop"
            value="$258.00"
            delta={-8.5}
            subValue="Floor: $240.00 (Ceiling $275)"
          />
        </div>
      </section>

      {/* 2. SegmentedTabs & LivePills */}
      <section className="space-y-4">
        <h4 className="text-xs uppercase tracking-wider text-text-dim font-mono">
          02. SegmentedTabs, LivePills & AddressChips
        </h4>
        <div className="p-6 rounded-card border border-glass-border bg-glass-fill flex flex-wrap items-center gap-6">
          <SegmentedTabs
            tabs={[
              { id: "LIMIT", label: "Limit Order" },
              { id: "MARKET", label: "Market Fill" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
            variant="brand"
          />

          <SegmentedTabs
            tabs={[
              { id: "BUY", label: "Buy Asset" },
              { id: "SELL", label: "Sell Asset" },
            ]}
            activeId={activeBuySell}
            onChange={setActiveBuySell}
            variant="buy-sell"
          />

          <div className="flex items-center gap-2">
            <LivePill state="LIVE" />
            <LivePill state="RECONNECTING" />
            <LivePill state="DISCONNECTED" />
          </div>

          <div className="flex items-center gap-2">
            <AddressChip value="ORD-849201" label="Order" />
            <AddressChip value="LTX-99481203" label="Ledger TX" truncate />
          </div>
        </div>
      </section>

      {/* 3. StatusPills & GaugeBars */}
      <section className="space-y-4">
        <h4 className="text-xs uppercase tracking-wider text-text-dim font-mono">
          03. StatusPills & Two-Tone GaugeBars
        </h4>
        <div className="p-6 rounded-card border border-glass-border bg-glass-fill space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="SETTLED" />
            <StatusPill status="MATCHED_SETTLING" />
            <StatusPill status="OPEN" />
            <StatusPill status="PARTIALLY_FILLED" />
            <StatusPill status="CANCELED" />
            <StatusPill status="REJECTED" />
            <StatusPill status="SIM" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              rightLabel="Ward Cap"
              rightValue="$275.00"
              variant="ward"
            />
          </div>
        </div>
      </section>

      {/* 4. AreaGlowChart & DotMatrixChart */}
      <section className="space-y-4">
        <h4 className="text-xs uppercase tracking-wider text-text-dim font-mono">
          04. Glowing Curves & Dot-Matrix Bars
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6 space-y-4">
            <SectionHeader title="Monotone Area Glow" subtitle="SVG drop-shadow + fill fade" />
            <AreaGlowChart data={demoChartData} color="teal" height={160} />
          </GlassCard>

          <GlassCard className="p-6 space-y-4">
            <SectionHeader
              title="Dot-Matrix Columns"
              subtitle="3px dots, 5px pitch, latest group in lime #D6F24A"
            />
            <DotMatrixChart columns={demoDotColumns} maxRows={10} />
          </GlassCard>
        </div>
      </section>

      {/* 5. Skeletons */}
      <section className="space-y-4">
        <h4 className="text-xs uppercase tracking-wider text-text-dim font-mono">
          05. Shimmer Glass Skeletons
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </section>

      {/* Test Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ledger Settlement Receipt"
        subtitle="Cryptographically verified on the Darkhold double-entry ledger."
      >
        <div className="space-y-3 font-mono text-xs">
          <AddressChip value="LTX-8849201" label="Ledger TX" />
          <div className="p-4 rounded-panel border border-glass-border bg-white/[0.02] space-y-2">
            <div className="flex justify-between">
              <span className="text-text-muted">Asset</span>
              <span className="text-text font-semibold">Darkhold Fest Weekend Pass</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Quantity</span>
              <span className="text-text">1 unit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Settled Cost</span>
              <span className="text-brand-400 font-bold">$265.00</span>
            </div>
          </div>
          <StatusPill status="SETTLED" label="Settlement Completed (0ms Drift)" />
        </div>
      </Drawer>
    </div>
  );
}
