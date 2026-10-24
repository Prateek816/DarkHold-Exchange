"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Check,
  Copy,
  Info,
  X,
} from "lucide-react";
import { IconTile } from "@/components/ui/IconTile";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  requestId?: string;
  countdownSeconds?: number;
}

interface ToastRegionProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyRequestId = (reqId: string) => {
    navigator.clipboard?.writeText(reqId);
    setCopiedId(reqId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-3 top-3 z-[70] flex w-full max-w-sm flex-col gap-2.5 sm:right-5 sm:top-5"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          let icon = CheckCircle2;
          let variant: "brand" | "mint" | "neutral" | "sell" | "amber" = "mint";
          let borderClass = "border-buy/35";
          let accent = "bg-buy";

          if (toast.type === "error") {
            icon = AlertOctagon;
            variant = "sell";
            borderClass = "border-sell/40";
            accent = "bg-sell";
          } else if (toast.type === "warning") {
            icon = AlertTriangle;
            variant = "amber";
            borderClass = "border-warning/40";
            accent = "bg-warning";
          } else if (toast.type === "info") {
            icon = Info;
            variant = "brand";
            borderClass = "border-brand-500/35";
            accent = "bg-brand-400";
          }

          const lifetime = toast.countdownSeconds ?? 6;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 28, transition: { duration: 0.18 } }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              role="status"
              className={cn(
                "pointer-events-auto relative overflow-hidden border bg-surface p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]",
                borderClass
              )}
            >
              <span className={cn("absolute inset-y-0 left-0 w-[2px]", accent)} />

              <div className="flex items-start justify-between gap-3 pl-1">
                <div className="flex items-start gap-3">
                  <IconTile icon={icon} variant={variant} size="sm" />
                  <div className="min-w-0 space-y-1">
                    {toast.title && (
                      <p className="text-[12px] font-semibold leading-snug text-text">
                        {toast.title}
                      </p>
                    )}
                    <p className="text-[11.5px] leading-relaxed text-text-muted">
                      {toast.message}
                    </p>

                    {toast.requestId && (
                      <div className="flex items-center gap-1.5 pt-1 font-mono text-[9.5px] text-text-dim">
                        <span className="truncate">Ref: {toast.requestId}</span>
                        <button
                          type="button"
                          onClick={() => copyRequestId(toast.requestId!)}
                          className="p-0.5 transition-colors hover:text-text"
                          title="Copy request ID"
                          aria-label="Copy request ID"
                        >
                          {copiedId === toast.requestId ? (
                            <Check className="h-3 w-3 text-brand-300" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {toast.countdownSeconds !== undefined && toast.countdownSeconds > 0 && (
                      <p className="pt-0.5 font-mono text-[9.5px] text-warning">
                        Unlocks in {toast.countdownSeconds}s…
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="border border-glass-border p-1 text-text-dim transition-colors hover:text-text"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 h-[2px] w-full overflow-hidden bg-white/[0.05]">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: lifetime, ease: "linear" }}
                  className={cn("h-full", accent)}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
