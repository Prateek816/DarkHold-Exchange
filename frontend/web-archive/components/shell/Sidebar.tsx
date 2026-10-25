"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Terminal,
  Gavel,
  Shield,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  Activity,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/IconTile";
import { GlassCard } from "@/components/ui/GlassCard";
import { LivePill } from "@/components/ui/LivePill";
import { SimBadge } from "@/components/ui/SimBadge";
import { PillButton } from "@/components/ui/PillButton";
import { useWalletStore } from "@/lib/stores/walletStore";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { href: "/market", label: "Marketplace", icon: Layers },
      { href: "/trade/DARKHOLD-PASS-2026", label: "Terminal", icon: Terminal },
      { href: "/auctions", label: "Dutch Auctions", icon: Gavel },
    ],
  },
  {
    title: "Activity",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: Shield },
    ],
  },
  {
    title: "Operator",
    items: [
      { href: "/demo", label: "Demo Console", icon: Sparkles },
    ],
  },
];

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname();
  const { totalCredits, availableCredits, reservedCredits } = useWalletStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Determine active item
  const getIsActive = (href: string) => {
    if (href === "/market") return pathname === "/market" || pathname === "/";
    if (href.startsWith("/trade")) return pathname.startsWith("/trade");
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "sticky top-5 h-[calc(100vh-40px)] overflow-hidden rounded-[28px] border border-glass-border",
        "flex flex-col justify-between p-3.5 z-40 transition-[width,padding] duration-300 ease-spring shrink-0",
        collapsed ? "w-[80px] px-2" : "w-[256px]",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(124,92,255,0.14) 0%, rgba(8,11,16,0.9) 26%, rgba(4,6,10,0.96) 100%)",
        boxShadow:
          "0 30px 70px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Ambient inner glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-500/15 blur-[70px]"
      />

      <div className="relative space-y-5 flex-1 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 px-1.5 pt-1">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-[14px] p-0.5 focus-visible:ring-1 focus-visible:ring-brand-500"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-brand-500/40 bg-gradient-to-br from-brand-500/20 to-brand-600/10 shadow-[0_0_22px_rgba(122,92,255,0.24)] transition-transform duration-500 group-hover:rotate-[6deg]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.8]">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                <circle cx="12" cy="12" r="3" fill="#14CBAA" />
              </svg>
              <span className="absolute inset-0 rounded-[12px] ring-1 ring-inset ring-white/10" />
            </span>

            {!collapsed && (
              <span className="flex min-w-0 flex-col">
                <span className="font-display text-[16px] font-semibold leading-tight tracking-[-0.02em] text-text">
                  Darkhold
                </span>
                <span className="font-mono text-[8.5px] uppercase leading-none tracking-[0.3em] text-text-dim">
                  Exchange
                </span>
              </span>
            )}
          </Link>

          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-glass-border bg-white/[0.03] text-text-dim transition-all",
              "hover:border-glass-border-strong hover:bg-white/[0.08] hover:text-text"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Greeting Block */}
        {!collapsed && (
          <div className="px-2">
            <div className="rounded-[14px] border border-glass-border bg-white/[0.02] p-3">
              <p className="text-[13px] font-medium text-text">
                Welcome back, <span className="font-mono text-brand-400">trader_01</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-text-dim">
                Last login: 2 hours ago
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-4" aria-label="Main navigation">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.title} className="space-y-1.5">
              {!collapsed && (
                <span className="keyline keyline--plain block px-3">{group.title}</span>
              )}

              <div className="space-y-1" role="list">
                {group.items.map((item) => {
                  const isActive = getIsActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex h-11 items-center gap-3 rounded-[13px] px-3 text-[13px] transition-colors duration-200",
                        isActive
                          ? "font-semibold text-text"
                          : "font-medium text-text-muted hover:bg-white/[0.04] hover:text-text",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                      role="listitem"
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active"
                          transition={{ type: "spring", stiffness: 380, damping: 34 }}
                          className="absolute inset-0 -z-10 rounded-[13px] border border-brand-500/35 bg-gradient-to-r from-brand-500/[0.14] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        >
                          <span className="absolute left-0 top-2.5 bottom-2.5 w-[2.5px] rounded-r-full bg-brand-400 shadow-[0_0_10px_rgba(62,230,200,0.8)]" />
                        </motion.span>
                      )}

                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-all duration-200",
                          isActive
                            ? "text-brand-400"
                            : "text-text-dim group-hover:text-text-muted",
                          hoveredItem === item.href && !isActive && "scale-110"
                        )}
                        strokeWidth={1.9}
                      />

                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="relative space-y-3 border-t border-glass-border pt-3">
        {/* Engine Status */}
        {!collapsed && (
          <div className="rounded-[12px] border border-glass-border bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                <Activity className="h-3 w-3 text-buy" />
                Engine
              </span>
              <LivePill state="LIVE" compact />
            </div>
          </div>
        )}

        {/* Vault Summary */}
        {!collapsed && (
          <div className="rounded-[12px] border border-glass-border bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
                <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-r from-mint-500 to-brand-500" />
                Vault
              </span>
              <span className="font-mono text-[11px] tabular-nums text-text">
                {availableCredits.toLocaleString()} / {totalCredits.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-mint-500 to-brand-500 transition-[width] duration-500 ease-smooth"
                style={{ width: `${(availableCredits / totalCredits) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* User */}
        <Link
          href="/login"
          className={cn(
            "group flex items-center gap-2.5 rounded-[13px] border border-glass-border bg-white/[0.02] p-2 transition-colors",
            "hover:border-brand-500/30 hover:bg-brand-500/[0.07]",
            collapsed && "justify-center"
          )}
          title="trader_01 (Demo Account)"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-brand-500/35 bg-brand-500/15 text-brand-300">
            <User className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate">
              <p className="truncate text-[12px] font-semibold text-text transition-colors group-hover:text-brand-300">
                trader_01
              </p>
              <p className="font-mono text-[10px] text-text-dim">
                {availableCredits.toLocaleString()} Credits
              </p>
            </span>
          )}
        </Link>

        {/* Logout & SIM Notice */}
        {!collapsed && (
          <>
            <button
              type="button"
              className={cn(
                "group w-full flex items-center gap-2.5 rounded-[13px] border border-glass-border bg-white/[0.02] p-2 transition-colors",
                "hover:border-sell/30 hover:bg-sell-tint hover:text-sell"
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-glass-border bg-white/[0.03] text-text-dim group-hover:text-sell group-hover:border-sell/30">
                <LogOut className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 truncate text-[12px] font-medium text-text-muted group-hover:text-sell">
                Log Out
              </span>
            </button>

            <div className="flex items-start gap-1.5 rounded-[11px] border border-glass-border bg-white/[0.015] p-2.5 text-[10px] leading-relaxed text-text-dim">
              <span className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--sim)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
                  <path d="M2 12h20" strokeDasharray="4 4" />
                </svg>
              </span>
              <span>Simulated market. Funds are simulated credits. Activity includes simulated traders.</span>
            </div>
          </>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-tile border border-glass-border bg-white/[0.03] text-text-dim transition-colors hover:border-sell/30 hover:bg-sell-tint hover:text-sell"
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <SimBadge label="SIM" size="sm" />
          </div>
        )}
      </div>
    </aside>
  );
}