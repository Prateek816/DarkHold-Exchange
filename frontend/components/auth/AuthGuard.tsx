"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/stores/authStore";
import { ShieldAlert, ArrowLeft, Loader2, Lock } from "lucide-react";

const PROTECTED_ROUTES = [
  "/market",
  "/trade",
  "/portfolio",
  "/auctions",
  "/demo",
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isInitialized, initSession } = useAuthStore();

  useEffect(() => {
    initSession();
  }, [initSession]);

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isDemoOrAdminRoute = pathname === "/demo" || pathname.startsWith("/demo/");

  // If protected route and still checking session: show obsidian loading state
  if (isProtected && (!isInitialized || isLoading)) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="relative flex flex-col items-center gap-4 rounded-[22px] border border-glass-border bg-canvas-elevated/70 p-8 text-center shadow-glass-lg backdrop-blur-[24px] max-w-sm w-full mx-4 animate-fade-in">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-[16px] border border-brand-500/35 bg-brand-500/10 shadow-glow-teal">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-brand-400 stroke-[1.8] animate-pulse"
            >
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              <circle cx="12" cy="12" r="3" fill="#19CBB0" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <p className="font-display text-[15px] font-semibold text-text">
              Verifying Grimoire Credentials
            </p>
            <p className="text-[11.5px] text-text-dim leading-relaxed">
              Restoring session and ledger balance from exchange node…
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-brand-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Cryptographic handshake active</span>
          </div>
        </div>
      </div>
    );
  }

  // If protected route and not authenticated: redirect to login
  if (isProtected && !isAuthenticated) {
    if (typeof window !== "undefined") {
      const currentUrl = pathname + window.location.search;
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    }
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 font-mono text-xs text-text-dim">
          <Lock className="h-4 w-4 text-warning" />
          <span>Access requires authentication. Redirecting…</span>
        </div>
      </div>
    );
  }

  // Role-based authorization for administrative pages
  if (isDemoOrAdminRoute && user && user.role !== "ADMIN" && user.role !== "OPERATOR") {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="relative flex flex-col items-center gap-4 rounded-[22px] border border-warning/40 bg-warning/[0.04] p-8 text-center shadow-glass-lg backdrop-blur-[24px] max-w-md w-full mx-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-warning/40 bg-warning/10 text-warning">
            <ShieldAlert className="h-6 w-6" />
          </span>

          <div className="space-y-2">
            <h2 className="font-display text-lg font-bold text-text">
              Operator Authorization Required
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              The Operator Console and settlement controls are strictly restricted to accounts with{" "}
              <code className="text-warning font-mono">ADMIN</code> or{" "}
              <code className="text-warning font-mono">OPERATOR</code> roles. Your current role is{" "}
              <code className="text-text font-mono font-semibold">{user.role || "TRADER"}</code>.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/market"
              className="inline-flex items-center gap-2 rounded-[12px] bg-white/[0.06] border border-glass-border px-4 py-2.5 text-xs font-semibold text-text hover:bg-white/[0.1] transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
