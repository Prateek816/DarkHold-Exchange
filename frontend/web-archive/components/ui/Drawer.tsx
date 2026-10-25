"use client";

import React, { useEffect, useRef } from "react";
import { X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Drawer width */
  size?: "sm" | "md" | "lg" | "full";
  /** Show header */
  showHeader?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-[320px] max-w-[90vw]",
  md: "w-[420px] max-w-[90vw]",
  lg: "w-[560px] max-w-[90vw]",
  full: "w-[720px] max-w-[90vw]",
};

/**
 * Drawer — Right-side glass panel, slide-in from right, blurred backdrop.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
  showHeader = true,
  className,
}: DrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      setTimeout(() => contentRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-end"
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby={subtitle ? "drawer-desc" : undefined}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-canvas/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          ref={contentRef}
          tabIndex={-1}
          className={cn(
            "relative flex flex-col h-full glass-card overflow-hidden z-10",
            sizeClasses[size],
            className
          )}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        >
          {showHeader && (
            <div className="flex items-start justify-between gap-4 border-b border-glass-border p-5">
              <div className="min-w-0">
                <h2 id="drawer-title" className="font-display text-[18px] font-semibold leading-tight tracking-tight text-text">
                  {title}
                </h2>
                {subtitle && (
                  <p id="drawer-desc" className="mt-1 text-[12.5px] leading-relaxed text-text-muted">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-tile border border-glass-border bg-white/[0.03] text-text-dim transition-colors hover:border-glass-border-strong hover:bg-white/[0.08] hover:text-text"
                aria-label="Close drawer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}