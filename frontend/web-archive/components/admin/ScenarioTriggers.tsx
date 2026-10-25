"use client";

import React, { useEffect, useState } from "react";
import { fakeWs } from "@/mocks/fake-websocket";
import { useUiStore } from "@/lib/stores/uiStore";
import { formatTimestamp } from "@/lib/format";
import type { ConnectionState } from "@/lib/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  Power,
  ShieldAlert,
  ShieldX,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ScenarioTriggers({ className }: { className?: string }) {
  const { addToast, connectionState } = useUiStore();
  const [isPaused, setIsPaused] = useState(fakeWs.getIsPaused());
  const [isHalted, setIsHalted] = useState(fakeWs.getIsHalted());
  const [logs, setLogs] = useState<{ id: string; text: string; time: number }[]>([]);

  useEffect(() => {
    const removeListener = fakeWs.addListener((event, data) => {
      if (event === "simulation_pause_change") {
        setIsPaused(Boolean(data.paused));
      }
      if (event === "asset_halt_change") {
        setIsHalted(Boolean(data.isHalted));
      }
      if (event === "connection_change") {
        const state = data.state as ConnectionState;
        setLogs((prev) => [
          {
            id: Math.random().toString(),
            text: `Feed state changed to ${state.toLowerCase()}.`,
            time: Date.now(),
          },
          ...prev.slice(0, 9),
        ]);
      }
    });
    return () => {
      removeListener();
    };
  }, []);

  const addLog = (text: string) => {
    setLogs((prev) => [
      { id: Math.random().toString(), text, time: Date.now() },
      ...prev.slice(0, 9),
    ]);
  };

  const handlePauseToggle = () => {
    const next = !isPaused;
    fakeWs.setSimulationPaused(next);
    setIsPaused(next);
    addLog(next ? "Mock feed paused. No new prints or ticks." : "Mock feed resumed.");
    addToast({
      type: next ? "warning" : "success",
      title: next ? "Feed paused" : "Feed resumed",
      message: next
        ? "The mock simulator has stopped generating prints and auction ticks. Server reads still work."
        : "The mock simulator is generating prints again.",
    });
  };

  const handleInjectTrade = () => {
    const injected = fakeWs.injectTrade();
    if (!injected) {
      addToast({
        type: "warning",
        title: "No print was generated",
        message: "Darkhold Pass is halted. Resume trading before injecting a simulated print.",
      });
      addLog("Injection refused: Darkhold Pass is halted.");
      return;
    }
    addLog("Injected one simulated trade print on Darkhold Pass.");
    addToast({
      type: "info",
      title: "Simulated print injected",
      message: "One fictional trade and its candle update were emitted on the mock feed.",
    });
  };

  const handlePartialFill = () => {
    fakeWs.triggerScenario("PARTIAL_FILL");
    addLog("Requested a one-unit partial fill on the first resting buy order.");
    addToast({
      type: "info",
      title: "Partial fill requested",
      message:
        "If an open buy order exists, one unit moves through a partial fill and settlement pending. Refresh the ledger to see it.",
    });
  };

  const handleForceSettlement = () => {
    fakeWs.triggerScenario("SETTLEMENT_PENDING_TO_COMPLETED");
    addLog("Requested immediate settlement for eligible mock fills.");
    addToast({
      type: "info",
      title: "Settlement queue flushed",
      message:
        "Any pending mock settlement whose delay has elapsed may now complete. Receipts are issued by the mock server.",
    });
  };

  const handleDropFeed = () => {
    fakeWs.triggerScenario("DISCONNECT_RECONNECT");
    addLog("Dropped the mock feed. Reconnect sequence started (about 5.5 seconds).");
    addToast({
      type: "warning",
      title: "Feed disconnected",
      message:
        "The mock connection will step through reconnecting and syncing. REST reads and cancellations still work.",
    });
  };

  const handleHaltToggle = () => {
    const next = !isHalted;
    fakeWs.toggleAssetHalt(next);
    setIsHalted(next);
    addLog(
      next
        ? "Halted mock trading on Darkhold Pass."
        : "Resumed mock trading on Darkhold Pass."
    );
    addToast({
      type: next ? "error" : "success",
      title: next ? "Asset halted" : "Asset resumed",
      message: next
        ? "Mock prints are suppressed and new orders for Darkhold Pass are refused by the server."
        : "Darkhold Pass can match again in the mock server.",
    });
  };

  return (
    <section className={cn("border border-glass-border bg-surface", className)}>
      <div className="flex flex-col justify-between gap-4 border-b border-glass-border p-5 sm:flex-row sm:items-center">
        <div>
          <span className="keyline">Mock controls</span>
          <h2 className="pt-1 font-display text-[26px] leading-none text-text">
            Run a scenario
          </h2>
          <p className="max-w-xl pt-1.5 text-[11px] leading-relaxed text-text-muted">
            Every control below acts only on this browser's in-memory mock server. None of them
            claims to affect a production venue.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePauseToggle}
          className={cn(
            "flex shrink-0 items-center gap-2 self-start border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors sm:self-auto",
            isPaused
              ? "border-buy/40 bg-buy/10 text-buy-text hover:bg-buy/15"
              : "border-warning/40 bg-warning/[0.08] text-warning hover:bg-warning/15"
          )}
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {isPaused ? "Resume feed" : "Pause feed"}
        </button>
      </div>

      <div className="grid grid-cols-1 divide-glass-border border-b border-glass-border sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
        {[
          {
            title: "Inject one print",
            body: "Emit a fictional trade and update its candle.",
            icon: Zap,
            action: handleInjectTrade,
            tone: "text-brand-300",
          },
          {
            title: "Partial fill",
            body: "Move one unit of the first resting buy order.",
            icon: ShieldAlert,
            action: handlePartialFill,
            tone: "text-buy-text",
          },
          {
            title: "Flush settlement",
            body: "Complete any due mock settlement and issue receipts.",
            icon: CheckCircle,
            action: handleForceSettlement,
            tone: "text-warning",
          },
          {
            title: "Drop the feed",
            body: "Simulate disconnect, reconnect and resync.",
            icon: WifiOff,
            action: handleDropFeed,
            tone: "text-sell-text",
          },
        ].map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={item.action}
            className="group p-4 text-left transition-colors hover:bg-white/[0.03]"
          >
            <span className={cn("flex items-center gap-2", item.tone)}>
              <item.icon className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em]">
                {item.title}
              </span>
            </span>
            <span className="mt-1.5 block text-[10.5px] leading-relaxed text-text-muted">
              {item.body}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 border border-sell/30 bg-sell/[0.05] p-3.5">
            <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-sell" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-sell-text">
                Halt / resume the pass
              </p>
              <p className="pt-1 text-[10.5px] leading-relaxed text-text-muted">
                Halting suppresses random mock prints and makes the server refuse new orders for
                Darkhold Pass. Existing orders are not erased.
              </p>
              <button
                type="button"
                onClick={handleHaltToggle}
                className={cn(
                  "mt-3 flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] transition-colors",
                  isHalted
                    ? "border-buy/40 bg-buy/10 text-buy-text hover:bg-buy/15"
                    : "border-sell/40 bg-sell/10 text-sell-text hover:bg-sell/15"
                )}
              >
                <Power className="h-3 w-3" />
                {isHalted ? "Resume Darkhold Pass" : "Halt Darkhold Pass"}
              </button>
            </div>
          </div>

          <div className="border border-glass-border bg-canvas p-3.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
              Current mock state
            </p>
            <dl className="mt-2.5 space-y-1.5 font-mono text-[10px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-dim">Feed</dt>
                <dd className="text-text-muted">{connectionState}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-dim">Simulator</dt>
                <dd className={isPaused ? "text-warning" : "text-buy-text"}>
                  {isPaused ? "Paused" : "Running"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-dim">Darkhold Pass</dt>
                <dd className={isHalted ? "text-sell-text" : "text-buy-text"}>
                  {isHalted ? "Halted" : "Tradable"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-2">
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim">
            <Activity className="h-3 w-3" />
            This session's operator log
          </span>
          <div className="no-scrollbar max-h-44 space-y-1.5 overflow-y-auto border border-glass-border bg-canvas p-3 font-mono text-[9.5px]">
            {logs.length === 0 ? (
              <p className="text-text-dim">
                No mock scenario has been run in this session. Actions you take will appear here.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 border-b border-glass-border/50 pb-1.5 text-text-muted last:border-0 last:pb-0"
                >
                  <span className="min-w-0 leading-relaxed">{log.text}</span>
                  <span className="shrink-0 tabular-nums text-text-dim">
                    {formatTimestamp(log.time)}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="flex items-start gap-1.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Refreshing the page restarts the mock store and this log. Nothing here is persisted or
            sent to a real exchange.
          </p>
        </div>
      </div>
    </section>
  );
}
