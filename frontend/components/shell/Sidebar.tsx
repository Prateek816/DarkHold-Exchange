"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Layers,
  Terminal,
  Gavel,
  Shield,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  Info,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/authStore";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

const NAV_GROUPS = [
  {
    title: "Exchange",
    items: [
      { href: "/market", label: "Marketplace", icon: Layers },
      { href: "/trade/DARKHOLD-PASS-2026", label: "Terminal", icon: Terminal },
      { href: "/auctions", label: "Dutch Auctions", icon: Gavel },
    ],
  },
  {
    title: "Solvency & Control",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: Shield },
      { href: "/demo", label: "Demo Console", icon: Sparkles },
    ],
  },
];

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <aside
      className={cn(
        "sticky top-5 h-[calc(100vh-40px)] overflow-hidden rounded-[26px] border border-glass-border",
        "flex flex-col justify-between p-3.5 z-40 transition-[width] duration-300 ease-smooth shrink-0",
        collapsed ? "w-[78px]" : "w-[252px]",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(124, 92, 255, 0.14) 0%, rgba(8, 11, 16, 0.9) 26%, rgba(4, 6, 10, 0.96) 100%)",
        boxShadow:
          "0 30px 70px -30px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Ambient inner glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-500/15 blur-[70px]"
      />

      <div className="relative space-y-5">
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 px-1.5 pt-1">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-[12px] p-0.5 focus-visible:ring-1 focus-visible:ring-brand-500"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-brand-500/40 bg-gradient-to-br from-brand-500/20 to-violet-500/10 shadow-glow-teal transition-transform duration-500 group-hover:rotate-[8deg]">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.8]">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                <circle cx="12" cy="12" r="3" fill="#19CBB0" />
              </svg>
              <span className="absolute inset-0 rounded-[12px] ring-1 ring-inset ring-white/10" />
            </span>

            {!collapsed && (
              <span className="flex min-w-0 flex-col">
                <span className="font-display text-[15px] font-bold leading-tight tracking-tight text-text">
                  Darkhold
                </span>
                <span className="font-mono text-[9px] uppercase leading-none tracking-[0.28em] text-text-dim">
                  Exchange
                </span>
              </span>
            )}
          </Link>

          <button
            onClick={onToggleCollapse}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-glass-border bg-white/[0.03] text-text-dim transition-all hover:border-glass-border-strong hover:bg-white/[0.08] hover:text-text"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!collapsed && <span className="eyebrow block px-3">{group.title}</span>}

              <div className="space-y-1">
                {group.items.map((item) => {
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
                        "group relative flex h-11 items-center gap-3 rounded-[13px] px-3 text-[13px] transition-colors duration-200",
                        isActive
                          ? "font-semibold text-text"
                          : "font-medium text-text-muted hover:bg-white/[0.04] hover:text-text",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
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
                          "h-[17px] w-[17px] shrink-0 transition-all duration-200 group-hover:scale-110",
                          isActive
                            ? "text-brand-400"
                            : "text-text-dim group-hover:text-text-muted"
                        )}
                        strokeWidth={1.9}
                      />

                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="relative space-y-2.5 border-t border-glass-border pt-3">
        {!collapsed && (
          <div className="flex items-center justify-between rounded-[12px] border border-glass-border bg-white/[0.02] px-3 py-2">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
              <Activity className="h-3 w-3 text-buy" />
              Engine
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-buy">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-buy opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-buy" />
              </span>
              NOMINAL
            </span>
          </div>
        )}

        <Link
          href="/login"
          className={cn(
            "group flex items-center gap-2.5 rounded-[13px] border border-glass-border bg-white/[0.02] p-2 transition-colors hover:border-violet-500/30 hover:bg-violet-500/[0.07]",
            collapsed && "justify-center"
          )}
          title={`${user?.name || "trader_01"} (${user?.email || "Account"})`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-violet-500/35 bg-violet-500/15 text-violet-300">
            <User className="h-3.5 w-3.5" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate">
              <p className="truncate text-[12px] font-semibold text-text transition-colors group-hover:text-violet-300">
                {user?.name || "trader_01"}
              </p>
              <p className="font-mono text-[10px] text-text-dim">5,000 Credits</p>
            </span>
          )}
        </Link>

        {!collapsed && (
          <div className="flex items-start gap-1.5 rounded-[11px] border border-glass-border bg-white/[0.015] p-2.5 text-[10px] leading-relaxed text-text-dim">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>Simulated market. Funds are simulated credits. Activity includes simulated traders.</span>
          </div>
        )}
      </div>
    </aside>
  );
}
