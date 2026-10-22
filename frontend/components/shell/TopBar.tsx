"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VaultBar } from "./VaultBar";
import { ConnectionStatus } from "./ConnectionStatus";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { Shield, Sparkles, Terminal, Layers, Gavel, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Alternate horizontal header (landing / kiosk contexts).
 * The in-app shell uses <TopHeader />; both share the same design tokens.
 */
export function TopBar() {
  const pathname = usePathname();
  const { availableCredits, reservedCredits, totalCredits } = useWalletStore();
  const { connectionState } = useUiStore();

  const navLinks = [
    { href: "/market", label: "Marketplace", icon: Layers },
    { href: "/trade/DARKHOLD-PASS-2026", label: "Terminal", icon: Terminal },
    { href: "/auctions", label: "Dutch Auctions", icon: Gavel },
    { href: "/portfolio", label: "Portfolio", icon: Shield },
    { href: "/demo", label: "Demo Console", icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-4 border-b border-glass-border bg-canvas/90 px-4 py-2.5 backdrop-blur-[22px]">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-[10px] px-1 focus-visible:ring-1 focus-visible:ring-brand-500"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-brand-500/40 bg-brand-500/10 shadow-glow-teal transition-transform duration-300 group-hover:rotate-6">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.9]">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              <circle cx="12" cy="12" r="3" fill="#19CBB0" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="font-display text-[13px] font-bold leading-tight tracking-tight text-text">
              DARKHOLD
            </span>
            <span className="font-mono text-[8px] uppercase leading-none tracking-[0.28em] text-text-dim">
              Exchange
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks.map((item) => {
            const isActive =
              item.href === "/market"
                ? pathname === "/market" || pathname === "/"
                : item.href.startsWith("/trade")
                ? pathname.startsWith("/trade")
                : pathname.startsWith(item.href);

            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors focus-visible:ring-1 focus-visible:ring-brand-500",
                  isActive
                    ? "border-brand-500/35 bg-brand-500/10 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "border-transparent text-text-muted hover:bg-white/[0.04] hover:text-text"
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5", isActive ? "text-brand-400" : "text-text-dim")}
                  strokeWidth={1.9}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <VaultBar
          available={availableCredits}
          reserved={reservedCredits}
          total={totalCredits}
          variant="compact"
        />

        <ConnectionStatus state={connectionState} />

        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.035] px-2.5 py-1.5 text-text-muted transition-colors hover:border-violet-500/35 hover:bg-violet-500/10 hover:text-text"
          title="Demo Account (5,000 Starter Credits)"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/20">
            <User className="h-2.5 w-2.5 text-violet-300" />
          </span>
          <span className="hidden text-[11px] sm:inline">trader_01</span>
        </Link>
      </div>
    </header>
  );
}
