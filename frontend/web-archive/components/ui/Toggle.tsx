"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Toggle — Spring-animated thumb with glass styling.
 * Uses motion for smooth spring transition.
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  size = "md",
  className,
}: ToggleProps) {
  const inputId = useId();

  const sizeClasses = {
    sm: { track: "w-9 h-5", thumb: "w-4 h-4", translate: "translate-x-4" },
    md: { track: "w-11 h-6", thumb: "w-5 h-5", translate: "translate-x-5" },
  }[size];

  const handleClick = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <label
      className={cn(
        "inline-flex items-start gap-3 cursor-pointer",
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-labelledby={label ? `${inputId}-label` : undefined}
        aria-describedby={description ? `${inputId}-desc` : undefined}
        id={inputId}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "relative flex-shrink-0 rounded-pill border transition-all duration-200 ease-spring",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          sizeClasses.track,
          checked
            ? "bg-gradient-to-r from-brand-500 to-brand-400 border-transparent"
            : "bg-white/[0.03] border-glass-border hover:border-glass-border-strong",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <motion.span
          className={cn(
            "absolute top-0.5 left-0.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-none",
            sizeClasses.thumb,
            checked && sizeClasses.translate
          )}
          animate={{ x: checked ? (size === "sm" ? 4 : 5) : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      {(label || description) && (
        <div className="pt-0.5">
          {label && (
            <span id={`${inputId}-label`} className="block text-[12px] font-medium text-text">
              {label}
            </span>
          )}
          {description && (
            <span id={`${inputId}-desc`} className="block text-[10.5px] text-text-dim">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}