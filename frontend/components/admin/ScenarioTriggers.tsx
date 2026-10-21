"use client";

import React, { useState } from "react";
import { fakeWs } from "@/mocks/fake-websocket";
import { useUiStore } from "@/lib/stores/uiStore";
import { formatTimestamp } from "@/lib/format";
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
  const [logs, setLogs] = useState<{ id: string; text: string; time: number }[]>([
    { id: "1", text: "Simulator initialized in continuous matching mode.", time: Date.now() - 30000 },
  ]);

  const addLog = (text: string) => {
    setLogs((prev) => [{ id: Math.random().toString(), text, time: Date.now() }, ...prev.slice(0, 9)]);
  };

  const handleScenario = (scenario: string, label: string) => {
    fakeWs.triggerScenario(scenario as any);
    addLog(`Triggered scenario: ${label}`);
    addToast({
      type: "info",
      title: "Scenario Injected",
      message: `Scenario '${label}' is now active on the market pipeline.`,
    });
  };

  const handleHaltToggle = () => {
    const nextHalt = !isHalted;
    fakeWs.toggleAssetHalt(nextHalt);
    setIsHalted(nextHalt);
    addLog(nextHalt ? "Circuit breaker triggered: Trading halted on Darkhold Pass." : "Trading resumed.");
    addToast({
      type: nextHalt ? "error" : "success",
      title: nextHalt ? "Market Halted" : "Trading Resumed",
      message: nextHalt ? "Circuit breaker halted all market matches." : "Order books resumed normal flow.",
    });
  };

  const handleChaosKill = () => {
    setConfirmChaos(false);
    fakeWs.triggerScenario("DISCONNECT_RECONNECT");
    addLog("Chaos injection: Matching engine abruptly terminated. Reconnecting sequence initiated.");
    addToast({
      type: "warning",
      title: "Chaos Triggered",
      message: "Engine killed. WebSocket disconnect & sync recovery active.",
    });
  };

  return (
    <div
      className={cn(
        "relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] p-6 space-y-6 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      {/* Header & Simulator State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Market Simulator & Scenario Controls
          </h3>
          <p className="text-xs text-text-muted">
            Manipulate automated order flow, trigger boundary stress tests, and test resilience.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRunning(!isRunning);
              addLog(isRunning ? "Simulator paused." : "Simulator resumed.");
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-12 font-semibold text-xs transition-all",
              isRunning
                ? "bg-white/[0.04] border border-white/10 text-white hover:bg-white/[0.08]"
                : "bg-buy text-white shadow-[0_0_12px_rgba(34,197,94,0.4)]"
            )}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 text-warning" />
                <span>Pause Sim</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Sim</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scenario Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => handleScenario("NORMAL_FLOW", "Wake The Market")}
          className="p-4 rounded-16 border border-white/8 bg-white/[0.025] hover:border-brand-500/40 hover:bg-brand-500/[0.04] text-left space-y-1.5 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-brand-400 font-semibold text-xs">
            <Zap className="w-3.5 h-3.5" />
            <span>Wake Market</span>
          </div>
          <p className="text-[11px] text-text-muted">Accelerate bilateral bot trading</p>
        </button>

        <button
          onClick={() => handleScenario("SELL_WALL", "Sell Wall Attack")}
          className="p-4 rounded-16 border border-white/8 bg-white/[0.025] hover:border-warning/40 hover:bg-warning/[0.04] text-left space-y-1.5 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-warning font-semibold text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sell Wall</span>
          </div>
          <p className="text-[11px] text-text-muted">Inject 500-unit ceiling ask wall</p>
        </button>

        <button
          onClick={() => handleScenario("PUMP_TO_CEILING", "Pump to The Ward")}
          className="p-4 rounded-16 border border-white/8 bg-white/[0.025] hover:border-sell/40 hover:bg-sell/[0.04] text-left space-y-1.5 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-sell font-semibold text-xs">
            <Flame className="w-3.5 h-3.5" />
            <span>Pump To Ward</span>
          </div>
          <p className="text-[11px] text-text-muted">Push bids into price ceiling cap</p>
        </button>

        <button
          onClick={() => handleScenario("PARTIAL_FILL", "Partial Fill")}
          className="p-4 rounded-16 border border-white/8 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05] text-left space-y-1.5 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-buy" />
            <span>Partial Fill</span>
          </div>
          <p className="text-[11px] text-text-muted">Fill 1 unit of open order</p>
        </button>

        <button
          onClick={() => handleScenario("SETTLEMENT_PENDING_TO_COMPLETED", "Settle Order")}
          className="p-4 rounded-16 border border-white/8 bg-white/[0.025] hover:border-buy/40 hover:bg-buy/[0.04] text-left space-y-1.5 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-buy font-semibold text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Settle Complete</span>
          </div>
          <p className="text-[11px] text-text-muted">Seal chip transition test</p>
        </button>
      </div>

      {/* Destructive Controls (Behind Confirms) */}
      <div className="p-5 rounded-20 border border-sell/25 bg-sell/[0.04] space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-sell uppercase tracking-wider flex items-center gap-2">
            <ShieldX className="w-4 h-4" />
            <span>Destructive & Chaos Controls</span>
          </span>
          <span className="text-[11px] text-text-dim">Operator Authorization Required</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Halt Asset Button */}
          <button
            onClick={handleHaltToggle}
            className={cn(
              "px-4 py-2 rounded-12 font-semibold text-xs uppercase tracking-wider transition-all border",
              isHalted
                ? "bg-buy text-white border-buy shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                : "bg-sell text-white border-sell hover:bg-sell/90 shadow-[0_0_12px_rgba(240,80,110,0.35)]"
            )}
          >
            {isHalted ? "Resume Trading (Darkhold Pass)" : "Halt Trading (Circuit Breaker)"}
          </button>

          {/* Kill Engine Chaos with Confirm */}
          {confirmChaos ? (
            <div className="flex items-center gap-2 p-1.5 rounded-12 bg-bg-2 border border-warning/40">
              <span className="text-xs text-warning font-medium px-2">Confirm kill?</span>
              <button
                onClick={handleChaosKill}
                className="px-3 py-1 rounded-8 bg-sell text-white font-semibold text-xs"
              >
                Yes, Kill
              </button>
              <button
                onClick={() => setConfirmChaos(false)}
                className="px-3 py-1 rounded-8 bg-white/5 border border-white/10 text-white text-xs hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmChaos(true)}
              className="px-4 py-2 rounded-12 bg-white/[0.03] border border-sell/40 text-sell hover:bg-sell/10 font-semibold text-xs uppercase tracking-wider transition-colors"
            >
              Kill Engine (Chaos Disconnect)
            </button>
          )}
        </div>
      </div>

      {/* Execution Results Log Strip */}
      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wider text-text-dim block font-medium">
          Simulation Operator Audit Trail
        </span>
        <div className="p-3.5 rounded-16 bg-white/[0.02] border border-white/6 max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-text-muted">
              <span>{log.text}</span>
              <span className="text-text-dim text-[10px] tabular-nums">{formatTimestamp(log.time)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
