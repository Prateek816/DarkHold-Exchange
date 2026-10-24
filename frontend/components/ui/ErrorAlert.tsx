'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, X, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ErrorAlertProps {
  message: string | null;
  code?: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorAlert({ message, code, onDismiss, className = '' }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={`p-3 rounded-2xl bg-[rgba(255,90,95,0.08)] border border-[rgba(255,90,95,0.3)] shadow-[0_0_18px_-2px_rgba(255,90,95,0.18)] flex items-start justify-between gap-3 text-xs font-sans text-white ${className}`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[rgba(255,90,95,0.18)] flex items-center justify-center shrink-0 mt-0.5 text-[#FF5A5F]">
            <AlertOctagon size={14} />
          </div>
          <div className="min-w-0">
            {code && (
              <span className="text-[10px] font-mono font-bold text-[#FF5A5F] block uppercase tracking-wider mb-0.5">
                {code}
              </span>
            )}
            <p className="text-[11px] leading-relaxed text-[#FFD6D8]">
              {message}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors shrink-0"
            aria-label="Dismiss error"
          >
            <X size={12} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
