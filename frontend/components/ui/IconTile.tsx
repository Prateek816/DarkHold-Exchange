"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconTileProps {
  icon: LucideIcon;
  variant?: "teal" | "violet" | "neutral" | "sell" | "amber";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IconTile({
  icon: Icon,
  variant = "teal",
  size = "md",
  className,
}: IconTileProps) {
  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 rounded-[10px]"
      : size === "lg"
      ? "w-12 h-12 rounded-[15px]"
      : "w-10 h-10 rounded-tile";

  const iconSizes = size === "sm" ? 15 : size === "lg" ? 22 : 18;

  const variantClasses =
    variant === "teal"
      ? "border-brand-500/25 bg-gradient-to-br from-brand-500/15 to-brand-500/[0.04] text-brand-400"
      : variant === "violet"
      ? "border-violet-500/25 bg-gradient-to-br from-violet-500/15 to-violet-500/[0.04] text-violet-300"
      : variant === "sell"
      ? "border-sell/25 bg-gradient-to-br from-sell/15 to-sell/[0.04] text-sell-text"
      : variant === "amber"
      ? "border-warning/25 bg-gradient-to-br from-warning/15 to-warning/[0.04] text-warning"
      : "border-glass-border bg-white/[0.035] text-text-muted";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 group-hover:scale-105",
        sizeClasses,
        variantClasses,
        className
      )}
    >
      <Icon size={iconSizes} strokeWidth={1.75} />
    </div>
  );
}
