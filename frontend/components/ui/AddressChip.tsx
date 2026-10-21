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
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue = truncate && value.length > 14
    ? `${value.slice(0, 6)}...${value.slice(-6)}`
    : value;

  return (
    <div
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] border border-glass-border bg-white/[0.03] hover:bg-white/[0.07] hover:border-glass-border-strong",
        "font-mono text-xs text-text-muted hover:text-text cursor-pointer select-none transition-colors group",
        className
      )}
      title={`Click to copy: ${value}`}
    >
      {label && <span className="text-[10px] text-text-dim uppercase">{label}:</span>}
      <span className="text-text font-medium">{displayValue}</span>
      <span className="text-text-dim group-hover:text-text transition-colors">
        {copied ? (
          <Check className="w-3 h-3 text-brand-400 stroke-[2.5]" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </span>
    </div>
  );
}
