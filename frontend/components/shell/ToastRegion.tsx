'use client';

import { useEffect } from 'react';
import { useToastStore, type ToastItem } from '@/lib/store';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICON: Record<ToastItem['variant'], React.ReactNode> = {
  success: <CheckCircle size={15} className="text-[var(--buy)]" />,
  error:   <XCircle    size={15} className="text-[var(--sell)]" />,
  warn:    <AlertTriangle size={15} className="text-[var(--ceiling)]" />,
  info:    <Info       size={15} className="text-[var(--sim)]" />,
};

const BORDER: Record<ToastItem['variant'], string> = {
  success: 'border-[var(--buy)] bg-[rgba(52,210,123,0.06)]',
  error:   'border-[var(--sell)] bg-[rgba(255,90,95,0.06)]',
  warn:    'border-[var(--ceiling)] bg-[rgba(255,181,71,0.06)]',
  info:    'border-[var(--sim)] bg-[rgba(94,220,245,0.06)]',
};

function Toast({ t }: { t: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 px-4 py-3 rounded-md border
        ${BORDER[t.variant]}
        shadow-deep backdrop-blur-sm
        animate-fade-in
      `}
      style={{ background: 'rgba(13,13,26,0.95)' }}
    >
      <span className="mt-0.5 shrink-0">{ICON[t.variant]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--text)]">{t.title}</div>
        {t.body && (
          <div className="text-[12px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{t.body}</div>
        )}
      </div>
      <button
        onClick={() => dismiss(t.id)}
        className="shrink-0 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastRegion() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="toast-container" aria-label="Notifications" role="region">
      {toasts.map((t) => <Toast key={t.id} t={t} />)}
    </div>
  );
}
