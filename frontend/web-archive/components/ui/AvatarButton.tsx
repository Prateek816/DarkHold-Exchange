"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AvatarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** User initials or name */
  name?: string;
  /** Avatar image src */
  src?: string;
  /** Alt text */
  alt?: string;
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Status indicator */
  status?: "online" | "away" | "busy" | "offline";
  /** Dropdown content */
  dropdown?: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[12px]",
  lg: "h-12 w-12 text-[14px]",
};

const statusColors = {
  online: "bg-buy",
  away: "bg-warning",
  busy: "bg-sell",
  offline: "bg-text-dim",
};

/**
 * AvatarButton — Round glass button with initials or image, optional status dot.
 */
export function AvatarButton({
  name,
  src,
  alt,
  size = "md",
  status,
  dropdown,
  className,
  children,
  ...props
}: AvatarButtonProps) {
  const isDropdown = !!dropdown;
  const [isOpen, setIsOpen] = React.useState(false);

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => isDropdown && setIsOpen(!isOpen)}
        className={cn(
          "relative flex-shrink-0 items-center justify-center rounded-full border border-glass-border bg-gradient-to-br from-white/[0.05] to-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "hover:border-glass-border-strong hover:bg-white/[0.08]",
          sizeClasses[size],
          className
        )}
        aria-expanded={isDropdown ? isOpen : undefined}
        aria-haspopup={isDropdown ? "true" : undefined}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? name ?? "Avatar"}
            className="rounded-full w-full h-full object-cover"
          />
        ) : (
          <span className="font-medium text-text">{initials}</span>
        )}
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-canvas",
              size === "sm" ? "h-2.5 w-2.5" : size === "md" ? "h-3 w-3" : "h-3.5 w-3.5",
              statusColors[status]
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {isDropdown && dropdown && isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed right-5 z-50 mt-2 w-56 glass-card overflow-hidden"
              role="menu"
            >
              {dropdown}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}