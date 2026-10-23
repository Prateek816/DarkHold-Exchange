"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { LivePill } from "@/components/ui/LivePill";
import { formatCurrency } from "@/lib/format";
import { Bell, User, Lock, Unlock, ChevronRight, Command } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/market": "Marketplace",
  "/trade": "Terminal",
  "/auctions": "Dutch Auctions",
  "/portfolio": "Portfolio",
  "/demo": "Operator Console",
  "/login": "Account Access",
  "/": "Overview",
};

export function TopHeader() {
  const pathname = usePathname();
  const { availableCredits, reservedCredits, totalCredits } = useWalletStore();
  const { user } = useAuthStore();
  const { connectionState } = useUiStore();

  const resolveTitle = () => {
    if (!pathname) return "Marketplace";
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    const match = Object.keys(PAGE_TITLES)
      .filter((key) => key !== "/" && pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0];
    return match ? PAGE_TITLES[match] : "Overview";
  };

  const pageTitle = resolveTitle();
  const totalSafe = totalCredits > 0 ? totalCredits : availableCredits + reservedCredits || 1;
  const availPct = Math.min(100, Math.max(0, (availableCredits / totalSafe) * 100));

  return (
    <header className="sticky top-2 z-40 w-full select-none animate-fade-in">
      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-glass-border bg-canvas/75 px-3 py-2 sm:px-4 backdrop-blur-[22px] shadow-glass-sm">
        {/* Brand (mobile) + breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Darkhold Exchange home"
            className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-brand-500/35 bg-brand-500/10 shadow-glow-teal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[2]">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              <circle cx="12" cy="12" r="3" fill="#19CBB0" />
            </svg>
          </Link>

          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-[11px]">
            <Link
              href="/"
              className="font-mono uppercase tracking-[0.16em] text-text-dim transition-colors hover:text-text-muted"
            >
              Darkhold
            </Link>
            <ChevronRight className="w-3 h-3 text-text-dim/60" />
            <span className="font-display text-[13px] font-semibold tracking-tight text-text">
              {pageTitle}
            </span>
          </nav>

          <span className="sm:hidden truncate font-display text-sm font-semibold tracking-tight text-text">
            {pageTitle}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Vault capsule */}
          <div
            className="hidden sm:flex items-center gap-3 rounded-full border border-glass-border bg-white/[0.035] px-3.5 py-1.5 backdrop-blur-md"
            title={`Vault: ${formatCurrency(availableCredits)} available, ${formatCurrency(
              reservedCredits
            )} reserved in orders`}
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <Unlock className="w-3 h-3 text-brand-400" />
              <span className="font-mono font-semibold tabular-nums text-text">
                {formatCurrency(availableCredits)}
              </span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-text-dim">avail</span>
            </span>

            {reservedCredits > 0 && (
              <>
                <span className="h-3 w-px bg-white/10" />
                <span className="flex items-center gap-1.5 text-[11px] text-warning">
                  <Lock className="w-3 h-3" />
                  <span className="font-mono font-semibold tabular-nums">
                    {formatCurrency(reservedCredits)}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.14em] text-text-dim">res</span>
                </span>
              </>
            )}

            <div className="ml-0.5 flex h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.08] p-px">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                style={{ width: `${availPct}%` }}
              />
              <div
                className="h-full rounded-full bg-warning transition-all duration-500"
                style={{ width: `${100 - availPct}%` }}
              />
            </div>
          </div>

          {/* Mobile balance chip */}
          <div className="sm:hidden flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.035] px-2.5 py-1.5">
            <Unlock className="w-3 h-3 text-brand-400" />
            <span className="font-mono text-[11px] font-semibold tabular-nums text-text">
              {formatCurrency(availableCredits, { showCents: false })}
            </span>
          </div>

          <LivePill state={connectionState} className="hidden sm:inline-flex" />

          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-white/[0.035] text-text-muted transition-all duration-200 hover:border-glass-border-strong hover:bg-white/[0.08] hover:text-text"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(25,203,176,0.9)]" />
          </button>

          <Link
            href="/login"
            className="group flex h-8 items-center gap-2 rounded-full border border-glass-border bg-white/[0.035] pl-1 pr-2.5 text-text-muted transition-all duration-200 hover:border-violet-500/35 hover:bg-violet-500/10 hover:text-text"
            title="Account profile"
            aria-label="User Account"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-violet-500/35 bg-violet-500/15 text-violet-300 transition-transform duration-200 group-hover:scale-105">
              <User className="w-3 h-3" />
            </span>
            <span className="hidden lg:inline font-mono text-[10px] uppercase tracking-[0.12em]">
              {user?.name || "trader_01"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
