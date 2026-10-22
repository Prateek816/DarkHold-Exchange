"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabOption {
  id: string;
  label: string;
  badge?: string | number;
}

interface SegmentedTabsProps {
  tabs: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "brand" | "violet" | "buy-sell";
  size?: "sm" | "md";
  className?: string;
  layoutId?: string;
}

export function SegmentedTabs({
  tabs,
  activeId,
  onChange,
  variant = "brand",
  size = "md",
  className,
  layoutId = "segmented-pill",
}: SegmentedTabsProps) {
  return (
    <div
      className={cn(
        "relative inline-flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto no-scrollbar rounded-full border border-glass-border bg-white/[0.025] p-1 backdrop-blur-md",
        size === "sm" ? "h-8 text-[11px]" : "h-10 text-xs sm:text-[13px]",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;

        let activeStyles =
          "border-brand-500/40 bg-white/[0.075] text-text font-semibold shadow-[0_0_18px_rgba(25,203,176,0.16)]";

        if (variant === "violet") {
          activeStyles =
            "border-violet-500/40 bg-white/[0.075] text-text font-semibold shadow-[0_0_18px_rgba(124,92,255,0.18)]";
        } else if (variant === "buy-sell") {
          if (tab.id.toUpperCase().includes("BUY")) {
            activeStyles =
              "border-buy/60 bg-gradient-to-r from-buy to-[#1BA84E] text-[#03150A] font-bold shadow-[0_0_20px_rgba(34,197,94,0.32)]";
          } else if (tab.id.toUpperCase().includes("SELL")) {
            activeStyles =
              "border-sell/60 bg-gradient-to-r from-sell to-[#D63A58] text-white font-bold shadow-[0_0_20px_rgba(240,80,110,0.32)]";
          }
        }

        const isBuyTab = tab.id.toUpperCase().includes("BUY");
        const activeTextClass =
          variant === "buy-sell" && isBuyTab ? "text-[#03150A]" : "text-text";

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-1.5 font-medium transition-colors duration-200",
              isActive ? activeTextClass : "text-text-muted hover:text-text",
              size === "sm" ? "px-3 text-[11px]" : "px-4 text-xs sm:text-[13px]"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className={cn(
                  "absolute inset-0 -z-10 rounded-full border backdrop-blur-sm",
                  activeStyles
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[9px] tabular-nums",
                  isActive ? "text-current" : "text-text-muted"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
