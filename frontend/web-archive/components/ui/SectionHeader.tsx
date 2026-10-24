"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Icon on the left */
  icon?: React.ReactNode;
  /** Actions on the right (e.g., three-dots menu) */
  actions?: React.ReactNode;
  /** Show three-dots menu button */
  showMenuButton?: boolean;
  /** Menu button onClick */
  onMenuClick?: () => void;
  className?: string;
}

/**
 * SectionHeader — IconTile + title + muted subtitle + optional menu button.
 * Used at the top of cards/panels.
 */
export function SectionHeader({
  title,
  subtitle,
  icon,
  actions,
  showMenuButton = false,
  onMenuClick,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="icon-tile variant-neutral shrink-0">{icon}</div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-display text-[18px] md:text-[20px] font-semibold leading-tight tracking-tight text-text">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12px] leading-relaxed text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-tile border border-glass-border bg-white/[0.03] text-text-dim transition-colors hover:border-glass-border-strong hover:bg-white/[0.08] hover:text-text"
            aria-label="More options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}