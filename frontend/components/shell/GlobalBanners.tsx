"use client";

import React from "react";
import { AlertTriangle, WifiOff, ShieldX } from "lucide-react";
import { ConnectionState } from "@/lib/types";

interface GlobalBannersProps {
  connectionState: ConnectionState;
  isAssetHalted?: boolean;
  haltedAssetName?: string;
  isEngineUnavailable?: boolean;
  onReconnectClick?: () => void;
}

export function GlobalBanners({
  connectionState,
  isAssetHalted,
  haltedAssetName,
  isEngineUnavailable,
  onReconnectClick,
}: GlobalBannersProps) {
  const isDisconnected = connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  return (
    <div className="w-full flex flex-col gap-2 z-40">
      {/* Asset Halted Banner */}
      {isAssetHalted && (
        <div
          role="alert"
          className="w-full rounded-panel border border-sell/40 bg-gradient-to-r from-sell/15 via-white/[0.02] to-transparent backdrop-blur-md py-2.5 px-4 flex items-center justify-between text-xs text-text font-mono border-l-4 border-l-sell shadow-glass-sm animate-pulse"
        >
          <div className="flex items-center gap-2.5">
            <ShieldX className="w-4 h-4 text-sell shrink-0" />
            <span>
              <strong className="text-sell">TRADING HALTED:</strong> Market orders and submissions disabled for{" "}
              {haltedAssetName || "this asset"}. Terminal is in read-only inspection mode.
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-sell font-bold border border-sell/50 bg-sell/10 px-2 py-0.5 rounded-pill">
            Halted by Circuit Breaker
          </span>
        </div>
      )}

      {/* Engine Unavailable Banner */}
      {isEngineUnavailable && (
        <div
          role="alert"
          className="w-full rounded-panel border border-warning/40 bg-gradient-to-r from-warning/15 via-white/[0.02] to-transparent backdrop-blur-md py-2.5 px-4 flex items-center gap-2.5 text-xs text-text font-mono border-l-4 border-l-warning shadow-glass-sm"
        >
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span>
            <strong className="text-warning">ENGINE BUSY:</strong> High transaction volume on the ledger. New orders may experience
            settlement latency.
          </span>
        </div>
      )}

      {/* Disconnected / Reconnecting Banner */}
      {isDisconnected && (
        <div
          role="alert"
          className="w-full rounded-panel border border-warning/40 bg-gradient-to-r from-warning/15 via-white/[0.02] to-transparent backdrop-blur-md py-2 px-4 flex items-center justify-between text-xs text-text font-mono border-l-4 border-l-warning shadow-glass-sm"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-warning shrink-0" />
            <span>
              {connectionState === "RECONNECTING"
                ? "Connection interrupted. Reconnecting with exponential backoff..."
                : "WebSocket disconnected. Showing cached market snapshot. Submissions will fall back to REST."}
            </span>
          </div>
          {onReconnectClick && (
            <button
              onClick={onReconnectClick}
              className="text-[11px] font-semibold underline text-warning hover:text-text transition-colors"
            >
              Force Reconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
}
