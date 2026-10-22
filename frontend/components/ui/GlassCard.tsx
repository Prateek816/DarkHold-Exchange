"use client";

import React, { useRef, useState } from "react";
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
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableSpotlight || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerLeave = () => {
    setMousePos(null);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative isolate overflow-hidden rounded-card border border-glass-border",
        "bg-gradient-to-br from-white/[0.06] via-white/[0.022] to-white/[0.008]",
        "backdrop-blur-[18px] saturate-[140%] shadow-glass",
        "transition-[transform,border-color,box-shadow] duration-300 ease-smooth",
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
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(420px circle at 0% 0%, rgba(255,255,255,0.08), transparent 68%)",
        }}
      />

      {/* Pointer-following spotlight */}
      {enableSpotlight && mousePos && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px -z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(25, 203, 176, 0.09), transparent 78%)`,
          }}
        />
      )}

      {children}

      {/* Optional colored bottom glow */}
      {glowEdge !== "none" && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 left-8 right-8 -z-10 h-[1.5px] blur-[0.5px] opacity-80",
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
