'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore, type ToastItem } from '@/lib/store';
import { sound } from '@/lib/sound';
import {
  CheckCircle2, AlertOctagon, AlertTriangle, Sparkles, X,
  ArrowUpRight, ShieldCheck, Zap
} from 'lucide-react';

const VARIANT_CONFIG = {
  success: {
    icon: <CheckCircle2 size={16} className="text-[#3DDC6E]" />,
    iconBg: 'bg-[rgba(61,220,110,0.14)]',
    border: 'border-[rgba(61,220,110,0.32)]',
    glow: 'shadow-[0_0_24px_-2px_rgba(61,220,110,0.22),0_12px_32px_rgba(0,0,0,0.8)]',
    barColor: '#3DDC6E',
    badge: 'CONFIRMED',
    badgeStyle: 'bg-[rgba(61,220,110,0.12)] text-[#3DDC6E] border-[rgba(61,220,110,0.25)]',
  },
  error: {
    icon: <AlertOctagon size={16} className="text-[#FF5A5F]" />,
    iconBg: 'bg-[rgba(255,90,95,0.14)]',
    border: 'border-[rgba(255,90,95,0.35)]',
    glow: 'shadow-[0_0_24px_-2px_rgba(255,90,95,0.25),0_12px_32px_rgba(0,0,0,0.8)]',
    barColor: '#FF5A5F',
    badge: 'REJECTED',
    badgeStyle: 'bg-[rgba(255,90,95,0.12)] text-[#FF5A5F] border-[rgba(255,90,95,0.25)]',
  },
  warn: {
    icon: <AlertTriangle size={16} className="text-[#FFB547]" />,
    iconBg: 'bg-[rgba(255,181,71,0.14)]',
    border: 'border-[rgba(255,181,71,0.35)]',
    glow: 'shadow-[0_0_24px_-2px_rgba(255,181,71,0.22),0_12px_32px_rgba(0,0,0,0.8)]',
    barColor: '#FFB547',
    badge: 'CIRCUIT BREAKER',
    badgeStyle: 'bg-[rgba(255,181,71,0.12)] text-[#FFB547] border-[rgba(255,181,71,0.25)]',
  },
  info: {
    icon: <Sparkles size={16} className="text-[var(--lav)]" />,
    iconBg: 'bg-[rgba(185,167,255,0.14)]',
    border: 'border-[rgba(185,167,255,0.32)]',
    glow: 'shadow-[0_0_24px_-2px_rgba(123,47,247,0.25),0_12px_32px_rgba(0,0,0,0.8)]',
    barColor: '#B9A7FF',
    badge: 'DISPATCH',
    badgeStyle: 'bg-[rgba(185,167,255,0.12)] text-[var(--lav)] border-[rgba(185,167,255,0.25)]',
  },
};

function ToastCard({ t }: { t: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const config = VARIANT_CONFIG[t.variant] || VARIANT_CONFIG.info;
  const durationMs = t.autoDismissMs ?? 4000;

  useEffect(() => {
    // Play subtle audio cue on toast notification
    if (t.variant === 'success') {
      sound.playChime(660);
    } else if (t.variant === 'error' || t.variant === 'warn') {
      sound.playChime(320);
    } else {
      sound.playClick();
    }
  }, [t.variant]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      role="status"
      aria-live="polite"
      data-testid="toast"
      className={`toast relative w-[360px] max-w-[calc(100vw-36px)] rounded-2xl bg-[linear-gradient(165deg,rgba(18,15,28,0.96)_0%,rgba(10,8,18,0.98)_100%)] border ${config.border} ${config.glow} backdrop-blur-xl p-3.5 overflow-hidden select-none`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Glowing Icon Square */}
          <div className={`w-8 h-8 rounded-xl ${config.iconBg} border border-[rgba(255,255,255,0.08)] flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
            {config.icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${config.badgeStyle}`}>
                {config.badge}
              </span>
              <span className="text-[10px] font-mono text-[var(--muted)]">Just now</span>
            </div>
            <h4 className="font-display font-semibold text-xs text-white leading-snug truncate">
              {t.title}
            </h4>
            {t.body && (
              <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed font-sans">
                {t.body}
              </p>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            dismiss(t.id);
          }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer shrink-0 mt-0.5"
          aria-label="Dismiss notification"
        >
          <X size={13} />
        </button>
      </div>

      {/* Action Button (Optional) */}
      {t.action && (
        <div className="mt-2.5 pt-2 border-t border-[rgba(255,255,255,0.06)] flex justify-end">
          {t.action.href ? (
            <Link
              href={t.action.href}
              onClick={() => dismiss(t.id)}
              className="text-[11px] font-mono font-bold text-[var(--lav)] hover:underline flex items-center gap-1"
            >
              <span>{t.action.label}</span>
              <ArrowUpRight size={12} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick?.();
                dismiss(t.id);
              }}
              className="text-[11px] font-mono font-bold text-[var(--lav)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t.action.label}</span>
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Depleting Progress Timer Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className="h-full origin-left"
          style={{
            backgroundColor: config.barColor,
            boxShadow: `0 0 8px ${config.barColor}`,
            animation: `toast-progress ${durationMs}ms linear forwards`,
          }}
        />
      </div>
    </motion.div>
  );
}

export function ToastRegion() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      aria-label="System Notifications"
      role="region"
    >
      <div className="flex flex-col gap-2.5 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastCard key={t.id} t={t} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
