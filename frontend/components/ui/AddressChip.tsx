"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressChipProps {
  value: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export function AddressChip({
  value,
  label,
  truncate = false,
  className,
}: AddressChipProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue =
    truncate && value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "group inline-flex select-none items-center gap-1.5 rounded-[10px] border border-glass-border bg-white/[0.03] px-2 py-1",
        "font-mono text-[11px] text-text-muted transition-all hover:border-glass-border-strong hover:bg-white/[0.07] hover:text-text",
        className
      )}
      title={`Click to copy: ${value}`}
    >
      {label && <span className="text-[9px] uppercase tracking-[0.12em] text-text-dim">{label}</span>}
      <span className="font-medium text-text">{displayValue}</span>
      <span className="text-text-dim transition-colors group-hover:text-text">
        {copied ? (
          <Check className="h-3 w-3 stroke-[2.5] text-brand-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </span>
    </button>
  );
}
