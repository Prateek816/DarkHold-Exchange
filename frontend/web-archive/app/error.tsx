"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

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
    <div className="page-shell mx-auto w-full max-w-2xl">
      <div className="border border-sell/40 bg-surface p-8 text-center sm:p-10">
        <span className="mx-auto flex h-11 w-11 items-center justify-center border border-sell/40 text-sell">
          <AlertCircle className="h-5 w-5" />
        </span>

        <span className="eyebrow mt-5 inline-flex text-sell-text">Runtime error</span>
        <h1 className="pt-2 font-display text-[38px] leading-none text-text">
          This view failed to render
        </h1>
        <p className="mx-auto max-w-md pt-3 text-[11.5px] leading-relaxed text-text-muted">
          {error.message ||
            "An unexpected error stopped this screen. No order, balance or auction state was changed by the failure itself — refresh the ledger to read server truth again."}
        </p>
        {error.digest && (
          <p className="pt-3 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-dim">
            Digest · {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 bg-brand-400 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-canvas transition-colors hover:bg-brand-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href="/market"
            className="flex items-center gap-1.5 border border-glass-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            The board
          </Link>
        </div>
      </div>
    </div>
  );
}
