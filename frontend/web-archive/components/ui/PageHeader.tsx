"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Main title */
  title: string;
  /** Description/subtitle */
  description?: string;
  /** Icon component (Lucide) */
  icon?: LucideIcon;
  /** Pre-rendered icon node */
  iconNode?: React.ReactNode;
  /** Badge or action on the right */
  badge?: React.ReactNode;
  /** Additional actions */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — Page title, description, icon, badge and actions.
 * Location is carried by the breadcrumb in the nav bar, so no label sits
 * above the heading here.
 */
export function PageHeader({
  title,
  description,
  icon: IconComponent,
  iconNode,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          {(IconComponent || iconNode) && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel border border-brand-500/35 bg-brand-500/[0.08] text-brand-400">
              {iconNode ?? (IconComponent && <IconComponent className="h-5 w-5" />)}
            </div>
          )}
          <div>
            <h1 className="font-display text-[26px] md:text-[32px] font-semibold leading-tight tracking-tight text-text">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-text-muted">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {badge && <div className="flex-shrink-0">{badge}</div>}
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}