import Link from "next/link";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  compact?: boolean;
  className?: string;
}

export function Wordmark({ compact = false, className }: WordmarkProps) {
  return (
    <Link
      href="/"
      aria-label="Darkhold Exchange home"
      className={cn("group inline-flex items-end gap-3", className)}
    >
      <span
        className={cn(
          "font-display leading-[0.78] tracking-[-0.025em] text-text transition-colors group-hover:text-brand-300",
          compact ? "text-[25px]" : "text-[31px] sm:text-[36px]"
        )}
      >
        Darkhold
      </span>
      <span
        className={cn(
          "mb-[2px] border-l border-glass-border-strong pl-2.5 font-mono uppercase leading-[1.1] tracking-[0.2em] text-text-dim",
          compact ? "text-[7.5px]" : "text-[8px]"
        )}
      >
        Exchange
        <span className="mt-0.5 block tracking-[0.12em] text-buy">Simulated</span>
      </span>
    </Link>
  );
}
