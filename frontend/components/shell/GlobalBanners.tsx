"use client";

import React from "react";
import { AlertTriangle, WifiOff, ShieldX, RotateCw, AlertCircle } from "lucide-react";
import { ConnectionState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GlobalBannersProps {
  connectionState: ConnectionState;
  isAssetHalted?: boolean;
  haltedAssetName?: string;
  isAssetUnconfigured?: boolean;
  unconfiguredAssetName?: string;
  isEngineUnavailable?: boolean;
  onReconnectClick?: () => void;
}

export function GlobalBanners({
  connectionState,
  isAssetHalted,
  haltedAssetName,
  isAssetUnconfigured,
  unconfiguredAssetName,
  isEngineUnavailable,
  onReconnectClick,
}: GlobalBannersProps) {
  const isDisconnected = connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  if (!isAssetHalted && !isAssetUnconfigured && !isEngineUnavailable && !isDisconnected) return null;

  return (
    <div className="z-40 flex w-full flex-col gap-2">
      {/* Asset unconfigured */}
      {isAssetUnconfigured && (
        <div
          role="alert"
          className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[14px] border border-warning/35 bg-gradient-to-r from-warning/[0.12] via-warning/[0.04] to-transparent px-4 py-3 shadow-glass-sm backdrop-blur-md animate-fade-up"
        >
          <span className="absolute inset-y-3 left-0 w-[2px] rounded-r-full bg-warning" />
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-warning/40 bg-warning/10 text-warning">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-warning">
                Asset unconfigured
              </p>
              <p className="pt-0.5 text-[11.5px] leading-relaxed text-text-muted">
                <span className="font-medium text-text">{unconfiguredAssetName || "This asset"}</span> is not configured for matching engine execution. Trading actions are disabled.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-warning">
            Read only
          </span>
        </div>
      )}

      {/* Asset halted */}
      {isAssetHalted && (
        <div
          role="alert"
          className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[14px] border border-sell/35 bg-gradient-to-r from-sell/[0.12] via-sell/[0.04] to-transparent px-4 py-3 shadow-glass-sm backdrop-blur-md animate-fade-up"
        >
          <span className="absolute inset-y-3 left-0 w-[2px] rounded-r-full bg-sell" />
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-sell/40 bg-sell/10 text-sell">
              <ShieldX className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-sell-text">
                Trading halted
              </p>
              <p className="pt-0.5 text-[11.5px] leading-relaxed text-text-muted">
                Submissions are disabled for{" "}
                <span className="font-medium text-text">{haltedAssetName || "this asset"}</span>.
                The terminal is in read-only inspection mode.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-sell/40 bg-sell/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-sell-text">
            Circuit breaker
          </span>
        </div>
      )}

      {/* Engine unavailable */}
      {isEngineUnavailable && (
        <div
          role="alert"
          className="relative flex items-center gap-3 overflow-hidden rounded-[14px] border border-warning/35 bg-gradient-to-r from-warning/[0.12] via-warning/[0.04] to-transparent px-4 py-3 shadow-glass-sm backdrop-blur-md animate-fade-up"
        >
          <span className="absolute inset-y-3 left-0 w-[2px] rounded-r-full bg-warning" />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-warning/40 bg-warning/10 text-warning">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-warning">
              Engine busy
            </p>
            <p className="pt-0.5 text-[11.5px] leading-relaxed text-text-muted">
              High transaction volume on the ledger. New orders may experience settlement latency.
            </p>
          </div>
        </div>
      )}

      {/* Disconnected */}
      {isDisconnected && (
        <div
          role="alert"
          className={cn(
            "relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[14px] border border-warning/35 bg-gradient-to-r from-warning/[0.1] via-warning/[0.03] to-transparent px-4 py-3 shadow-glass-sm backdrop-blur-md",
            "animate-fade-up"
          )}
        >
          <span className="absolute inset-y-3 left-0 w-[2px] rounded-r-full bg-warning" />
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-warning/40 bg-warning/10 text-warning">
              <WifiOff className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-warning">
                {connectionState === "RECONNECTING" ? "Reconnecting" : "Live feed offline"}
              </p>
              <p className="pt-0.5 text-[11.5px] leading-relaxed text-text-muted">
                {connectionState === "RECONNECTING"
                  ? "Connection interrupted. Retrying with exponential backoff."
                  : "Showing a cached market snapshot. Submissions fall back to REST."}
              </p>
            </div>
          </div>
          {onReconnectClick && (
            <button
              onClick={onReconnectClick}
              className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 font-mono text-[10px] font-semibold text-warning transition-colors hover:bg-warning/20"
            >
              <RotateCw className="h-3 w-3" />
              Reconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
}
