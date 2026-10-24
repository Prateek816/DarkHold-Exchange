"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CircleSlash } from "lucide-react";

export function DemoLimitsSection() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="glass-card p-5 space-y-4" style={{border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(255,255,255,0.065) 6.5%, rgba(255,255,255,0.01) 100%)', backdropFilter: 'blur(18px)'}}>
        <div>
          <h2 className="font-display text-[22px] leading-none text-text">
            What it deliberately does not claim
          </h2>
        </div>
        <ul className="space-y-2.5 text-[11px] leading-relaxed text-text-muted">
          {[
            "No throughput, latency or ops/sec benchmarks. The mock runs on timers in this tab, so any such number would be invented.",
            "No audit attestation or signed hash. The reconciliation fixture shipped with the mock is illustrative only; this page does not run a real invariant engine.",
            "No solvency or backing proof. Credits, counterparties and balances are fictional and exist only in memory.",
            "No production admin endpoints. Operator controls write to the mock store with no persistence, and reset on refresh.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-sell" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card p-5 space-y-4" style={{border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(255,255,255,0.065) 6.5%, rgba(255,255,255,0.01) 100%)', backdropFilter: 'blur(18px)'}}>
        <div>
          <h2 className="font-display text-[22px] leading-none text-text">
            Actions with no deployed endpoint
          </h2>
        </div>
        <ul className="space-y-2.5 text-[11px] leading-relaxed text-text-muted">
          <li className="border-b border-glass-border pb-2.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-warning">
              Auction creation
            </span>
            <p className="pt-0.5">
              Mock mode lists a lot and reserves units. Real mode returns{" "}
              <span className="font-mono text-brand-300">BACKEND_UNSUPPORTED</span> and reserves
              nothing.
            </p>
          </li>
          <li className="border-b border-glass-border pb-2.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-warning">
              Auction acceptance
            </span>
            <p className="pt-0.5">
              Mock mode settles immediately against the in-memory wallet. Real mode refuses the
              request rather than inventing a fill.
            </p>
          </li>
          <li>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-warning">
              Operator telemetry
            </span>
            <p className="pt-0.5">
              Reconciliation rings and risk scores are seeded fixtures with no live computation
              behind them, so this console shows the mock's real readback instead.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}