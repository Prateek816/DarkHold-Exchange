"use client";

import React from "react";
import { LucideIcon, MoreHorizontal } from "lucide-react";
import { IconTile } from "./IconTile";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon?: LucideIcon;
  iconVariant?: "teal" | "violet" | "neutral" | "sell" | "amber";
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  className?: string;
}

export function SectionHeader({
  icon,
  iconVariant = "teal",
  title,
  subtitle,
  actions,
  showMenuButton = false,
  onMenuClick,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconTile icon={icon} variant={iconVariant} size="sm" />}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-text">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12px] font-normal text-text-muted">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-glass-border bg-white/[0.035] text-text-muted transition-colors hover:bg-white/[0.07] hover:text-text focus-visible:ring-1 focus-visible:ring-brand-500"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
