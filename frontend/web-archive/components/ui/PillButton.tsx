"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: "primary" | "mint" | "sell" | "outlined" | "destructive" | "ghost";
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Show shine sweep on hover (primary only) */
  shine?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

const sizeClasses = {
  sm: "px-3 py-1.5 text-[10.5px] gap-1.5",
  md: "px-5 py-2.5 text-[11px] gap-2",
  lg: "px-6 py-3 text-[12px] gap-2.5",
};

const variantClasses = {
  primary: "bg-gradient-to-r from-brand-500 to-brand-400 text-canvas border-transparent shadow-[0_0_20px_rgba(124,92,255,0.3)] hover:from-brand-400 hover:to-brand-300 hover:shadow-[0_0_30px_rgba(124,92,255,0.4)]",
  mint: "bg-gradient-to-r from-mint-500 to-mint-400 text-canvas border-transparent shadow-[0_0_20px_rgba(25,203,176,0.3)] hover:from-mint-400 hover:to-mint-300 hover:shadow-[0_0_30px_rgba(25,203,176,0.4)]",
  sell: "bg-gradient-to-r from-sell-solid to-sell text-canvas border-transparent shadow-[0_0_20px_rgba(224,64,94,0.3)] hover:from-sell hover:to-sell-solid hover:shadow-[0_0_30px_rgba(224,64,94,0.4)]",
  outlined: "bg-white/[0.03] text-text border-glass-border hover:bg-white/[0.08] hover:border-glass-border-strong",
  destructive: "bg-white/[0.03] text-sell border-sell/30 hover:bg-sell-tint hover:border-sell/50",
  ghost: "bg-transparent text-text-muted border-transparent hover:bg-white/[0.04] hover:text-text",
} as const;

/**
 * PillButton — Rounded pill button with variants.
 * Primary: violet gradient with glow & shine sweep.
 * Mint: buy action. Sell: rose action. Outlined: secondary. Destructive: red outlined.
 */
export function PillButton({
  variant = "primary",
  size = "md",
  shine = variant === "primary",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: PillButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center font-semibold rounded-pill transition-all duration-200 ease-spring",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        shine && "shine-sweep overflow-hidden",
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

/** Icon-only button */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: "default" | "primary" | "destructive" | "glass";
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Aria label (required for icon-only buttons) */
  "aria-label": string;
  children: React.ReactNode;
}

const iconButtonVariants = {
  default: "bg-white/[0.03] text-text-muted border-glass-border hover:bg-white/[0.08] hover:border-glass-border-strong hover:text-text",
  primary: "bg-brand-500/20 text-brand-400 border-brand-500/30 hover:bg-brand-500/30 hover:text-brand-300",
  destructive: "bg-sell-tint text-sell border-sell/30 hover:bg-sell/20",
  glass: "bg-glass-hover text-text border-glass-border hover:border-glass-border-strong",
} as const;

export function IconButton({
  variant = "default",
  size = "md",
  "aria-label": ariaLabel,
  children,
  className,
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-tile border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses,
        iconButtonVariants[variant],
        className
      )}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}

/** Search field with Cmd+K hint */
interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  /** Placeholder text */
  placeholder?: string;
  /** Value */
  value: string;
  /** On change */
  onChange: (value: string) => void;
  /** Show keyboard shortcut hint */
  showShortcut?: boolean;
  /** Shortcut text */
  shortcut?: string;
  className?: string;
}

export function SearchField({
  placeholder = "Search assets, orders…",
  value,
  onChange,
  showShortcut = true,
  shortcut = "⌘K",
  className,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <svg className="absolute left-3 h-4 w-4 text-text-dim pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full pl-10 pr-10 rounded-pill border border-glass-border bg-white/[0.03] text-text placeholder:text-text-dim",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "transition-colors hover:border-glass-border-strong",
          "text-[12px]"
        )}
        {...props}
      />
      {showShortcut && (
        <span className="absolute right-3 flex items-center gap-1 px-2 py-0.5 rounded-pill border border-glass-border bg-white/[0.03] font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
          <kbd className="px-1.5 py-0.5 rounded-[4px] border border-glass-border bg-white/[0.05]">{shortcut}</kbd>
        </span>
      )}
    </div>
  );
}