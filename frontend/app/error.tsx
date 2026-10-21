"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

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
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-16 bg-sell-tint border border-sell/40 flex items-center justify-center text-sell shadow-[0_0_20px_rgba(240,80,110,0.3)]">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-xs text-text-muted max-w-md">
          {error.message || "An unexpected error occurred while executing the transaction pipeline."}
        </p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-12 bg-brand-500 hover:bg-brand-400 text-bg font-semibold text-xs transition-all shadow-[0_0_18px_rgba(25,203,176,0.3)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
        <Link
          href="/market"
          className="px-4 py-2 rounded-12 bg-white/[0.04] border border-white/10 text-white text-xs hover:bg-white/[0.08] transition-colors"
        >
          Return to Market
        </Link>
      </div>
    </div>
  );
}
