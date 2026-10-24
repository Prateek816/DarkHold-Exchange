"use client";

import React from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { SimBadge } from "@/components/ui/SimBadge";
import { ShieldCheck, ArrowRight, Sparkles, Layers, Gavel, Wallet as WalletIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function LandingPage() {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/35 blur-[80px]" style={{animation: 'glow-drift-violet 28s ease-in-out infinite alternate'}} />
        <div className="absolute top-[-15%] left-[-10%] h-[420px] w-[700px] rounded-full bg-mint-500/20 blur-[70px]" style={{animation: 'glow-drift-mint 30s ease-in-out infinite alternate-reverse'}} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')] opacity-[0.03]" style={{animation: 'grain-shift 8s steps(10) infinite'}} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] mask-[radial-gradient(ellipse_80%25_60%25_at_50%25_30%25,black_0%,transparent_100%)]" />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col">
        {/* Hero */}
        <section className="relative flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-5xl w-full text-center">
            <SimBadge label="SIMULATED VENUE" size="md" className="mx-auto mb-6" />
            <h1 className="font-display text-[clamp(3.5rem,8vw,7rem)] font-semibold leading-[0.9] tracking-tight text-text">
              The <span className="font-italic text-brand-400">Darkhold</span> Exchange
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-[1.125rem] leading-relaxed text-text-muted">
              A simulated marketplace for festival passes and limited relics. Live order books, Dutch auctions,
              and mock ledger settlement — all in a venue where the only risk is fictional.
            </p>

            {/* Ticker strip */}
            <div className="mt-10 overflow-hidden border-y border-glass-border py-4">
              <div className="marquee-mask">
                <div className="marquee-track" aria-hidden="true">
                  {[
                    { asset: "DARKHOLD-PASS-2026", price: 12500, change: 2.3 },
                    { asset: "MOONRISE-GA-2026", price: 4800, change: -1.1 },
                    { asset: "DARKHOLD-HOODIE-LTD", price: 3200, change: 0.5 },
                    { asset: "SIGIL-COLLECTOR-PIN", price: 850, change: 4.7 },
                  ].flatMap((item, i) => [
                    <span key={`${item.asset}-${i}-a`} className="inline-flex items-center gap-3 px-6 font-mono text-[12px]">
                      <span className="text-brand-400">{item.asset}</span>
                      <span className="tabular-nums text-text">{formatCurrency(item.price)}</span>
                      <span className={item.change >= 0 ? "text-buy" : "text-sell"}>
                        {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.change)}%
                      </span>
                    </span>,
                    <span key={`${item.asset}-${i}-b`} className="inline-flex items-center gap-3 px-6 font-mono text-[12px] text-text-dim">·</span>
                  ])}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/market">
                <PillButton variant="primary" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Enter the Board
                </PillButton>
              </Link>
              <Link href="/login">
                <PillButton variant="outlined" size="lg">
                  Connect Wallet
                </PillButton>
              </Link>
            </div>

            {/* Sim notice */}
            <SimBadge label="Simulated market · Funds are simulated credits · Activity includes simulated traders" size="md" className="mt-8 mx-auto" />
          </div>
        </section>

        {/* Value points */}
        <section className="border-t border-glass-border py-16 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Settlement",
                desc: "Every match flows through the mock ledger: Reserve → Match → Settle. No fill is final until the seal completes.",
              },
              {
                icon: Layers,
                title: "Anti-Scalping Ward",
                desc: "Resale ceilings enforce a hard cap at a percentage of face value. Orders above the line are rejected before reservation.",
              },
              {
                icon: Gavel,
                title: "Dutch Auctions",
                desc: "Prices descend on a schedule from ceiling to floor. Accept at any tick — the server holds final price and fill truth.",
              },
            ].map((item, i) => (
              <GlassCard
                key={item.title}
                glowEdge={["brand", "mint", "ward"][i] as "brand" | "mint" | "ward"}
                className="p-6 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-panel border border-brand-500/35 bg-brand-500/[0.08] text-brand-400">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-[20px] font-semibold leading-tight text-text">{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-text-muted">{item.desc}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Scroll story */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto space-y-16">
            {[
              {
                icon: WalletIcon,
                title: "Reserve",
                desc: "When you place an order, the mock ledger immediately reserves the required credits or units. Nothing moves until the match is confirmed.",
                accent: "mint",
              },
              {
                icon: Layers,
                title: "Match",
                desc: "The matching engine pairs compatible orders by price-time priority. The seal marks the match — funds and units are now committed.",
                accent: "brand",
              },
              {
                icon: ShieldCheck,
                title: "Settle",
                desc: "The mock ledger finalizes the transfer. Credits and units move between accounts. The seal completes — the trade is immutable.",
                accent: "mint",
              },
            ].map((item, i) => (
              <div key={item.title} className="relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-glass-border" />
                <GlassCard
                  glowEdge={item.accent as "brand" | "mint" | "ward"}
                  className={`p-8 ${i % 2 === 0 ? "ml-auto mr-16" : "mr-auto ml-16"} max-w-md`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-panel border border-brand-500/35 bg-brand-500/[0.08] text-brand-400">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-[22px] font-semibold leading-tight text-text">{item.title}</h3>
                  </div>
                  <p className="text-[14px] leading-relaxed text-text-muted">{item.desc}</p>
                </GlassCard>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-glass-border bg-white/[0.015] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sim" style={{ boxShadow: "0 0 8px var(--sim-glow)" }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">Simulated market</span>
            <span className="hidden sm:inline text-text-dim" aria-hidden="true">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">Funds are simulated credits</span>
            <span className="hidden sm:inline text-text-dim" aria-hidden="true">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">Activity includes simulated traders</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
            <span>Darkhold Exchange</span>
            <span aria-hidden="true">·</span>
            <span>MMXXVI</span>
            <span aria-hidden="true">·</span>
            <Link href="#rules" className="link-line hover:text-brand-400">House Rules</Link>
            <span aria-hidden="true">·</span>
            <Link href="/dev/theme" className="link-line hover:text-brand-400">Design System</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}