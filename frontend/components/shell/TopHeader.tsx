"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { LivePill } from "@/components/ui/LivePill";
import { formatCurrency } from "@/lib/format";
import { Bell, User, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopHeader() {
  const pathname = usePathname();
  const { availableCredits, reservedCredits, totalCredits } = useWalletStore();
  const { connectionState } = useUiStore();

  // Compute breadcrumb title based on pathname
  let pageTitle = "Marketplace";
  if (pathname?.startsWith("/trade")) pageTitle = "Terminal";
  else if (pathname?.startsWith("/auctions")) pageTitle = "Dutch Auctions";
  else if (pathname?.startsWith("/portfolio")) pageTitle = "Portfolio";
  else if (pathname?.startsWith("/demo")) pageTitle = "Demo Console";
  else if (pathname === "/login") pageTitle = "Account Access";
  else if (pathname === "/") pageTitle = "Overview";

  const totalSafe = totalCredits > 0 ? totalCredits : availableCredits + reservedCredits || 1;
  const availPct = Math.min(100, (availableCredits / totalSafe) * 100);

  return (
    <header className="w-full flex items-center justify-between gap-4 py-2 px-1 select-none">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-text-dim">Overview</span>
        <span className="text-glass-border-strong">/</span>
        <span className="text-text font-semibold tracking-wide">{pageTitle}</span>
      </div>

      {/* Right Controls: Compact Vault Bar Pill, Live Pill, Bell, Avatar */}
      <div className="flex items-center gap-3">
        {/* Compact Vault Bar as a Glass Pill */}
        <div
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-pill border border-glass-border bg-white/[0.035] backdrop-blur-md shadow-glass-sm font-mono text-xs"
          title={`Vault: ${formatCurrency(availableCredits)} available, ${formatCurrency(reservedCredits)} reserved in orders`}
        >
          <div className="flex items-center gap-1.5">
            <Unlock className="w-3 h-3 text-brand-400" />
            <span className="font-bold text-text tabular-nums">{formatCurrency(availableCredits)}</span>
            <span className="text-[10px] text-text-dim">avail</span>
          </div>

          {reservedCredits > 0 && (
            <>
              <span className="text-glass-border-strong">|</span>
              <div className="flex items-center gap-1.5 text-warning">
                <Lock className="w-3 h-3" />
                <span className="font-semibold tabular-nums">{formatCurrency(reservedCredits)}</span>
                <span className="text-[10px] text-text-dim">res</span>
              </div>
            </>
          )}

          {/* Mini gauge fill */}
          <div className="w-12 h-1.5 bg-white/10 rounded-pill overflow-hidden flex ml-1">
            <div className="h-full bg-brand-400" style={{ width: `${availPct}%` }} />
            <div className="h-full bg-warning" style={{ width: `${100 - availPct}%` }} />
          </div>
        </div>

        {/* Live Status Pill */}
        <LivePill state={connectionState} />

        {/* Notification Bell (Round Glass) */}
        <button
          className="w-9 h-9 rounded-full border border-glass-border bg-white/[0.035] hover:bg-white/[0.08] text-text-muted hover:text-text flex items-center justify-center transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(25,203,176,0.8)]" />
        </button>

        {/* User Avatar (Round Glass) */}
        <Link
          href="/login"
          className="w-9 h-9 rounded-full border border-glass-border bg-white/[0.035] hover:bg-white/[0.08] text-text-muted hover:text-text flex items-center justify-center transition-colors"
          title="Account profile"
          aria-label="User Account"
        >
          <User className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
