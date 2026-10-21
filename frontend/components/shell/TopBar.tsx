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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-[#0B0B0D]/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-4">
      {/* Brand & Left Nav */}
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-crimson rounded px-1"
        >
          {/* Grimoire Sigil Icon */}
          <div className="w-7 h-7 rounded border border-crimson/50 bg-crimson/10 flex items-center justify-center transition-all duration-300 group-hover:border-crimson group-hover:shadow-[0_0_10px_rgba(179,32,42,0.4)]">
            <div className="w-3.5 h-3.5 border border-crimson rotate-45 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-crimson rounded-full" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-serif tracking-wider font-bold text-sm text-parchment leading-tight">
              DARKHOLD
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-parchment-dim leading-none">
              EXCHANGE
            </span>
          </div>
        </Link>

        {/* Primary Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
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
                  "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors focus-visible:ring-1 focus-visible:ring-crimson",
                  isActive
                    ? "bg-surface-elevated text-parchment border border-border"
                    : "text-parchment-muted hover:text-parchment hover:bg-surface/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-crimson" : "text-parchment-dim")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Shell Controls: Compact Vault Bar, Connection, User Menu */}
      <div className="flex items-center gap-3">
        {/* Compact Vault Bar in Top Bar */}
        <VaultBar
          available={availableCredits}
          reserved={reservedCredits}
          total={totalCredits}
          variant="compact"
        />

        {/* Connection State */}
        <ConnectionStatus state={connectionState} />

        {/* User Account Capsule */}
        <Link
          href="/login"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-surface border border-border text-xs font-mono text-parchment-muted hover:text-parchment hover:border-parchment/30 transition-colors"
          title="Demo Account (5,000 Starter Credits)"
        >
          <div className="w-4 h-4 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center">
            <User className="w-2.5 h-2.5 text-crimson" />
          </div>
          <span className="hidden sm:inline text-[11px]">trader_01</span>
        </Link>
      </div>
    </header>
  );
}
