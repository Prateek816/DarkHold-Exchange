"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/lib/stores/uiStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { Lock, Mail, ArrowRight, Loader2, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useUiStore();
  const { availableCredits } = useWalletStore();

  const [activeTab, setActiveTab] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Field errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);

  // Password policy criteria
  const hasMinLen = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = setInterval(() => {
      setRateLimitSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setGeneralError(null);

    if (rateLimitSeconds > 0) return;

    // Simulate EMAIL_TAKEN on test scenario
    if (activeTab === "REGISTER" && email.toLowerCase() === "taken@darkhold.io") {
      setEmailError("EMAIL_TAKEN: This email is already bound to an existing grimoire account.");
      return;
    }

    // Simulate UNAUTHENTICATED
    if (activeTab === "LOGIN" && password === "wrongpassword") {
      setGeneralError("Email or password incorrect.");
      return;
    }

    // Simulate RATE_LIMITED test
    if (password === "ratelimit") {
      setRateLimitSeconds(10);
      addToast({
        type: "warning",
        title: "Rate Limited",
        message: "Too many auth attempts. Please wait 10 seconds.",
        countdownSeconds: 10,
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      addToast({
        type: "success",
        title: "Grimoire Session Established",
        message: "Logged in successfully. Starter credits ($5,000.00) credited to Vault.",
      });
      router.push("/market");
    }, 800);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 max-w-md w-full mx-auto font-sans text-xs">
      <div className="relative w-full rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.06] via-white/[0.025] to-white/[0.01] p-8 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-[24px] space-y-6 overflow-hidden">
        {/* Top hairline highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="w-11 h-11 rounded-14 border border-brand-500/30 bg-brand-500/10 mx-auto flex items-center justify-center shadow-[0_0_16px_rgba(25,203,176,0.2)]">
            <div className="w-5 h-5 border border-brand-400 rotate-45 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-brand-300 rounded-full" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {activeTab === "LOGIN" ? "Enter The Grimoire" : "Forge Ceremonial Account"}
          </h2>
          <p className="text-text-muted text-xs">
            5,000 starter simulated credits deposited upon initiation.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-12 bg-white/[0.03] border border-white/8">
          <button
            type="button"
            onClick={() => {
              setActiveTab("LOGIN");
              setEmailError(null);
              setGeneralError(null);
            }}
            className={cn(
              "py-2 rounded-10 text-xs font-semibold transition-all",
              activeTab === "LOGIN"
                ? "bg-white/[0.08] text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-white/10"
                : "text-text-muted hover:text-white"
            )}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("REGISTER");
              setEmailError(null);
              setGeneralError(null);
            }}
            className={cn(
              "py-2 rounded-10 text-xs font-semibold transition-all",
              activeTab === "REGISTER"
                ? "bg-white/[0.08] text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-white/10"
                : "text-text-muted hover:text-white"
            )}
          >
            Register
          </button>
        </div>

        {/* Generic Error Notice */}
        {generalError && (
          <div className="p-3.5 rounded-14 bg-sell-tint border border-sell/40 text-text text-xs flex items-center gap-2.5">
            <AlertOctagon className="w-4 h-4 text-sell shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Rate limit warning */}
        {rateLimitSeconds > 0 && (
          <div className="p-3.5 rounded-14 bg-warning/10 border border-warning/30 text-warning text-xs flex items-center gap-2">
            <span>Rate limited. Unlocks in {rateLimitSeconds} seconds...</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-text-muted block text-[11px] font-medium uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-dim absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@darkhold.io"
                className={cn(
                  "w-full bg-white/[0.04] border rounded-12 pl-9 pr-3.5 py-2.5 text-white text-xs font-mono focus:outline-none transition-colors",
                  emailError
                    ? "border-sell bg-sell-tint animate-ward-shake text-sell"
                    : "border-white/10 focus:border-brand-500/50"
                )}
              />
            </div>
            {emailError && (
              <p className="text-[11px] text-sell font-medium pt-0.5">{emailError}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-text-muted block text-[11px] font-medium uppercase tracking-wider">Passphrase</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-dim absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white/[0.04] border border-white/10 rounded-12 pl-9 pr-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
              />
            </div>

            {/* Inline Password Policy Hints */}
            {activeTab === "REGISTER" && (
              <div className="pt-2 space-y-1 text-[11px]">
                <span className="text-text-dim uppercase tracking-wider block text-[10px]">Security Requirements:</span>
                <div className="grid grid-cols-3 gap-1 font-mono">
                  <span className={cn(hasMinLen ? "text-buy" : "text-text-dim")}>
                    ✓ 8+ chars
                  </span>
                  <span className={cn(hasNumber ? "text-buy" : "text-text-dim")}>
                    ✓ 1 number
                  </span>
                  <span className={cn(hasSymbol ? "text-buy" : "text-text-dim")}>
                    ✓ 1 symbol
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || rateLimitSeconds > 0}
            className="w-full py-3 rounded-12 bg-brand-500 hover:bg-brand-400 text-bg font-semibold text-xs uppercase tracking-wider transition-all shadow-[0_0_24px_rgba(25,203,176,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{activeTab === "LOGIN" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-text-dim text-center">
          Test shortcuts: Type password <code className="text-text-muted bg-white/5 px-1 rounded">wrongpassword</code> or{" "}
          <code className="text-text-muted bg-white/5 px-1 rounded">ratelimit</code> to preview error handling.
        </p>
      </div>
    </div>
  );
}
