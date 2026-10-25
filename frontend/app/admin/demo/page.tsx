'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { MockBootstrap } from '@/components/shell/MockBootstrap';
import { useDemoStore, useMarketStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import {
  ShieldAlert, Play, Pause, RotateCw, CheckCircle2,
  AlertTriangle, Zap, Activity, Radio, Cpu, Sparkles,
  Gavel, Check, AlertOctagon, TrendingUp, Sliders, ShieldCheck
} from 'lucide-react';

export default function DemoConsolePage() {
  const {
    simRunning,
    setSimRunning,
    activeScenario,
    triggerScenario,
    reconRules,
    lastReconRun,
    runReconciliation,
    resetDemo,
    engineLagMs,
    pendingSettlements,
  } = useDemoStore();

  const { assets, haltAsset } = useMarketStore();
  const pushToast = useToastStore((s) => s.push);

  const [hasMounted, setHasMounted] = useState(false);
  const [runningRecon, setRunningRecon] = useState(false);
  const [activeReconStep, setActiveReconStep] = useState<number | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 5 Scenarios as specified in prompt section 9
  const handleScenario = (name: string, description: string) => {
    triggerScenario(name);
    pushToast({
      variant: 'info',
      title: `Scenario Injected: ${name}`,
      body: description,
    });
  };

  // Sequential R1–R8 reconciliation run
  const handleRunRecon = () => {
    setRunningRecon(true);
    setActiveReconStep(0);

    const interval = setInterval(() => {
      setActiveReconStep((prev) => {
        if (prev === null) return 0;
        if (prev < reconRules.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setRunningRecon(false);
          setActiveReconStep(null);
          runReconciliation();
          pushToast({
            variant: 'success',
            title: 'Reconciliation Verified (R1–R8)',
            body: 'All 8 double-entry invariants passed with 0.00 drift.',
          });
          return null;
        }
      });
    }, 180);
  };

  return (
    <MockBootstrap>
      <AppShell title="Operator Demo Console">
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Subtitle / Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                <ShieldAlert size={13} className="text-[var(--lav)]" />
                <span>Operator privileged cockpit · Invariant reconciliation engine</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                Demo Console & Simulator Control
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSimRunning(!simRunning)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  simRunning
                    ? 'bg-[rgba(255,90,95,0.15)] text-[var(--sell)] border border-[rgba(255,90,95,0.3)]'
                    : 'bg-[rgba(61,220,110,0.15)] text-[var(--buy)] border border-[rgba(61,220,110,0.3)]'
                }`}
              >
                {simRunning ? <Pause size={14} /> : <Play size={14} />}
                {simRunning ? 'Pause Simulator' : 'Start Simulator'}
              </button>

              <button
                onClick={() => {
                  resetDemo();
                  pushToast({ variant: 'info', title: 'Demo State Reset', body: 'All assets and ledgers restored to seed defaults.' });
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] text-white transition-colors"
              >
                Reset Demo
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              TOP ROW: 5 SCENARIOS (Left 7) + ENGINE TELEMETRY (Right 5)
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 5 Scenario Buttons Card */}
            <div className="lg:col-span-7 card-pod p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Adversarial Scenarios</h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Deterministic tests injected into the matching engine and simulated bot feed.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[rgba(94,220,245,0.12)] text-[var(--sim)] border border-[rgba(94,220,245,0.25)]">
                    5 SCENARIOS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {/* Scenario 1: Wake Market */}
                  <button
                    onClick={() => handleScenario('Wake Market', 'Dispatched 20 limit orders from SIM bots across all price levels.')}
                    className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] hover:border-[var(--line)] text-left transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">Wake Market</span>
                      <Radio size={14} className="text-[var(--sim)]" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Spikes resting liquidity from synthetic market makers.
                    </p>
                  </button>

                  {/* Scenario 2: Sell Wall */}
                  <button
                    onClick={() => handleScenario('Sell Wall', 'Injected 50 units resting sell wall at $349.00 near the resale cap.')}
                    className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] hover:border-[var(--line)] text-left transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">Inject Sell Wall</span>
                      <Zap size={14} className="text-[var(--sell)]" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Places heavy supply block just below the 120% ceiling.
                    </p>
                  </button>

                  {/* Scenario 3: Pump */}
                  <button
                    onClick={() => handleScenario('Demand Pump', 'Dispatched rapid market orders eating book asks up to ceiling.')}
                    className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] hover:border-[var(--line)] text-left transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">Demand Surge</span>
                      <TrendingUp size={14} className="text-[var(--buy)]" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Eats book depth aggressively up toward resale cap.
                    </p>
                  </button>

                  {/* Scenario 4: Scalper Rejection */}
                  <button
                    onClick={() => handleScenario('Scalper Attempt', 'Simulated scalper placed order above ceiling → REJECTED: PRICE_ABOVE_CEILING.')}
                    className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] hover:border-[var(--line)] text-left transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">Scalper Attempt</span>
                      <AlertOctagon size={14} className="text-[var(--cap)]" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Demonstrates instant engine rejection above 120% cap.
                    </p>
                  </button>

                  {/* Scenario 5: Auction Drop */}
                  <button
                    onClick={() => handleScenario('Auction Drop', 'Triggered Dutch auction price decay step on active drops.')}
                    className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] hover:border-[var(--line)] text-left transition-all sm:col-span-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">Trigger Auction Drop</span>
                      <Gavel size={14} className="text-[var(--lav)]" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Forces an immediate price decay step across all running Dutch auctions.
                    </p>
                  </button>
                </div>
              </div>

              {/* Asset Circuit Breakers */}
              <div className="mt-5 pt-4 border-t border-[var(--line-soft)]">
                <span className="text-xs font-semibold text-white block mb-2">
                  Asset Circuit Breakers (Halt / Resume)
                </span>
                <div className="flex flex-wrap gap-2">
                  {assets.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        const nextHalted = !a.is_halted;
                        haltAsset(a.id, nextHalted);
                        pushToast({
                          variant: nextHalted ? 'warn' : 'success',
                          title: nextHalted ? 'Trading Halted' : 'Trading Resumed',
                          body: `${a.name} is now ${nextHalted ? 'HALTED' : 'ACTIVE'}.`,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                        a.is_halted
                          ? 'bg-[rgba(255,90,95,0.2)] border-[var(--sell)] text-[var(--sell)]'
                          : 'bg-[var(--inset)] border-[var(--line-soft)] text-[var(--muted)] hover:text-white'
                      }`}
                    >
                      {a.symbol}: {a.is_halted ? 'HALTED' : 'ACTIVE'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Engine Telemetry Card */}
            <div className="lg:col-span-5 card-pod p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Engine Telemetry</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[rgba(61,220,110,0.12)] text-[var(--buy)] border border-[rgba(61,220,110,0.25)]">
                    ONLINE · 0.00% LOSS
                  </span>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex justify-between">
                    <span className="text-[var(--muted)]">Matching Engine State:</span>
                    <span className="text-[var(--buy)] font-bold">ONLINE (0.00% DROP)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex justify-between">
                    <span className="text-[var(--muted)]">Event Loop / Tick Lag:</span>
                    <span className="text-white font-bold">{engineLagMs} ms</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex justify-between">
                    <span className="text-[var(--muted)]">Pending Settlements:</span>
                    <span className="text-[var(--buy)] font-bold">{pendingSettlements} (SLA &lt; 30s)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex justify-between">
                    <span className="text-[var(--muted)]">Simulator Cadence:</span>
                    <span className="text-[var(--sim)] font-bold">1 tick / 3.0s</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex justify-between">
                    <span className="text-[var(--muted)]">Double-Entry Verification:</span>
                    <span className="text-[var(--buy)] font-bold">PASSED (R1–R8)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-[rgba(94,220,245,0.06)] border border-[rgba(94,220,245,0.2)] text-[11px] text-[var(--sim)] flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                All consumer offsets match engine sequencing without any dropped acks.
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              MIDDLE: ADVISORY ML RISK-SCORE PANEL (Prompt section 9)
          ═══════════════════════════════════════════════════════════ */}
          <div className="card-pod p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[var(--line-soft)]">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-[var(--lav)]" />
                  <h3 className="text-base font-bold text-white">Advisory ML Risk-Score Panel</h3>
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Real-time pattern analysis for anomalous trading behavior and scalping prevention.
                </p>
              </div>

              {/* Exact Verbatim Badge from docs */}
              <div className="p-2.5 rounded-xl bg-[rgba(255,181,71,0.08)] border border-[rgba(255,181,71,0.25)] text-[11px] font-mono text-[var(--cap)] max-w-md">
                <strong>Advisory only.</strong> Trained on simulated data. Does not block trades or move money.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>Wash Trading Risk</span>
                  <span className="text-[var(--buy)] font-bold">0.04 (Low)</span>
                </div>
                <div className="w-full bg-[rgba(255,255,255,0.06)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-[var(--buy)] h-full rounded-full" style={{ width: '4%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>Spoofing Detection</span>
                  <span className="text-[var(--buy)] font-bold">0.02 (Low)</span>
                </div>
                <div className="w-full bg-[rgba(255,255,255,0.06)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-[var(--buy)] h-full rounded-full" style={{ width: '2%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>Front-Running Index</span>
                  <span className="text-[var(--buy)] font-bold">0.01 (Low)</span>
                </div>
                <div className="w-full bg-[rgba(255,255,255,0.06)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-[var(--buy)] h-full rounded-full" style={{ width: '1%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>Scalper Velocity</span>
                  <span className="text-[var(--buy)] font-bold">0.03 (Normal)</span>
                </div>
                <div className="w-full bg-[rgba(255,255,255,0.06)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-[var(--buy)] h-full rounded-full" style={{ width: '3%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              BOTTOM: RECONCILIATION ENGINE (R1 – R8) SEQUENTIAL CARDS
          ═══════════════════════════════════════════════════════════ */}
          <div className="card-pod overflow-hidden">
            <div className="p-5 border-b border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[var(--lav)]" />
                  <h3 className="text-base font-bold text-white">
                    Reconciliation Engine (R1 – R8)
                  </h3>
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Verifies double-entry ledger balance parity, escrow conservation, and anti-scalping limits.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted)] font-mono" suppressHydrationWarning>
                  Last checked: {hasMounted ? fmt.time(lastReconRun) : '--:--:--'}
                </span>
                <button
                  onClick={handleRunRecon}
                  disabled={runningRecon}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--lav)] text-[var(--lav-dark)] hover:brightness-110 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RotateCw size={13} className={runningRecon ? 'animate-spin' : ''} />
                  {runningRecon ? 'Checking Invariants…' : 'Run Reconciliation'}
                </button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {reconRules.map((rule, idx) => {
                const isChecking = activeReconStep === idx;
                const isPassed = !isChecking && rule.status === 'PASSED';
                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isChecking
                        ? 'bg-[var(--raised)] border-[var(--lav)] ring-1 ring-[var(--lav)] animate-pulse'
                        : isPassed
                        ? 'bg-[var(--inset)] border-[var(--line-soft)] hover:border-[var(--line)]'
                        : 'bg-[rgba(255,90,95,0.08)] border-[rgba(255,90,95,0.3)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isChecking
                              ? 'bg-[var(--lav)] text-[var(--lav-dark)]'
                              : isPassed
                              ? 'bg-[rgba(61,220,110,0.12)] text-[var(--buy)]'
                              : 'bg-[rgba(255,90,95,0.15)] text-[var(--sell)]'
                          }`}
                        >
                          {isChecking ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-xs text-white">{rule.id}: {rule.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[rgba(61,220,110,0.12)] text-[var(--buy)]">
                              {rule.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
                            {rule.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[10px] shrink-0">
                        <span className="text-[var(--dim)] block">Drift</span>
                        <span className="text-[var(--buy)] font-bold">{rule.drift_value}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[var(--line-soft)] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--muted)]">Invariant</span>
                      <span className="text-[var(--lav)]">{rule.invariant}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AppShell>
    </MockBootstrap>
  );
}
