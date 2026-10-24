"use client";

import React, { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentedTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Badge count or text */
  badge?: number | string;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  activeId: string;
  onChange: (id: string) => void;
  /** Shared layoutId for FLIP animation across components */
  layoutId?: string;
  /** Variant for buy/sell tabs */
  variant?: "default" | "buy-sell";
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

/**
 * SegmentedTabs — Sliding indicator with FLIP animation via layoutId.
 * Variants: default (violet indicator), buy-sell (mint/rose indicators)
 */
export function SegmentedTabs({
  tabs,
  activeId,
  onChange,
  layoutId,
  variant = "default",
  size = "md",
  className,
}: SegmentedTabsProps) {
  const containerId = useId();
  const activeTab = tabs.find((t) => t.id === activeId);
  const activeIndex = tabs.findIndex((t) => t.id === activeId);

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-[10px]",
    md: "px-4 py-2 text-[11px]",
  }[size];

  const indicatorColors = {
    default: "bg-gradient-to-r from-brand-500 to-brand-400 shadow-[0_0_15px_rgba(124,92,255,0.5)]",
    "buy-sell": activeTab?.id === "BUY"
      ? "bg-gradient-to-r from-mint-500 to-mint-400 shadow-[0_0_15px_rgba(25,203,176,0.5)]"
      : "bg-gradient-to-r from-sell-solid to-sell shadow-[0_0_15px_rgba(224,64,94,0.5)]",
  };

  return (
    <div
      id={containerId}
      className={cn(
        "relative inline-flex items-center gap-1 rounded-[14px] bg-white/[0.02] border border-glass-border p-1",
        className
      )}
      role="tablist"
      aria-orientation="horizontal"
    >
      {/* Sliding indicator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          layoutId={layoutId}
          className={cn(
            "absolute inset-y-1 z-0 rounded-[12px] transition-none",
            indicatorColors[variant]
          )}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          initial={false}
        />
      </AnimatePresence>

      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeId}
          aria-controls={`${containerId}-panel-${tab.id}`}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.id)}
          className={cn(
            "relative z-10 flex items-center gap-2 font-medium rounded-[12px] transition-colors",
            sizeClasses,
            tab.id === activeId
              ? "text-canvas"
              : "text-text-muted hover:text-text",
            tab.disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {tab.icon && <span className="flex h-4 w-4" aria-hidden="true">{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && (
            <span className="flex items-center justify-center min-w-[18px] h-5 rounded-full bg-white/[0.05] font-mono text-[9px] tabular-nums text-text-dim">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}