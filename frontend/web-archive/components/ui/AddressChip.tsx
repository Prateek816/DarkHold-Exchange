"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressChipProps {
  value: string;
  /** Optional label prefix */
  label?: string;
  /** Truncate middle */
  truncate?: boolean;
  /** Show copy button */
  copyable?: boolean;
  /** Copied callback */
  onCopy?: () => void;
  className?: string;
}

/**
 * AddressChip — Monospace, bordered chip with copy icon.
 * For trade IDs, order IDs, ledger TXN IDs, request IDs.
 */
export function AddressChip({
  value,
  label,
  truncate = true,
  copyable = true,
  onCopy,
  className,
}: AddressChipProps) {
  const [copied, setCopied] = useState(false);

  const displayValue = truncate && value.length > 20
    ? `${value.slice(0, 10)}…${value.slice(-8)}`
    : value;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch {
      // fallback
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[8px] border border-glass-border bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10.5px] tabular-nums text-text transition-colors hover:border-glass-border-strong",
        className
      )}
    >
      {label && (
        <span className="text-text-dim pr-1">{label}</span>
      )}
      <span className="font-mono tabular-nums" title={value}>
        {displayValue}
      </span>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex-shrink-0 p-0.5 rounded-[6px] text-text-dim transition-colors hover:text-brand-400 hover:bg-white/[0.05]",
            copied && "text-buy"
          )}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </span>
  );
}