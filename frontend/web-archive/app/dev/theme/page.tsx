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
import { SimBadge } from "@/components/ui/SimBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { TheSeal } from "@/components/ui/TheSeal";
import { Activity, Gavel, Sparkles, TrendingUp } from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="eyebrow flex items-center gap-2.5">
      <span className="h-px w-5 bg-brass/60" style={{ backgroundColor: "var(--brass)" }} />
      {children}
    </h2>
  );
}

export default function DevThemePage() {
  const [activeTab, setActiveTab] = useState("LIMIT");
  const [activeBuySell, setActiveBuySell] = useState("BUY");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="page-shell">
      <PageHeader
        title="Night box office"
        description="Layout verification for the Arcane Obsidian primitives. Every value on this page is placeholder text, not venue data."
        icon={Sparkles}
        badge={<SimBadge label="SAMPLE VALUES" size="md" />}
        actions={
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="border border-glass-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text"
          >
            Open drawer
          </button>
        }
      />

      <section className="space-y-4">
        <SectionLabel>01. Type system</SectionLabel>
        <GlassCard className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
          <div className="space-y-2">
            <span className="data-label block">Words · Fraunces</span>
            <p className="font-display text-[30px] leading-none text-text">The Dutch room</p>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Headlines and editorial moments. Optically sized and wonked.
            </p>
          </div>
          <div className="space-y-2">
            <span className="data-label block">Interface · Instrument Sans</span>
            <p className="text-[14px] leading-snug text-text">
              Wording, controls and explanations. Plain sentences, no venue claims.
            </p>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Selects, buttons, labels and body copy.
            </p>
          </div>
          <div className="space-y-2">
            <span className="data-label block">Numbers · IBM Plex Mono</span>
            <p className="font-mono text-[13px] leading-relaxed tabular-nums text-text">
              LTX-SAMPLE-0001 · $000.00 · 000 units
            </p>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Identifiers, money, quantities and every large figure.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <span className="data-label block">Readout figures</span>
            <p className="figure text-[40px] text-text">$000.00</p>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Serif for words, mono for numbers, sans for everything else. A price should
              look like a value on an instrument.
            </p>
          </div>
          <div className="space-y-2">
            <span className="data-label block">Keyline</span>
            <span className="keyline">Regional identifier</span>
            <p className="pt-2 text-[11px] leading-relaxed text-text-muted">
              A structural label that names a region of the interface. It does not
              decorate, and it does not sit above every heading.
            </p>
          </div>
        </GlassCard>
      </section>

      <section className="space-y-4">
        <SectionLabel>02. Stat cards</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={TrendingUp} label="Sample metric" value="$000.00" subValue="Placeholder only" />
          <StatCard
            icon={Activity}
            label="Sample delta"
            value="$000.00"
            delta={1.2}
            subValue="Placeholder only"
          />
          <StatCard
            icon={Gavel}
            label="Sample lot"
            value="$000.00"
            delta={-1.2}
            subValue="Placeholder only"
          />
          <StatCard icon={Sparkles} label="Sample state" value="—" subValue="Placeholder only" />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel>03. Tabs, pills and chips</SectionLabel>
        <GlassCard className="flex flex-wrap items-center gap-6 p-6">
          <SegmentedTabs
            tabs={[
              { id: "LIMIT", label: "Limit order" },
              { id: "MARKET", label: "Market order" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
            layoutId="theme-order-tab"
          />

          <SegmentedTabs
            tabs={[
              { id: "BUY", label: "Buy" },
              { id: "SELL", label: "Sell" },
            ]}
            activeId={activeBuySell}
            onChange={setActiveBuySell}
            variant="buy-sell"
            layoutId="theme-side-tab"
          />

          <div className="flex flex-wrap items-center gap-2">
            <LivePill state="LIVE" />
            <LivePill state="RECONNECTING" />
            <LivePill state="DISCONNECTED" />
            <SimBadge label="SIM" size="sm" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AddressChip value="ORD-SAMPLE-01" label="Order" />
            <AddressChip value="LTX-SAMPLE-0001" label="Ledger tx" truncate />
          </div>
        </GlassCard>
      </section>

      <section className="space-y-4">
        <SectionLabel>04. State marks and meters</SectionLabel>
        <GlassCard className="space-y-6 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="SETTLED" />
            <StatusPill status="MATCHED_SETTLING" />
            <StatusPill status="OPEN" />
            <StatusPill status="PARTIALLY_FILLED" />
            <StatusPill status="CANCELED" />
            <StatusPill status="REJECTED" />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {[
              { orderStatus: "OPEN", settlementStatus: "PENDING" },
              { orderStatus: "PARTIALLY_FILLED", settlementStatus: "PENDING" },
              { orderStatus: "FILLED", settlementStatus: "PENDING" },
              { orderStatus: "FILLED", settlementStatus: "COMPLETED" },
              { orderStatus: "CANCELED", settlementStatus: "COMPLETED" },
              { orderStatus: "REJECTED", settlementStatus: "FAILED" },
            ].map((sample) => (
              <TheSeal
                key={`${sample.orderStatus}-${sample.settlementStatus}`}
                orderStatus={sample.orderStatus as any}
                settlementStatus={sample.settlementStatus as any}
                showLabel
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <GaugeBar
              valuePct={72}
              secondaryPct={14}
              leftLabel="Available"
              leftValue="$000.00"
              rightLabel="Reserved"
              rightValue="$000.00"
              variant="brand"
            />
            <GaugeBar
              valuePct={88}
              secondaryPct={6}
              leftLabel="Price"
              leftValue="$000.00"
              rightLabel="Cap"
              rightValue="$000.00"
              variant="ward"
            />
          </div>
        </GlassCard>
      </section>

      <section className="space-y-4">
        <SectionLabel>05. Section header and skeleton</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GlassCard className="p-6">
            <SectionHeader
              title="Panel header"
              subtitle="Placeholder subtitle for layout inspection."
              actions={<SimBadge label="SIM" size="sm" />}
              showMenuButton
            />
          </GlassCard>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </section>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Drawer sample"
        subtitle="Placeholder content only. Nothing here is loaded from a server."
      >
        <AddressChip value="LTX-SAMPLE-0001" label="Ledger tx" />
        <div className="space-y-2.5 border border-glass-border p-4">
          <div className="flex justify-between gap-3">
            <span className="text-[11.5px] text-text-muted">Asset</span>
            <span className="text-right text-[11.5px] text-text">Sample object</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[11.5px] text-text-muted">Quantity</span>
            <span className="font-mono text-[11.5px] text-text">0 units</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-glass-border pt-2.5">
            <span className="text-[11.5px] text-text-muted">Settled cost</span>
            <span className="font-mono text-[12px] tabular-nums text-text">$000.00</span>
          </div>
        </div>
        <StatusPill status="SETTLED" label="Settlement completed in mock" />
      </Drawer>
    </div>
  );
}
