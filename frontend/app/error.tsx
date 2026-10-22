"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime error caught:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-card border border-sell/30 bg-gradient-to-br from-sell/[0.08] via-white/[0.02] to-transparent p-8 shadow-glass backdrop-blur-[18px]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sell/50 to-transparent" />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-sell/40 bg-sell/10 text-sell shadow-[0_0_24px_rgba(240,80,110,0.25)]">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="space-y-2 pt-5">
          <span className="eyebrow text-sell/80">Runtime exception</span>
          <h2 className="font-display text-xl font-semibold tracking-tight text-text">
            Something went wrong
          </h2>
          <p className="mx-auto max-w-sm text-[12px] leading-relaxed text-text-muted">
            {error.message ||
              "An unexpected error occurred while executing the transaction pipeline."}
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-text-dim">digest · {error.digest}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-6">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-brand-400 to-brand-500 px-4 py-2.5 text-[11.5px] font-bold text-canvas shadow-[0_8px_24px_-8px_rgba(25,203,176,0.55)] transition-all hover:-translate-y-px"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry pipeline
          </button>
          <Link
            href="/market"
            className="flex items-center gap-1.5 rounded-[12px] border border-glass-border bg-white/[0.04] px-4 py-2.5 text-[11.5px] text-text transition-colors hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
