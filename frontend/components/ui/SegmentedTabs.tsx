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
        "inline-flex items-center p-1 rounded-pill border border-glass-border bg-white/[0.025] backdrop-blur-md relative",
        size === "sm" ? "h-9 text-xs" : "h-11 text-xs sm:text-sm",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;

        // Custom styling for Buy/Sell tabs
        let activeGlow = "shadow-glow-teal border-brand-500/40 text-text font-semibold";
        if (variant === "violet") {
          activeGlow = "shadow-glow-violet border-violet-500/40 text-text font-semibold";
        } else if (variant === "buy-sell") {
          if (tab.id.toUpperCase().includes("BUY")) {
            activeGlow = "bg-buy text-canvas font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]";
          } else if (tab.id.toUpperCase().includes("SELL")) {
            activeGlow = "bg-sell text-white font-bold shadow-[0_0_15px_rgba(240,80,110,0.4)]";
          }
        }

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-1.5 rounded-pill font-medium transition-colors duration-200 z-10 flex items-center justify-center gap-1.5",
              isActive ? "text-text" : "text-text-muted hover:text-text",
              size === "sm" ? "text-xs" : "text-xs sm:text-sm"
            )}
          >
            {/* Sliding Pill Indicator */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className={cn(
                  "absolute inset-0 rounded-pill border bg-white/[0.08] backdrop-blur-sm -z-10",
                  activeGlow
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-pill bg-white/10 text-text-muted border border-white/5">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
