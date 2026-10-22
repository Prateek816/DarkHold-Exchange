"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";
import { TheSeal } from "@/components/ui/TheSeal";
import { TheWard } from "@/components/ui/TheWard";
import { SimBadge } from "@/components/ui/SimBadge";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Gavel,
  Zap,
  Activity,
  Terminal,
  Sparkles,
  ShieldAlert,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TICKER = [
  { symbol: "DKH-FEST", price: 26850, change: 4.8 },
  { symbol: "MNR-GA", price: 19400, change: 2.1 },
  { symbol: "DKH-HOOD", price: 14200, change: -1.4 },
  { symbol: "SGL-PIN", price: 4800, change: 8.5 },
  { symbol: "WARD-IDX", price: 11000, change: 0.0 },
  { symbol: "GILD-PASS", price: 31900, change: -0.6 },
];

const BOOK_ASKS = [
  { price: 26940, qty: 8 },
  { price: 26900, qty: 14 },
  { price: 26880, qty: 6 },
];

const BOOK_BIDS = [
  { price: 26840, qty: 11 },
  { price: 26800, qty: 19 },
  { price: 26760, qty: 7 },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 sm:gap-12">
      {/* ================= LIVE TAPE ================= */}
      <div className="marquee-mask relative overflow-hidden rounded-[14px] border border-glass-border bg-white/[0.018] backdrop-blur-[16px]">
        <div className="marquee-track py-2.5">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-8 pr-8"
            >
              <span className="flex items-center gap-2 pl-4 font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-buy opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-buy" />
                </span>
                Live tape
              </span>

              {TICKER.map((item) => (
                <div key={`${copy}-${item.symbol}`} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="font-semibold tracking-wide text-text">{item.symbol}</span>
                  <span className="tabular-nums text-text-muted">{formatCurrency(item.price)}</span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 tabular-nums",
                      item.change >= 0 ? "text-buy-text" : "text-sell-text"
                    )}
                  >
                    <ArrowUpRight
                      className={cn("h-2.5 w-2.5", item.change < 0 && "rotate-90")}
                      strokeWidth={2.5}
                    />
                    {formatPercent(item.change)}
                  </span>
                </div>
              ))}

              <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-dim">
                <SimBadge label="SIM" size="sm" />
                simulated counterparties active
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= HERO ================= */}
      <section className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-1 py-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-10">
        {/* Aurora */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(25,203,176,0.16),transparent_65%)] blur-2xl"
        />

        <div className="relative z-10 flex flex-col items-start gap-6">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/[0.08] px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-warning">
              <ShieldAlert className="h-3 w-3" />
              Anti-scalping invariant · enforced
              <span className="ml-1 h-1 w-1 rounded-full bg-warning/70" />
            </span>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="font-display text-[44px] font-bold leading-[0.98] tracking-[-0.04em] text-text sm:text-6xl lg:text-[68px]">
              The Darkhold
              <span className="block text-gradient-brand">Exchange.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="max-w-xl text-[14px] leading-relaxed text-text-muted sm:text-[15px]">
              A ceremonial marketplace for festival passes and limited relics. Every credit is
              backed, every price ceiling is enforced by protocol, and every settlement is sealed
              on an immutable double-entry ledger.
            </p>
          </Reveal>

          <Reveal delay={0.18} className="w-full">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/market"
                className="group flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-brand-400 to-brand-500 px-5 py-3 text-[12.5px] font-bold text-canvas shadow-[0_10px_32px_-8px_rgba(25,203,176,0.55)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_16px_40px_-8px_rgba(25,203,176,0.65)]"
              >
                Enter the marketplace
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/trade/DARKHOLD-PASS-2026"
                className="group flex items-center gap-2 rounded-[12px] border border-glass-border bg-white/[0.04] px-5 py-3 text-[12.5px] font-semibold text-text transition-all duration-300 hover:-translate-y-px hover:border-brand-500/35 hover:bg-white/[0.07]"
              >
                <Terminal className="h-4 w-4 text-brand-400" />
                Open terminal
                <span className="ml-1 rounded-full border border-buy/30 bg-buy/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-buy-text">
                  live
                </span>
              </Link>

              <Link
                href="/demo"
                className="flex items-center gap-1.5 px-2 py-3 text-[12px] font-medium text-text-dim transition-colors hover:text-text"
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                Operator console
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.24} className="w-full">
            <div className="mt-2 grid w-full max-w-lg grid-cols-3 divide-x divide-white/[0.07] rounded-[14px] border border-glass-border bg-white/[0.02] py-3 backdrop-blur-md">
              {[
                { value: "0%", label: "Scalpable supply" },
                { value: "10/s", label: "Book updates" },
                { value: "100%", label: "Backed solvency" },
              ].map((stat) => (
                <div key={stat.label} className="px-4">
                  <p className="font-display text-lg font-semibold tracking-tight text-text">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Terminal preview */}
        <Reveal delay={0.2} y={26} className="relative z-10 w-full">
          <div className="absolute -right-3 -top-4 z-20 hidden rotate-2 sm:block">
            <span className="flex items-center gap-1.5 rounded-full border border-warning/35 bg-canvas-elevated/95 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-warning shadow-glow-ward backdrop-blur-md">
              <ShieldAlert className="h-3 w-3" />
              The Ward · active
            </span>
          </div>

          <GlassCard
            sheen
            hoverLift={false}
            className="border-glass-border-strong p-4 sm:p-5"
          >
            {/* Preview header */}
            <div className="flex items-center justify-between gap-3 border-b border-glass-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-brand-500/30 bg-brand-500/10 text-brand-400">
                  <Gavel className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="font-display text-[12px] font-semibold tracking-tight text-text">
                    DARKHOLD-PASS-2026
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                    Festival pass · tier I
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-buy/30 bg-buy/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-buy-text">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> live
              </span>
            </div>

            {/* Price */}
            <div className="flex items-end justify-between gap-3 py-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                  Last traded
                </p>
                <p className="pt-1 font-display text-[30px] font-semibold leading-none tracking-tight text-text tabular-nums sm:text-[34px]">
                  {formatCurrency(26850)}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-buy/30 bg-buy/10 px-2 py-1 font-mono text-[11px] text-buy-text">
                <ArrowUpRight className="h-3 w-3" /> +4.8%
              </div>
            </div>

            {/* Book */}
            <div className="overflow-hidden rounded-[12px] border border-glass-border bg-white/[0.015]">
              <div className="grid grid-cols-3 border-b border-glass-border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-text-dim">
                <span>Side</span>
                <span className="text-right">Price</span>
                <span className="text-right">Qty</span>
              </div>

              {BOOK_ASKS.map((row) => (
                <div
                  key={row.price}
                  className="relative grid grid-cols-3 px-3 py-1 font-mono text-[10.5px]"
                >
                  <span className="absolute inset-y-0 right-0 bg-sell/[0.07]" style={{ width: `${row.qty * 4}%` }} />
                  <span className="relative z-10 text-sell-text/90">Ask</span>
                  <span className="relative z-10 text-right tabular-nums text-sell-text">
                    {formatCurrency(row.price)}
                  </span>
                  <span className="relative z-10 text-right tabular-nums text-text-muted">{row.qty}</span>
                </div>
              ))}

              <div className="flex items-center justify-between border-y border-glass-border bg-white/[0.02] px-3 py-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
                  Spread
                </span>
                <span className="font-mono text-[10px] font-semibold tabular-nums text-text">
                  {formatCurrency(26940 - 26840)} · 0.37%
                </span>
              </div>

              {BOOK_BIDS.map((row) => (
                <div
                  key={row.price}
                  className="relative grid grid-cols-3 px-3 py-1 font-mono text-[10.5px]"
                >
                  <span className="absolute inset-y-0 right-0 bg-buy/[0.07]" style={{ width: `${row.qty * 4}%` }} />
                  <span className="relative z-10 text-buy-text/90">Bid</span>
                  <span className="relative z-10 text-right tabular-nums text-buy-text">
                    {formatCurrency(row.price)}
                  </span>
                  <span className="relative z-10 text-right tabular-nums text-text-muted">{row.qty}</span>
                </div>
              ))}
            </div>

            {/* Ward + seal */}
            <div className="mt-3.5 flex items-center justify-between gap-3">
              <TheWard ceilingPrice={27500} faceValue={25000} ceilingPct={110} />
              <TheSeal orderStatus="OPEN" settlementStatus="PENDING" showLabel size="sm" />
            </div>
          </GlassCard>
        </Reveal>
      </section>

      {/* ================= VALUE PROPS ================= */}
      <section className="mx-auto w-full max-w-[1200px] px-1">
        <Reveal>
          <div className="flex flex-col gap-2 pb-6">
            <span className="eyebrow">Why this exchange exists</span>
            <h2 className="max-w-2xl text-[26px] font-semibold tracking-tight text-text sm:text-[32px]">
              Built so the crowd never loses to the bot.
            </h2>
          </div>
        </Reveal>

        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3" stagger={0.08}>
          {[
            {
              icon: ShieldAlert,
              variant: "amber" as const,
              title: "Inviolable price ceilings",
              body: "Resale caps are bound to face value by protocol. Any order above the ceiling is rejected before it ever touches the book.",
              footer: "The Ward",
            },
            {
              icon: Activity,
              variant: "teal" as const,
              title: "Breathing order-book depth",
              body: "Bids and asks stream at ten updates per second with full transparency into resting orders, spread dynamics, and depth.",
              footer: "Always visible",
            },
            {
              icon: Gavel,
              variant: "violet" as const,
              title: "Hourglass Dutch auctions",
              body: "Limited relic drops descend along mathematical curves until accepted. Fair price discovery without gas wars or frontrunning.",
              footer: "No sniping",
            },
          ].map((card) => (
            <StaggerItem key={card.title}>
              <GlassCard sheen className="group h-full p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <IconTile icon={card.icon} variant={card.variant} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                    {card.footer}
                  </span>
                </div>

                <h3 className="pt-5 text-[15px] font-semibold tracking-tight text-text">
                  {card.title}
                </h3>
                <p className="pt-2 text-[12.5px] leading-relaxed text-text-muted">{card.body}</p>

                <div className="mt-5 h-px w-full bg-gradient-to-r from-white/[0.1] to-transparent transition-all duration-500 group-hover:from-brand-500/50" />
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ================= PROTOCOL STORY ================= */}
      <section className="mx-auto w-full max-w-[1200px] px-1 py-2">
        <div className="relative overflow-hidden rounded-[24px] border border-glass-border bg-gradient-to-b from-white/[0.035] to-white/[0.008] p-6 backdrop-blur-[16px] sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-aurora rounded-full bg-violet-500/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-brand-500/[0.07] blur-3xl"
          />

          <Reveal>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl space-y-2">
                <span className="eyebrow flex items-center gap-2">
                  <span className="h-px w-5 bg-brand-500/60" />
                  The Grimoire protocol
                </span>
                <h2 className="text-[26px] font-semibold tracking-tight text-text sm:text-[32px]">
                  Reserve <span className="text-brand-400">→</span> Match{" "}
                  <span className="text-brand-400">→</span> Settle
                </h2>
                <p className="text-[12.5px] leading-relaxed text-text-muted">
                  Every trade is a small ritual governed by three immutable state transitions.
                </p>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-glass-border bg-white/[0.03] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim sm:flex">
                <ShieldCheck className="h-3 w-3 text-brand-400" /> ledger-enforced
              </span>
            </div>
          </Reveal>

          <div className="relative mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              aria-hidden="true"
              className="absolute left-[12%] right-[12%] top-[38px] hidden border-t border-dashed border-white/[0.1] md:block"
            />

            {[
              {
                phase: "01",
                title: "The Vault Lock",
                icon: Lock,
                color: "text-warning",
                ring: "border-warning/30 bg-warning/10",
                body: "Before an order touches the book, exact credits or units are reserved. 100% backed solvency at all times.",
                seal: <TheSeal orderStatus="OPEN" settlementStatus="PENDING" showLabel size="sm" />,
              },
              {
                phase: "02",
                title: "In-memory crossing",
                icon: Zap,
                color: "text-brand-400",
                ring: "border-brand-500/30 bg-brand-500/10",
                body: "The matching tree crosses bids and asks with microsecond latency. Matches are immediate and final.",
                seal: (
                  <TheSeal orderStatus="PARTIALLY_FILLED" settlementStatus="PENDING" showLabel size="sm" />
                ),
              },
              {
                phase: "03",
                title: "Ledger commitment",
                icon: ShieldCheck,
                color: "text-buy-text",
                ring: "border-buy/30 bg-buy/10",
                body: "Funds and units transfer atomically. Receipt IDs and before/after balances are sealed forever.",
                seal: <TheSeal orderStatus="FILLED" settlementStatus="COMPLETED" showLabel size="sm" />,
              },
            ].map((step, i) => (
              <Reveal key={step.phase} delay={0.08 * i}>
                <div className="relative h-full space-y-4 rounded-[18px] border border-glass-border bg-canvas/50 p-5 transition-colors duration-300 hover:border-glass-border-strong">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-[11px] border",
                        step.ring
                      )}
                    >
                      <step.icon className={cn("h-4 w-4", step.color)} strokeWidth={1.8} />
                    </span>
                    <span className="font-display text-2xl font-bold tracking-tight text-white/[0.08]">
                      {step.phase}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-[13.5px] font-semibold tracking-tight text-text">
                      {step.title}
                    </h3>
                    <p className="text-[12px] leading-relaxed text-text-muted">{step.body}</p>
                  </div>

                  <div className="border-t border-glass-border pt-3">{step.seal}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CLOSING CTA ================= */}
      <section className="mx-auto w-full max-w-[1200px] px-1 pb-2">
        <Reveal>
          <div className="relative overflow-hidden rounded-[24px] border border-brand-500/20 bg-gradient-to-r from-brand-500/[0.09] via-canvas-elevated to-violet-500/[0.09] p-7 sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,92,255,0.16),transparent_60%)]"
            />
            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="space-y-2">
                <span className="eyebrow">The gates are open</span>
                <h2 className="max-w-md text-[26px] font-semibold leading-tight tracking-tight text-text sm:text-[30px]">
                  Step inside the exchange.
                </h2>
                <p className="max-w-md text-[12.5px] leading-relaxed text-text-muted">
                  Five thousand simulated credits. Four tradable assets. One protocol that keeps
                  scalping mathematically impossible.
                </p>
              </div>

              <Link
                href="/market"
                className="group flex shrink-0 items-center gap-2 rounded-[12px] bg-gradient-to-r from-brand-400 to-brand-500 px-5 py-3 text-[12.5px] font-bold text-canvas shadow-[0_10px_32px_-8px_rgba(25,203,176,0.55)] transition-all duration-300 hover:-translate-y-px"
              >
                Start trading
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </Reveal>

        <p className="mx-auto mt-5 max-w-2xl text-center text-[10.5px] leading-relaxed text-text-dim">
          Simulated market environment. All funds are simulated credits. Trades involve simulated
          bot counterparties and do not represent real financial activity.
        </p>
      </section>
    </div>
  );
}
