"use client";

import React, { useEffect, useState } from "react";
import { fakeWs } from "@/mocks/fake-websocket";
import { useUiStore } from "@/lib/stores/uiStore";
import { formatTimestamp } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Play,
  Pause,
  Zap,
  ShieldAlert,
  Flame,
  AlertTriangle,
  CheckCircle,
  ShieldX,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ScenarioTriggers({ className }: { className?: string }) {
  const { addToast } = useUiStore();
  const [isRunning, setIsRunning] = useState(true);
  const [isHalted, setIsHalted] = useState(fakeWs.getIsHalted());
  const [confirmChaos, setConfirmChaos] = useState(false);
  const [logs, setLogs] = useState<{ id: string; text: string; time: number }[]>([]);

  // Seed the audit trail after hydration so server/client timestamps can never disagree.
  useEffect(() => {
    setLogs([
      {
        id: "initial",
        text: "Simulator initialized in continuous matching mode.",
        time: Date.now() - 30000,
      },
    ]);
  }, []);

  const addLog = (text: string) => {
    setLogs((prev) => [{ id: Math.random().toString(), text, time: Date.now() }, ...prev.slice(0, 9)]);
  };

  const handleScenario = (scenario: string, label: string) => {
    fakeWs.triggerScenario(scenario as any);
    addLog(`Triggered scenario: ${label}`);
    addToast({
      type: "info",
      title: "Scenario injected",
      message: `Scenario '${label}' is now active on the market pipeline.`,
    });
  };

  const handleHaltToggle = () => {
    const nextHalt = !isHalted;
    fakeWs.toggleAssetHalt(nextHalt);
    setIsHalted(nextHalt);
    addLog(nextHalt ? "Circuit breaker triggered: trading halted on Darkhold Pass." : "Trading resumed.");
    addToast({
      type: nextHalt ? "error" : "success",
      title: nextHalt ? "Market halted" : "Trading resumed",
      message: nextHalt
        ? "Circuit breaker halted all market matches."
        : "Order books resumed normal flow.",
    });
  };

  const handleChaosKill = () => {
    setConfirmChaos(false);
    fakeWs.triggerScenario("DISCONNECT_RECONNECT");
    addLog("Chaos injection: matching engine terminated. Reconnect sequence initiated.");
    addToast({
      type: "warning",
      title: "Chaos triggered",
      message: "Engine killed. WebSocket disconnect and sync recovery active.",
    });
  };

  return (
    <GlassCard className={cn("overflow-hidden p-0", className)}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-glass-border p-5 sm:flex-row sm:items-center">
        <div>
          <span className="eyebrow flex items-center gap-2">
            <span className="h-px w-4 bg-brand-500/60" />
            Stress harness (Simulated)
          </span>
          <h3 className="pt-1 font-display text-[15px] font-semibold tracking-tight text-text">
            Market simulator & scenario controls (Simulated)
          </h3>
          <p className="pt-0.5 max-w-xl text-[11.5px] leading-relaxed text-text-muted">
            Simulated client-side stress testing harness for testing UI resiliency against chaos scenarios.
          </p>
        </div>

        <button
          onClick={() => {
            setIsRunning(!isRunning);
            addLog(isRunning ? "Simulator paused." : "Simulator resumed.");
          }}
          className={cn(
            "flex shrink-0 items-center gap-2 self-start rounded-full border px-4 py-2 font-mono text-[10.5px] font-semibold transition-all sm:self-auto",
            isRunning
              ? "border-glass-border bg-white/[0.04] text-text hover:bg-white/[0.07]"
              : "border-buy/40 bg-buy text-[#03150A] shadow-[0_0_14px_rgba(34,197,94,0.3)]"
          )}
        >
          {isRunning ? (
            <>
              <Pause className="h-3.5 w-3.5 text-warning" />
              <span>Pause simulator</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Resume simulator</span>
            </>
          )}
        </button>
      </div>

      {/* Scenario grid */}
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            action: () => handleScenario("NORMAL_FLOW", "Wake The Market"),
            icon: Zap,
            title: "Wake market",
            body: "Accelerate bilateral bot trading",
            color: "text-brand-400",
            hover: "hover:border-brand-500/40 hover:bg-brand-500/[0.04]",
            iconBg: "border-brand-500/30 bg-brand-500/10",
          },
          {
            action: () => handleScenario("SELL_WALL", "Sell Wall Attack"),
            icon: AlertTriangle,
            title: "Sell wall",
            body: "Inject 500-unit ceiling ask wall",
            color: "text-warning",
            hover: "hover:border-warning/40 hover:bg-warning/[0.04]",
            iconBg: "border-warning/30 bg-warning/10",
          },
          {
            action: () => handleScenario("PUMP_TO_CEILING", "Pump to The Ward"),
            icon: Flame,
            title: "Pump to Ward",
            body: "Push bids into the ceiling cap",
            color: "text-sell-text",
            hover: "hover:border-sell/40 hover:bg-sell/[0.04]",
            iconBg: "border-sell/30 bg-sell/10",
          },
          {
            action: () => handleScenario("PARTIAL_FILL", "Partial Fill"),
            icon: ShieldAlert,
            title: "Partial fill",
            body: "Fill 1 unit of an open order",
            color: "text-buy-text",
            hover: "hover:border-buy/40 hover:bg-buy/[0.04]",
            iconBg: "border-buy/30 bg-buy/10",
          },
          {
            action: () => handleScenario("SETTLEMENT_PENDING_TO_COMPLETED", "Settle Order"),
            icon: CheckCircle,
            title: "Settle complete",
            body: "Seal-chip transition test",
            color: "text-violet-300",
            hover: "hover:border-violet-500/40 hover:bg-violet-500/[0.05]",
            iconBg: "border-violet-500/30 bg-violet-500/10",
          },
        ].map((scenario) => (
          <button
            key={scenario.title}
            onClick={scenario.action}
            className={cn(
              "group rounded-[14px] border border-glass-border bg-white/[0.02] p-3.5 text-left transition-all duration-200",
              scenario.hover
            )}
          >
            <span
              className={cn(
                "mb-2.5 flex h-7 w-7 items-center justify-center rounded-[8px] border",
                scenario.iconBg,
                scenario.color
              )}
            >
              <scenario.icon className="h-3.5 w-3.5" />
            </span>
            <span className={cn("block text-[11.5px] font-semibold", scenario.color)}>
              {scenario.title}
            </span>
            <p className="pt-0.5 text-[10px] leading-relaxed text-text-dim">{scenario.body}</p>
          </button>
        ))}
      </div>

      {/* Destructive controls */}
      <div className="mx-5 space-y-3.5 rounded-panel border border-sell/25 bg-sell/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-sell-text">
            <ShieldX className="h-3.5 w-3.5" />
            Destructive & chaos controls
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
            Operator authorization required
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleHaltToggle}
            className={cn(
              "rounded-[11px] border px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-all",
              isHalted
                ? "border-buy bg-buy text-[#03150A] shadow-[0_0_12px_rgba(34,197,94,0.35)]"
                : "border-sell bg-sell text-white shadow-[0_0_12px_rgba(240,80,110,0.3)] hover:bg-sell/90"
            )}
          >
            {isHalted ? "Resume trading · Darkhold Pass" : "Halt trading · circuit breaker"}
          </button>

          {confirmChaos ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[11px] border border-warning/40 bg-canvas-elevated p-1.5">
              <span className="px-2 font-mono text-[10px] font-medium text-warning">
                Confirm kill?
              </span>
              <button
                onClick={handleChaosKill}
                className="rounded-[8px] bg-sell px-3 py-1 font-mono text-[10px] font-semibold text-white"
              >
                Yes, kill
              </button>
              <button
                onClick={() => setConfirmChaos(false)}
                className="rounded-[8px] border border-glass-border bg-white/[0.05] px-3 py-1 font-mono text-[10px] text-text transition-colors hover:bg-white/[0.09]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmChaos(true)}
              className="rounded-[11px] border border-sell/40 bg-white/[0.03] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-sell-text transition-colors hover:bg-sell/10"
            >
              Kill engine · chaos disconnect
            </button>
          )}
        </div>
      </div>

      {/* Audit trail */}
      <div className="space-y-2 p-5 pt-4">
        <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          Simulation operator audit trail
        </span>
        <div className="no-scrollbar max-h-36 space-y-1.5 overflow-y-auto rounded-panel border border-glass-border bg-white/[0.015] p-3 font-mono text-[10px]">
          {logs.length === 0 ? (
            <p className="text-text-dim">No scenarios executed this session.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 text-text-muted">
                <span className="truncate">{log.text}</span>
                <span className="shrink-0 tabular-nums text-text-dim">
                  {formatTimestamp(log.time)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassCard>
  );
}
