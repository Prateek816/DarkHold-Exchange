import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Canonical page header: eyebrow → display title → description, with actions
 * aligned to the right on desktop. Keeps every route on the same rhythm.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4",
        className
      )}
    >
      <div className="page-heading min-w-0">
        {(eyebrow || badge) && (
          <div className="flex flex-wrap items-center gap-2.5">
            {Icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-brand-500/25 bg-brand-500/10 text-brand-400">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
              </span>
            )}
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {badge}
          </div>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
