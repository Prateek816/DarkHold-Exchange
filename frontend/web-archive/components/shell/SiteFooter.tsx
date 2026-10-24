import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  publicPage?: boolean;
  className?: string;
}

export function SiteFooter({ publicPage = false, className }: SiteFooterProps) {
  if (publicPage) {
    return (
      <footer className={cn("border-t border-glass-border", className)}>
        <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="max-w-sm space-y-5">
              <Wordmark />
              <p className="text-[12px] leading-relaxed text-text-muted">
                A working simulated exchange for festival passes and limited-run objects.
                Price caps are enforced by the book, not by a promise.
              </p>
            </div>

            <div>
              <p className="eyebrow">The floor</p>
              <div className="mt-4 flex flex-col gap-2.5 text-[12px] text-text-muted">
                <Link href="/market" className="link-line w-fit hover:text-text">
                  Marketplace
                </Link>
                <Link href="/auctions" className="link-line w-fit hover:text-text">
                  Sale room
                </Link>
                <Link href="/portfolio" className="link-line w-fit hover:text-text">
                  Your ledger
                </Link>
                <Link href="/demo" className="link-line w-fit hover:text-text">
                  Control room
                </Link>
              </div>
            </div>

            <div>
              <p className="eyebrow">The small print</p>
              <div className="mt-4 space-y-3 text-[11.5px] leading-relaxed text-text-muted">
                <p>All balances are simulated credits. No real money is held or moved.</p>
                <p>Counterparties may be automated simulation agents.</p>
                <p>No claim on real tickets, merchandise or financial returns.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-3 border-t border-glass-border pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim sm:flex-row sm:items-center">
            <span>Darkhold Exchange / simulated venue / MMXXVI</span>
            <span className="flex items-center gap-2 text-violet-400">
              <span className="h-1 w-1 rounded-full bg-violet-400" />
              Demo build — backend contract not included
            </span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn("mt-4 border-t border-glass-border/80", className)}>
      <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-3 px-4 py-4 font-mono text-[9px] uppercase tracking-[0.11em] text-text-dim sm:flex-row sm:items-center sm:px-6">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-text-muted">Darkhold Exchange</span>
          <span className="text-text-dim/50">/</span>
          <span>Simulated credits & counterparties</span>
          <span className="text-text-dim/50">/</span>
          <span>No real financial activity</span>
        </span>
        <Link href="/#rules" className="flex items-center gap-1.5 transition-colors hover:text-text">
          House rules
          <ArrowUpRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </footer>
  );
}
