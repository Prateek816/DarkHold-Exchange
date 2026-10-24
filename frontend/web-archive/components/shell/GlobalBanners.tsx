"use client";

import React from "react";
import { X, WifiOff, AlertTriangle, PauseCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/lib/types";

interface GlobalBannersProps {
  connectionState: ConnectionState;
  isAssetHalted?: boolean;
  haltedAssetName?: string;
  apiUnreachable?: boolean;
}

const connectionStateConfig: Record<ConnectionState, { label: string; icon: React.ReactNode; color: string }> = {
  CONNECTING: { label: "Connecting…", icon: <WifiOff className="h-4 w-4" />, color: "text-warning" },
  AUTHENTICATING: { label: "Authenticating…", icon: <AlertTriangle className="h-4 w-4" />, color: "text-warning" },
  SYNCING: { label: "Syncing data…", icon: <WifiOff className="h-4 w-4 animate-spin" />, color: "text-warning" },
  LIVE: { label: "Live", icon: null, color: "text-buy" },
  RECONNECTING: { label: "Reconnecting…", icon: <WifiOff className="h-4 w-4" />, color: "text-warning" },
  DISCONNECTED: { label: "Disconnected — using cached data", icon: <WifiOff className="h-4 w-4" />, color: "text-sell" },
};

export function GlobalBanners({
  connectionState,
  isAssetHalted,
  haltedAssetName,
  apiUnreachable,
}: GlobalBannersProps) {
  const config = connectionStateConfig[connectionState];
  const showConnectionBanner = connectionState !== "LIVE";

  const banners = React.useMemo(() => {
    const items: Array<{ id: string; content: React.ReactNode }> = [];

    if (showConnectionBanner) {
      items.push({
        id: "connection",
        content: (
          <div className="flex items-center gap-3">
            {config.icon && <span className={cn("flex-shrink-0", config.color)}>{config.icon}</span>}
            <span className={cn("font-mono text-[11px] uppercase tracking-[0.1em]", config.color)}>
              {config.label}
            </span>
          </div>
        ),
      });
    }

    if (isAssetHalted) {
      items.push({
        id: "halted",
        content: (
          <div className="flex items-center gap-3">
            <PauseCircle className="h-4 w-4 text-sell" />
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-sell">
              Trading halted
            </span>
            <span className="text-[12px] text-text-muted">
              {haltedAssetName} is currently halted. No new orders can be placed.
            </span>
          </div>
        ),
      });
    }

    if (apiUnreachable) {
      items.push({
        id: "api",
        content: (
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-warning">
              API unreachable
            </span>
            <span className="text-[12px] text-text-muted">
              Unable to reach the backend. Some features may be unavailable.
            </span>
          </div>
        ),
      });
    }

    return items;
  }, [connectionState, isAssetHalted, haltedAssetName, apiUnreachable]);

  if (banners.length === 0) return null;

  return (
    <AnimatePresence>
      {banners.map((banner) => (
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-40 mx-auto max-w-[1480px] px-4"
        >
          <div className="mx-auto w-full max-w-[1480px]">
            <div className="flex items-center justify-between gap-3 rounded-panel border border-glass-border bg-white/[0.03] backdrop-blur-xl p-3 shadow-glass">
              <div className="flex-1">{banner.content}</div>
              <button
                type="button"
                className="flex-shrink-0 p-1 rounded-lg text-text-dim hover:text-text hover:bg-white/[0.05] transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}