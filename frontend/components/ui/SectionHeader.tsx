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
    <div className={cn("flex items-center justify-between gap-4 pb-2", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <IconTile icon={icon} variant={iconVariant} />}
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-text tracking-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-text-muted truncate font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="w-9 h-9 rounded-tile border border-glass-border bg-white/[0.035] hover:bg-white/[0.07] text-text-muted hover:text-text flex items-center justify-center transition-colors focus-visible:ring-1 focus-visible:ring-brand-500"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
