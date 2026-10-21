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
      ? "w-12 h-12 rounded-[14px]"
      : "w-10 h-10 rounded-tile";

  const iconSizes = size === "sm" ? 16 : size === "lg" ? 22 : 18;

  const variantClasses =
    variant === "teal"
      ? "border-brand-500/20 bg-brand-500/10 text-brand-400"
      : variant === "violet"
      ? "border-violet-500/25 bg-violet-500/10 text-violet-400"
      : variant === "sell"
      ? "border-sell/25 bg-sell/10 text-sell"
      : variant === "amber"
      ? "border-warning/25 bg-warning/10 text-warning"
      : "border-glass-border bg-white/[0.035] text-text-muted";

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 border backdrop-blur-sm shadow-sm transition-transform duration-200 group-hover:scale-105",
        sizeClasses,
        variantClasses,
        className
      )}
    >
      <Icon size={iconSizes} strokeWidth={1.75} />
    </div>
  );
}
