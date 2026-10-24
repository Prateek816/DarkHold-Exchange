'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertTriangle, AlertOctagon, Printer } from 'lucide-react';
import { useUserStore } from '@/lib/store';
import { formatTime } from '@/lib/formatters';

export function ReceiptToaster() {
  const toasts = useUserStore((s) => s.toasts);
  const removeToast = useUserStore((s) => s.removeToast);

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.slice(0, 4).map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto relative w-full bg-[#080d1a]/95 border border-cyan/40 p-4 rounded-2xl shadow-cyan-glow font-mono text-xs text-white backdrop-blur-2xl cyber-top-rim"
          >
            {/* Slot Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08] text-[10px] text-ink-muted">
              <span className="flex items-center gap-1.5 font-bold text-cyan">
                <Printer className="w-3.5 h-3.5" />
                EXECUTION CONFIRMATION // {formatTime(toast.timestamp)}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                className="hover:text-white transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Receipt body */}
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-market-buy shrink-0 mt-0.5" />
              ) : toast.type === 'warn' ? (
                <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-market-sell shrink-0 mt-0.5" />
              )}

              <div>
                <div className="font-bold text-xs uppercase tracking-tight text-white">
                  {toast.title}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                  {toast.detail}
                </div>
              </div>
            </div>

            {/* Barcode footer */}
            <div className="mt-3 pt-2 border-t border-white/[0.06] text-[9px] text-cyan/30 tracking-widest text-center">
              ||| | ||||| || |||||| | |||| | ||
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
