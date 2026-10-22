"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-md",
  className,
}: DrawerProps) {
  const titleId = React.useId();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-[10px]"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={cn(
              "relative z-10 m-2 flex h-[calc(100%-16px)] w-full flex-col overflow-y-auto rounded-[24px] border border-glass-border-strong bg-gradient-to-b from-canvas-elevated/95 to-canvas/95 p-6 shadow-glass-lg backdrop-blur-[26px] sm:m-3 sm:h-[calc(100%-24px)]",
              "before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
              width,
              className
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-glass-border pb-4">
              <div>
                {title && (
                  <h3
                    id={titleId}
                    className="font-display text-[15px] font-semibold tracking-tight text-text"
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="pt-1 text-[11.5px] leading-relaxed text-text-muted">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-glass-border bg-white/[0.035] text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
