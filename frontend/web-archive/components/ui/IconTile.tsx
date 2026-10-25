"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconTileProps {
  icon: LucideIcon;
  variant?: "brand" | "mint" | "sell" | "amber" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
  strokeWidth?: number;
}

/** Flat sigil holder — 40px glass rounded-12 with thin-stroke Lucide icon */
export function IconTile({
  icon: Icon,
  variant = "neutral",
  size = "md",
  className,
  strokeWidth = 1.75,
}: IconTileProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }[size];

  const iconSizes = { sm: 15, md: 18, lg: 22 }[size];

  const variantClasses = {
    brand: "border-brand-500/35 bg-brand-500/[0.08] text-brand-400",
    mint: "border-mint-500/35 bg-mint-500/[0.08] text-mint-400",
    sell: "border-sell/35 bg-sell/[0.08] text-sell",
    amber: "border-warning/35 bg-warning/[0.08] text-warning",
    neutral: "border-glass-border bg-white/[0.025] text-text-muted",
  }[variant];

  return (
    <div
      className={cn(
        "icon-tile flex shrink-0 items-center justify-center border rounded-tile",
        sizeClasses,
        variantClasses,
        className
      )}
    >
      <Icon size={iconSizes} strokeWidth={strokeWidth} />
    </div>
  );
}