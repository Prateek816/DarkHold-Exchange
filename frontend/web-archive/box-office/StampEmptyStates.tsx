'use client';

import React from 'react';
import { TicketX, PackageX, FileSpreadsheet } from 'lucide-react';

interface StampEmptyStateProps {
  stampText?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: 'ticket' | 'package' | 'ledger';
}

export function StampEmptyState({
  stampText = 'INSPECTION CLEAR',
  title,
  description,
  actionText,
  onAction,
  icon = 'ticket',
}: StampEmptyStateProps) {
  return (
    <div className="w-full py-12 px-4 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-dashed border-cyan/25 rounded-3xl my-4 backdrop-blur-xl">
      {/* Tilted Cyan Badge */}
      <div className="inline-block px-3.5 py-1 mb-4 rounded-full border border-cyan/40 bg-cyan/10 text-cyan font-mono text-xs font-bold uppercase tracking-widest shadow-cyan-glow">
        {stampText}
      </div>

      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white mb-3 shadow-inner">
        {icon === 'ticket' ? (
          <TicketX className="w-6 h-6 text-cyan" />
        ) : icon === 'package' ? (
          <PackageX className="w-6 h-6 text-amber" />
        ) : (
          <FileSpreadsheet className="w-6 h-6 text-ink-muted" />
        )}
      </div>

      <h4 className="font-display text-xl uppercase tracking-tight text-white font-bold">
        {title}
      </h4>
      <p className="text-xs font-mono text-ink-muted max-w-sm mt-1.5 mb-5 leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button onClick={onAction} className="btn-cyan text-xs font-bold uppercase px-5 py-2">
          {actionText}
        </button>
      )}
    </div>
  );
}
