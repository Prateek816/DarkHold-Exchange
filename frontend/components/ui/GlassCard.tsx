"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowEdge?: "teal" | "sell" | "violet" | "none";
  enableSpotlight?: boolean;
  hoverLift?: boolean;
  sheen?: boolean;
}

export function GlassCard({
  children,
  className,
  glowEdge = "none",
  enableSpotlight = true,
  hoverLift = true,
  sheen = false,
  ...props
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // High-performance pointer tracking: updates CSS variables directly without triggering React re-renders
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableSpotlight || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    cardRef.current.style.setProperty("--spot-opacity", "1");
  };

  const handlePointerLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.setProperty("--spot-opacity", "0");
    }
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative isolate overflow-hidden rounded-card border border-glass-border transform-gpu",
        "bg-gradient-to-br from-white/[0.06] via-white/[0.022] to-white/[0.008]",
        "backdrop-blur-[12px] shadow-glass",
        "transition-[transform,border-color,box-shadow] duration-200 ease-smooth",
        hoverLift &&
          "hover:-translate-y-0.5 hover:border-glass-border-strong hover:shadow-glass-lg",
        sheen && "sheen",
        className
      )}
      {...props}
    >
      {/* Hairline top highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      {/* Static corner bloom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(420px circle at 0% 0%, rgba(255,255,255,0.07), transparent 68%)",
        }}
      />

      {/* Pointer-following spotlight powered by CSS variables (0 React re-renders) */}
      {enableSpotlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px -z-10 transition-opacity duration-200"
          style={{
            opacity: "var(--spot-opacity, 0)",
            background:
              "radial-gradient(420px circle at var(--spot-x, 0px) var(--spot-y, 0px), rgba(25, 203, 176, 0.09), transparent 78%)",
          }}
        />
      )}

      {children}

      {/* Optional colored bottom glow */}
      {glowEdge !== "none" && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 left-8 right-8 -z-10 h-[1.5px] opacity-80",
            glowEdge === "teal" &&
              "bg-gradient-to-r from-transparent via-brand-500 to-transparent",
            glowEdge === "sell" && "bg-gradient-to-r from-transparent via-sell to-transparent",
            glowEdge === "violet" &&
              "bg-gradient-to-r from-transparent via-violet-500 to-transparent"
          )}
        />
      )}
    </div>
  );
}
