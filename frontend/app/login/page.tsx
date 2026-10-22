"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/lib/stores/uiStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertOctagon,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useUiStore();
  const { availableCredits } = useWalletStore();

  const [activeTab, setActiveTab] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);

  const hasMinLen = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const registrationValid = hasMinLen && hasNumber && hasSymbol;

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = setInterval(() => setRateLimitSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setGeneralError(null);

    if (rateLimitSeconds > 0) return;

    if (activeTab === "REGISTER" && email.toLowerCase() === "taken@darkhold.io") {
      setEmailError("EMAIL_TAKEN: This email is already bound to an existing grimoire account.");
      return;
    }

    if (activeTab === "LOGIN" && password === "wrongpassword") {
      setGeneralError("Email or password incorrect.");
      return;
    }

    if (password === "ratelimit") {
      setRateLimitSeconds(10);
      addToast({
        type: "warning",
        title: "Rate limited",
        message: "Too many auth attempts. Please wait 10 seconds.",
        countdownSeconds: 10,
      });
      return;
    }

    if (activeTab === "REGISTER" && !registrationValid) {
      setGeneralError("Passphrase must meet all three security requirements before registration.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      addToast({
        type: "success",
        title: "Grimoire session established",
        message: "Logged in successfully. Starter credits ($5,000.00) credited to your vault.",
      });
      router.push("/market");
    }, 800);
  };

  const resetErrors = () => {
    setEmailError(null);
    setGeneralError(null);
  };

  return (
    <div className="flex flex-1 items-center justify-center py-4 sm:py-8">
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[26px] border border-glass-border bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-white/[0.008] shadow-glass-lg backdrop-blur-[24px] lg:grid-cols-[0.92fr_1.08fr]">
        {/* ============ Brand panel ============ */}
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-glass-border bg-gradient-to-b from-violet-500/[0.08] via-transparent to-brand-500/[0.05] p-9 lg:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 animate-aurora rounded-full bg-violet-500/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl"
          />

          <div className="relative space-y-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-brand-500/40 bg-brand-500/10 shadow-glow-teal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.8]">
                  <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                  <circle cx="12" cy="12" r="3" fill="#19CBB0" />
                </svg>
              </span>
              <div>
                <p className="font-display text-[15px] font-bold leading-tight tracking-tight text-text">
                  Darkhold
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-text-dim">
                  Exchange
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <span className="eyebrow">Ceremonial access</span>
              <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.035em] text-text">
                The ledger
                <br />
                remembers
                <span className="text-gradient-brand"> every seal.</span>
              </h1>
              <p className="max-w-xs text-[12.5px] leading-relaxed text-text-muted">
                Enter the marketplace, lock your first reservation, and watch protocol enforce a
                fair price on every pass and relic.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { icon: ShieldCheck, text: "100% backed, double-entry settlement" },
                { icon: Sparkles, text: "5,000 simulated credits on initiation" },
                { icon: Lock, text: "The Ward caps every resale by protocol" },
              ].map((point) => (
                <div key={point.text} className="flex items-center gap-2.5 text-[11.5px] text-text-muted">
                  <span className="flex h-6 w-6 items-center justify-center rounded-[8px] border border-glass-border bg-white/[0.04] text-brand-400">
                    <point.icon className="h-3 w-3" />
                  </span>
                  {point.text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between border-t border-glass-border pt-5 font-mono text-[10px] text-text-dim">
            <span>VAULT BALANCE</span>
            <span className="font-semibold tabular-nums text-brand-400">
              ${(availableCredits / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </aside>

        {/* ============ Form panel ============ */}
        <div className="relative p-6 sm:p-9 lg:p-10">
          <div className="mb-6 space-y-2">
            <span className="eyebrow flex items-center gap-2">
              <span className="h-px w-5 bg-brand-500/60" />
              Account access
            </span>
            <h2 className="font-display text-[24px] font-semibold tracking-tight text-text">
              {activeTab === "LOGIN" ? "Enter the Grimoire" : "Forge your account"}
            </h2>
            <p className="text-[12px] text-text-muted">
              {activeTab === "LOGIN"
                ? "Sign in to resume your simulated trading vault."
                : "Register to receive 5,000 simulated starter credits."}
            </p>
          </div>

          <SegmentedTabs
            tabs={[
              { id: "LOGIN", label: "Sign in" },
              { id: "REGISTER", label: "Register" },
            ]}
            activeId={activeTab}
            onChange={(id) => {
              setActiveTab(id as typeof activeTab);
              resetErrors();
            }}
            size="sm"
            layoutId="auth-tab-pill"
            className="mb-5 w-full"
          />

          {generalError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-panel border border-sell/40 bg-sell/[0.08] p-3 text-xs text-text">
              <AlertOctagon className="h-4 w-4 shrink-0 text-sell" />
              <span>{generalError}</span>
            </div>
          )}

          {rateLimitSeconds > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-panel border border-warning/30 bg-warning/[0.08] p-3 text-xs text-warning">
              <span>Rate limited. Unlocks in {rateLimitSeconds} seconds…</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@darkhold.io"
                  className={cn(
                    "w-full rounded-[12px] border bg-white/[0.04] py-2.5 pl-9 pr-3.5 font-mono text-xs text-text transition-colors placeholder:text-text-dim/70 focus:outline-none",
                    emailError
                      ? "animate-ward-shake border-sell/60 bg-sell/[0.06]"
                      : "border-glass-border focus:border-brand-500/60 focus:bg-white/[0.055]"
                  )}
                />
              </div>
              {emailError && (
                <p className="pt-0.5 text-[11px] font-medium text-sell-text">{emailError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
              >
                Passphrase
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={activeTab === "LOGIN" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-[12px] border border-glass-border bg-white/[0.04] py-2.5 pl-9 pr-10 font-mono text-xs text-text transition-colors placeholder:text-text-dim/70 focus:border-brand-500/60 focus:bg-white/[0.055] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[7px] text-text-dim transition-colors hover:bg-white/[0.06] hover:text-text"
                  aria-label={showPassword ? "Hide passphrase" : "Show passphrase"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {activeTab === "REGISTER" && (
                <div className="space-y-1.5 pt-2">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                    Security requirements
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px]">
                    {[
                      { ok: hasMinLen, label: "8+ chars" },
                      { ok: hasNumber, label: "1 number" },
                      { ok: hasSymbol, label: "1 symbol" },
                    ].map((rule) => (
                      <span
                        key={rule.label}
                        className={cn(
                          "flex items-center gap-1 transition-colors",
                          rule.ok ? "text-buy-text" : "text-text-dim"
                        )}
                      >
                        <Check className={cn("h-3 w-3", !rule.ok && "opacity-40")} />
                        {rule.label}
                      </span>
                    ))}
                  </div>
                  {!registrationValid && (
                    <p className="text-[10px] leading-relaxed text-text-dim">
                      All requirements must be met to forge a new account.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isLoading ||
                rateLimitSeconds > 0 ||
                (activeTab === "REGISTER" && !registrationValid)
              }
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-brand-400 to-brand-500 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-canvas shadow-[0_10px_28px_-10px_rgba(25,203,176,0.6)] transition-all hover:-translate-y-px disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>{activeTab === "LOGIN" ? "Sign in" : "Create account"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 rounded-[12px] border border-glass-border bg-white/[0.02] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
              Test shortcuts
            </p>
            <p className="pt-1 text-[10.5px] leading-relaxed text-text-dim">
              Use password{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 text-text-muted">wrongpassword</code>{" "}
              or{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 text-text-muted">ratelimit</code>{" "}
              to preview error handling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
