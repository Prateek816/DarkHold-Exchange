"use client";

import React, { useState } from "react";
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
    navigator.clipboard.writeText(reqId);
    setCopiedId(reqId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        let icon = CheckCircle2;
        let variant: "teal" | "sell" | "amber" | "neutral" = "teal";
        let borderClass = "border-brand-500/30";

        if (toast.type === "error") {
          icon = AlertOctagon;
          variant = "sell";
          borderClass = "border-sell/40";
        } else if (toast.type === "warning") {
          icon = AlertTriangle;
          variant = "amber";
          borderClass = "border-warning/40";
        } else if (toast.type === "info") {
          icon = Info;
          variant = "teal";
          borderClass = "border-brand-500/30";
        }

        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto p-4 rounded-panel shadow-glass border backdrop-blur-[20px] bg-canvas-elevated/95",
              "transition-all duration-300 animate-in fade-in slide-in-from-top-3 flex flex-col gap-2 relative overflow-hidden",
              borderClass
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IconTile icon={icon} variant={variant} size="sm" />
                <div className="space-y-1">
                  {toast.title && (
                    <p className="text-xs font-semibold text-text font-sans">{toast.title}</p>
                  )}
                  <p className="text-xs text-text-muted leading-relaxed font-sans">{toast.message}</p>

                  {/* Copyable Request ID */}
                  {toast.requestId && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-text-dim">
                      <span>Ref: {toast.requestId}</span>
                      <button
                        onClick={() => copyRequestId(toast.requestId!)}
                        className="hover:text-text transition-colors p-0.5"
                        title="Copy Request ID"
                      >
                        {copiedId === toast.requestId ? (
                          <Check className="w-3 h-3 text-brand-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Countdown notice if rate limited */}
                  {toast.countdownSeconds !== undefined && toast.countdownSeconds > 0 && (
                    <p className="text-[11px] font-mono text-warning pt-0.5">
                      Unlocks in {toast.countdownSeconds}s...
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="text-text-dim hover:text-text p-1 rounded-md transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Progress Line */}
            <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden mt-1">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  toast.type === "error"
                    ? "bg-sell"
                    : toast.type === "warning"
                    ? "bg-warning"
                    : "bg-brand-400"
                )}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
