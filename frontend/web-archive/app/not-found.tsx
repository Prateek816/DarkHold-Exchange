import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page-shell mx-auto w-full max-w-2xl">
      <div className="border border-glass-border bg-surface p-8 text-center sm:p-10">
        <span className="mx-auto flex h-11 w-11 items-center justify-center border border-glass-border text-text-dim">
          <Compass className="h-5 w-5" />
        </span>

        <span className="keyline keyline--plain mt-5 inline-flex block">Off the ledger</span>
        <h1 className="pt-2 font-display text-[38px] leading-none text-text">
          Nothing is filed here
        </h1>
        <p className="mx-auto max-w-md pt-3 text-[11.5px] leading-relaxed text-text-muted">
          The route does not exist in this build. Auction lots created in a previous mock session
          disappear when the in-memory store resets — the sale room always lists what the server
          currently holds.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/market"
            className="flex items-center gap-1.5 bg-brand-400 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-canvas transition-colors hover:bg-brand-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the board
          </Link>
          <Link
            href="/auctions"
            className="border border-glass-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text"
          >
            Sale room
          </Link>
        </div>
      </div>
    </div>
  );
}
