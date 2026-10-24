"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/lib/stores/uiStore";
import { DEMO_ACCOUNT_LABEL } from "@/lib/config";
import {
  AlertOctagon,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  Mail,
  ShieldQuestion,
  TicketCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useUiStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);

  React.useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = setInterval(() => setRateLimitSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (rateLimitSeconds > 0) return;

    if (password === "ratelimit") {
      setRateLimitSeconds(10);
      addToast({
        type: "warning",
        title: "Simulated rate limit",
        message: "This preview shows the cooldown state. Wait 10 seconds and try again.",
        countdownSeconds: 10,
      });
      return;
    }

    if (password === "wrongpassword") {
      setErrorMessage(
        "Simulated refusal: this password exists only to preview an auth error. Check the demo notes below."
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      addToast({
        type: "success",
        title: "Demo session opened",
        message: `You are browsing as ${DEMO_ACCOUNT_LABEL}. The simulated wallet and orders belong to the mock server, not to an account you created.`,
      });
      router.push("/market");
    }, 600);
  };

  const inputClass =
    "w-full border border-glass-border bg-canvas py-2.5 pl-9 pr-3.5 font-mono text-[11.5px] text-text transition-colors placeholder:text-text-dim focus:border-brand-500/60 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid overflow-hidden border border-glass-border lg:grid-cols-[0.92fr_1.08fr]">
        {/* Venue note */}
        <aside className="relative hidden flex-col justify-between border-r border-glass-border bg-surface p-8 lg:flex">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-pill border border-brand-500/30 bg-brand-500/[0.08] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.13em] text-brand-300">
              <TicketCheck className="h-3 w-3" />
              Simulated venue
            </span>

            <div className="space-y-3">
              <span className="flex items-center gap-2.5 font-display text-[15px] tracking-[-0.02em] text-text">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.8]">
                  <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                  <circle cx="12" cy="12" r="3" fill="#14CBAA" stroke="none" />
                </svg>
                Darkhold
              </span>
              <h1 className="font-display text-[42px] leading-[0.96] text-text">
                A trading floor
                <br />
                that says what it is.
              </h1>
              <p className="max-w-xs text-[12px] leading-relaxed text-text-muted">
                Passes, hoodies and pins are fictional. Credits are fictional. Counterparties are
                bots. The prices, caps and settlement rules are real enough to be worth reading.
              </p>
            </div>

            <div className="space-y-2.5 border-t border-glass-border pt-5">
              {[
                "No real payments, ownership or ticket delivery.",
                "The server checks every price before it moves a balance.",
                "Resale ceilings, reserves and settlement delays are enforced in the mock.",
                "No account, credential or starter credit leaves this browser.",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5 text-[11px] leading-relaxed text-text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-brand-400" />
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-glass-border pt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
            Demo access only · no auth backend is deployed
          </div>
        </aside>

        {/* Form panel */}
        <div className="bg-canvas-elevated p-6 sm:p-8 lg:p-10">
          <div className="space-y-2">
            <span className="keyline">Demo access</span>
            <h2 className="font-display text-[32px] leading-none text-text">
              Open the mock venue
            </h2>
            <p className="max-w-md text-[11.5px] leading-relaxed text-text-muted">
              Enter any email address and a password to browse as{" "}
              <span className="font-mono text-text">{DEMO_ACCOUNT_LABEL}</span>. Nothing is
              transmitted, stored or verified.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 border border-sell/40 bg-sell/[0.07] p-3 text-[11px] leading-relaxed text-text"
            >
              <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sell" />
              <span>{errorMessage}</span>
            </div>
          )}

          {rateLimitSeconds > 0 && (
            <div className="mt-5 border border-warning/35 bg-warning/[0.08] p-3 font-mono text-[10.5px] text-warning">
              Simulated cooldown active. Unlocks in {rateLimitSeconds}s.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
              >
                Email address (not checked)
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="any@address.works"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
              >
                Password (not checked)
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={cn(inputClass, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center border border-glass-border text-text-dim transition-colors hover:text-text"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || rateLimitSeconds > 0}
              className="flex w-full items-center justify-center gap-2 bg-brand-400 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-brand-300 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Opening session…
                </>
              ) : (
                <>
                  Enter as {DEMO_ACCOUNT_LABEL}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border border-glass-border bg-canvas p-3.5">
            <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.11em] text-text-dim">
              <ShieldQuestion className="h-3 w-3" />
              Simulated error previews
            </p>
            <p className="pt-1.5 text-[10.5px] leading-relaxed text-text-muted">
              These passwords only exercise local error states. Use{" "}
              <code className="border border-glass-border px-1 py-0.5 font-mono text-text">
                wrongpassword
              </code>{" "}
              for a refused sign-in, or{" "}
              <code className="border border-glass-border px-1 py-0.5 font-mono text-text">
                ratelimit
              </code>{" "}
              for a cooldown countdown. Neither reaches a server.
            </p>
          </div>

          <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-text-dim">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Registration is not offered because there is no auth backend in this build. The demo
            account is the only identity the mock understands.
          </p>
        </div>
      </div>
    </div>
  );
}
