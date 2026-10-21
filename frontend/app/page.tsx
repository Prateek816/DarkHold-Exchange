"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";
import { TheSeal } from "@/components/ui/TheSeal";
import { TheWard } from "@/components/ui/TheWard";
import { SimBadge } from "@/components/ui/SimBadge";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Gavel,
  Zap,
  Activity,
  Terminal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const tickerItems = [
    { symbol: "DKH-FEST", price: 26850, change: 4.8 },
    { symbol: "MNR-GA", price: 19400, change: 2.1 },
    { symbol: "DKH-HOOD", price: 14200, change: -1.4 },
    { symbol: "SGL-PIN", price: 4800, change: 8.5 },
  ];

  return (
    <div className="flex-1 flex flex-col font-sans text-xs">
      {/* Live Ticker Strip */}
      <div className="w-full border-b border-white/8 bg-white/[0.015] backdrop-blur-[16px] py-2.5 px-4 overflow-x-auto select-none">
        <div className="flex items-center justify-center gap-8 min-w-max mx-auto text-xs">
          <span className="flex items-center gap-1.5 text-text-dim uppercase text-[10px] tracking-wider font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse shadow-[0_0_6px_#22C55E]" />
            <span>Tape</span>
          </span>
          {tickerItems.map((item) => (
            <div key={item.symbol} className="flex items-center gap-2 font-mono text-xs">
              <span className="font-semibold text-white">{item.symbol}</span>
              <span className="text-text-muted tabular-nums">{formatCurrency(item.price)}</span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  item.change >= 0 ? "text-buy" : "text-sell"
                )}
              >
                {formatPercent(item.change)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[11px] text-text-dim">
            <SimBadge label="SIM" size="sm" />
            <span>Live simulated bots active</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="px-4 py-16 sm:py-24 max-w-5xl mx-auto w-full text-center space-y-8 flex flex-col items-center">
        {/* Obsidian Glass Sigil Icon */}
        <div className="w-16 h-16 rounded-20 border border-brand-500/30 bg-gradient-to-br from-brand-500/15 via-white/[0.04] to-violet-500/10 flex items-center justify-center shadow-[0_0_35px_rgba(25,203,176,0.3)] backdrop-blur-[18px]">
          <div className="w-8 h-8 border-2 border-brand-400 rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(25,203,176,0.5)]">
            <div className="w-2.5 h-2.5 bg-brand-300 rounded-full" />
          </div>
        </div>

        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-warning/30 bg-warning/10 text-xs text-warning font-medium">
            <span className="w-2 h-2 rounded-full bg-warning shadow-[0_0_6px_#F5B544]" />
            <span>Anti-Scalping Invariant Enforced</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            THE DARKHOLD EXCHANGE
          </h1>

          <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto leading-relaxed">
            A ceremonial marketplace for festival passes and limited merch.
            Every transaction settles through an immutable double-entry ledger.
            Scalping is mathematically eradicated by <strong className="text-warning font-mono">The Ward</strong>.
          </p>
        </div>

        {/* Hero CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/market"
            className="flex items-center gap-2 px-6 py-3.5 rounded-12 bg-brand-500 hover:bg-brand-400 text-bg font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_24px_rgba(25,203,176,0.4)]"
          >
            <span>Enter Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/trade/DARKHOLD-PASS-2026"
            className="flex items-center gap-2 px-6 py-3.5 rounded-12 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs sm:text-sm transition-all shadow-[0_10px_25px_-10px_rgba(0,0,0,0.5)]"
          >
            <Terminal className="w-4 h-4 text-brand-400" />
            <span>Live Terminal</span>
          </Link>

          <Link
            href="/demo"
            className="flex items-center gap-2 px-6 py-3.5 rounded-12 bg-white/[0.02] hover:bg-white/[0.06] border border-white/8 text-text-muted hover:text-white text-xs sm:text-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-warning" />
            <span>Operator Console</span>
          </Link>
        </div>

        {/* Disclaimer Notice */}
        <div className="p-3.5 rounded-16 bg-white/[0.025] border border-white/8 text-xs text-text-dim max-w-md">
          Simulated market environment. All funds are simulated credits. Trades involve simulated bot counterparties.
        </div>
      </section>

      {/* Three Value Points */}
      <section className="px-4 py-12 max-w-6xl mx-auto w-full border-t border-white/8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-3 shadow-[0_16px_36px_-15px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <div className="w-9 h-9 rounded-12 border border-warning/30 bg-warning/10 flex items-center justify-center text-warning">
              <TheWard ceilingPrice={27500} faceValue={25000} ceilingPct={110} variant="badge" />
            </div>
            <h3 className="text-base font-semibold text-white pt-1">
              Inviolable Price Ceilings
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Resale caps are strictly bound to face value. Orders exceeding the ceiling are rejected by the matching engine before entry.
            </p>
          </div>

          <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-3 shadow-[0_16px_36px_-15px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <div className="w-9 h-9 rounded-12 border border-buy/30 bg-buy-tint flex items-center justify-center text-buy">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white pt-1">
              Breathing Order Book Depth
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Real-time bids and asks at 10 updates per second. Full transparency into resting orders, spread dynamics, and market depth.
            </p>
          </div>

          <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-3 shadow-[0_16px_36px_-15px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <div className="w-9 h-9 rounded-12 border border-warning/30 bg-warning/10 flex items-center justify-center text-warning">
              <Gavel className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white pt-1">
              Hourglass Dutch Auctions
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Limited relic drops decay along mathematical curves until accepted. Guaranteed fairness without gas wars or frontrunning.
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Landing Scroll Story: Reserve -> Match -> Settle */}
      <section className="px-4 py-16 max-w-5xl mx-auto w-full border-t border-white/8 space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-[11px] uppercase tracking-widest text-text-dim font-semibold">
            The Grimoire Protocol
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Reserve &rarr; Match &rarr; Settle
          </h2>
          <p className="text-xs text-text-muted">
            Every trade is a small ritual governed by three immutable state transitions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1: Reserve */}
          <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim uppercase font-mono font-semibold tracking-wider">Phase 01</span>
              <Lock className="w-4 h-4 text-warning" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">1. The Vault Lock</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Before an order touches the book, exact credits or units are locked into the Vault reservation. 100% backed solvency.
              </p>
            </div>
            <div className="pt-3 border-t border-white/6">
              <TheSeal orderStatus="OPEN" settlementStatus="PENDING" showLabel size="sm" />
            </div>
          </div>

          {/* Step 2: Match */}
          <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim uppercase font-mono font-semibold tracking-wider">Phase 02</span>
              <Zap className="w-4 h-4 text-brand-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">2. In-Memory Crossing</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                The matching tree crosses bids and asks with microsecond latency. Matches are immediate and final.
              </p>
            </div>
            <div className="pt-3 border-t border-white/6">
              <TheSeal orderStatus="PARTIALLY_FILLED" settlementStatus="PENDING" showLabel size="sm" />
            </div>
          </div>

          {/* Step 3: Settle */}
          <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim uppercase font-mono font-semibold tracking-wider">Phase 03</span>
              <ShieldCheck className="w-4 h-4 text-buy" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">3. Ledger Commitment</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Funds and units atomically transfer on the double-entry ledger. Receipt IDs and before/after balances are sealed.
              </p>
            </div>
            <div className="pt-3 border-t border-white/6">
              <TheSeal orderStatus="FILLED" settlementStatus="COMPLETED" showLabel size="sm" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
