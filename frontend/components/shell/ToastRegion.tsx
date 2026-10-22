"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertOctagon, Info, AlertTriangle, X, Copy, Check } from "lucide-react";
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
          let variant: "teal" | "sell" | "amber" | "neutral" = "teal";
          let borderClass = "border-brand-500/30";
          let accent = "bg-brand-400";
          let glow = "shadow-[0_0_26px_rgba(25,203,176,0.16)]";

          if (toast.type === "error") {
            icon = AlertOctagon;
            variant = "sell";
            borderClass = "border-sell/40";
            accent = "bg-sell";
            glow = "shadow-[0_0_26px_rgba(240,80,110,0.18)]";
          } else if (toast.type === "warning") {
            icon = AlertTriangle;
            variant = "amber";
            borderClass = "border-warning/40";
            accent = "bg-warning";
            glow = "shadow-[0_0_26px_rgba(245,181,68,0.16)]";
          } else if (toast.type === "info") {
            icon = Info;
            variant = "teal";
            borderClass = "border-brand-500/30";
            accent = "bg-brand-400";
          }

          const lifetime = toast.countdownSeconds ?? 6;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              role="status"
              className={cn(
                "pointer-events-auto relative overflow-hidden rounded-panel border bg-canvas-elevated/95 p-4 backdrop-blur-[20px]",
                "shadow-glass-sm",
                borderClass,
                glow
              )}
            >
              {/* Left accent rail */}
              <span className={cn("absolute inset-y-3 left-0 w-[2px] rounded-r-full", accent)} />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <IconTile icon={icon} variant={variant} size="sm" />
                  <div className="min-w-0 space-y-1">
                    {toast.title && (
                      <p className="font-display text-[12.5px] font-semibold leading-snug text-text">
                        {toast.title}
                      </p>
                    )}
                    <p className="text-[12px] leading-relaxed text-text-muted">{toast.message}</p>

                    {toast.requestId && (
                      <div className="flex items-center gap-1.5 pt-1 font-mono text-[10px] text-text-dim">
                        <span className="truncate">Ref: {toast.requestId}</span>
                        <button
                          onClick={() => copyRequestId(toast.requestId!)}
                          className="rounded-[6px] p-0.5 transition-colors hover:text-text"
                          title="Copy request ID"
                          aria-label="Copy request ID"
                        >
                          {copiedId === toast.requestId ? (
                            <Check className="h-3 w-3 text-brand-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {toast.countdownSeconds !== undefined && toast.countdownSeconds > 0 && (
                      <p className="pt-0.5 font-mono text-[10px] text-warning">
                        Unlocks in {toast.countdownSeconds}s…
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDismiss(toast.id)}
                  className="rounded-[7px] p-1 text-text-dim transition-colors hover:bg-white/[0.06] hover:text-text"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Lifetime progress */}
              <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: lifetime, ease: "linear" }}
                  className={cn("h-full rounded-full", accent)}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
