"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  /** Auto-dismiss duration (ms), 0 = no auto-dismiss */
  duration?: number;
  /** Action button */
  action?: { label: string; onClick: () => void };
  /** Persist until manually dismissed */
  persistent?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

/** ToastProvider — Manages toast state globally */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearToasts = () => setToasts([]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastRegion toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/** Individual Toast Component */
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-buy" />,
  error: <AlertCircle className="h-5 w-5 text-sell" />,
  warning: <AlertCircle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-info" />,
  loading: <Loader2 className="h-5 w-5 text-brand-400 animate-spin" />,
};

const toastBg: Record<ToastType, string> = {
  success: "bg-buy-tint border-buy/30",
  error: "bg-sell-tint border-sell/30",
  warning: "bg-warning-tint border-warning/30",
  info: "bg-info-tint border-info/30",
  loading: "bg-brand-500/10 border-brand-500/30",
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    if (toast.duration && toast.duration > 0 && !toast.persistent) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 200);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  return (
    <motion.div
      className={cn(
        "flex items-start gap-3 rounded-card border p-4 glass-card shadow-card w-full max-w-md",
        toastBg[toast.type]
      )}
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex-shrink-0 mt-0.5">{toastIcons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[13px] text-text">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">{toast.message}</p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-pill border border-current/30 bg-white/[0.05] text-current transition-colors hover:bg-white/[0.1]"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => { setIsExiting(true); setTimeout(() => onRemove(toast.id), 200); }}
        className="flex-shrink-0 p-1 rounded-lg text-text-dim hover:text-text hover:bg-white/[0.05] transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/** ToastRegion — Fixed top-right container with ARIA live region */
export function ToastRegion({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div
      id="toast-region"
      className="fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Hook for easy access */
export function useToasts() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToasts must be used within ToastProvider");
  return context;
}