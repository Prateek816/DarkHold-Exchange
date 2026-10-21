"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { SimBadge } from "@/components/ui/SimBadge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname();

  const navGroups = [
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

  return (
    <aside
      className={cn(
        "sticky top-5 h-[calc(100vh-40px)] rounded-[28px] border border-glass-border bg-canvas/80 backdrop-blur-[24px] shadow-glass",
        "flex flex-col justify-between p-3.5 z-40 transition-all duration-300 overflow-hidden shrink-0",
        collapsed ? "w-[76px]" : "w-[248px]",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(124, 92, 255, 0.18) 0%, rgba(8, 11, 16, 0.85) 30%, rgba(4, 6, 10, 0.95) 100%)",
        boxShadow: "0 20px 50px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Top Brand Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:ring-1 focus-visible:ring-brand-500 rounded-lg p-0.5 group"
          >
            {/* Original Darkhold Sigil Mark */}
            <div className="w-8 h-8 rounded-tile border border-brand-500/40 bg-brand-500/10 flex items-center justify-center shrink-0 shadow-glow-teal group-hover:border-brand-400 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[2]">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                <circle cx="12" cy="12" r="3" fill="#19CBB0" />
              </svg>
            </div>

            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-sans font-bold text-sm tracking-tight text-text leading-tight">
                  Darkhold
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-text-dim leading-none">
                  Exchange
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Chevron Button */}
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-tile border border-glass-border bg-white/[0.03] hover:bg-white/[0.08] text-text-muted hover:text-text flex items-center justify-center transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-4 pt-2">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <span className="px-3 text-[11px] font-mono uppercase tracking-wider text-text-dim block">
                  {group.title}
                </span>
              )}

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
                        "relative flex items-center gap-3 h-11 px-3 rounded-[14px] text-xs font-medium transition-all group",
                        isActive
                          ? "text-text font-semibold"
                          : "text-text-muted hover:text-text hover:bg-white/[0.04]",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Active Sliding Pill with 2px Brand Bar */}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          transition={{ type: "spring", stiffness: 350, damping: 32 }}
                          className="absolute inset-0 rounded-[14px] border border-brand-500/40 bg-white/[0.06] backdrop-blur-md shadow-glow-teal -z-10"
                        >
                          <span className="absolute right-0 top-2 bottom-2 w-[2.5px] rounded-l bg-brand-400" />
                        </motion.div>
                      )}

                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                          isActive ? "text-brand-400" : "text-text-muted"
                        )}
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

      {/* Bottom Area: User Capsule & Persistent Disclaimer Note */}
      <div className="space-y-3 pt-3 border-t border-glass-border">
        {/* User Capsule */}
        <Link
          href="/login"
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-[14px] border border-glass-border bg-white/[0.02] hover:bg-white/[0.06] transition-colors group",
            collapsed && "justify-center p-2"
          )}
          title="trader_01 (Demo Account)"
        >
          <div className="w-7 h-7 rounded-tile bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          {!collapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-text truncate group-hover:text-brand-400 transition-colors">
                trader_01
              </p>
              <p className="text-[10px] text-text-dim font-mono">5,000 Credits</p>
            </div>
          )}
        </Link>

        {/* Persistent Disclaimer Note */}
        {!collapsed && (
          <div className="p-2.5 rounded-panel border border-glass-border bg-white/[0.015] text-[10px] font-mono text-text-dim leading-relaxed flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-text-dim shrink-0 mt-0.5" />
            <span>Simulated market. Funds are simulated credits. Activity includes simulated traders.</span>
          </div>
        )}
      </div>
    </aside>
  );
}
