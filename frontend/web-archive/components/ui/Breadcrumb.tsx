"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Separator */
  separator?: React.ReactNode;
  className?: string;
}

/**
 * Breadcrumb — Navigation breadcrumb with chevron separators.
 * Last item is current page (non-clickable).
 */
export function Breadcrumb({ items, separator, className }: BreadcrumbProps) {
  const defaultSeparator = (
    <ChevronRight className="h-3.5 w-3.5 text-text-dim shrink-0" aria-hidden="true" />
  );

  return (
    <nav className={cn("flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]", className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5" role="list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-text-dim" aria-hidden="true">
                  {separator ?? defaultSeparator}
                </span>
              )}
              {isLast ? (
                <span className="text-text" aria-current="page">{item.label}</span>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="link-line text-text-muted hover:text-brand-400"
                >
                  {item.label}
                </a>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="link-line text-text-muted hover:text-brand-400 bg-transparent border-0 p-0 font-inherit cursor-pointer"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-text-muted">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}