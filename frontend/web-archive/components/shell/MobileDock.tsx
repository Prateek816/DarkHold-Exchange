"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Layers, Terminal, Gavel, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/market", label: "Market", icon: Layers },
  { href: "/trade/DARKHOLD-PASS-2026", label: "Terminal", icon: Terminal },
  { href: "/auctions", label: "Auctions", icon: Gavel },
  { href: "/portfolio", label: "Vault", icon: Shield },
  { href: "/demo", label: "Console", icon: Sparkles },
];

/** Floating bottom dock — the only navigation surface on small screens. */
export function MobileDock() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed inset-x-3 bottom-3 z-50 rounded-[22px] border border-glass-border-strong bg-canvas-elevated/90 backdrop-blur-[22px] shadow-glass-lg"
      style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-5 gap-1 p-1.5">
        {ITEMS.map((item) => {
          const isActive =
            item.href === "/market"
              ? pathname === "/market" || pathname === "/"
              : item.href.startsWith("/trade")
              ? pathname.startsWith("/trade")
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-[16px] py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-text" : "text-text-dim hover:text-text-muted"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-dock-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-[16px] border border-brand-500/30 bg-brand-500/10"
                />
              )}
              <Icon
                className={cn(
                  "relative w-4 h-4",
                  isActive && "text-brand-400 drop-shadow-[0_0_8px_rgba(25,203,176,0.55)]"
                )}
                strokeWidth={1.9}
              />
              <span className="relative tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
