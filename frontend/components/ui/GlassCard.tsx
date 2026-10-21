"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowEdge?: "teal" | "sell" | "violet" | "none";
  enableSpotlight?: boolean;
  hoverLift?: boolean;
}

export function GlassCard({
  children,
  className,
  glowEdge = "none",
  enableSpotlight = true,
  hoverLift = true,
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
        "relative rounded-card border border-glass-border bg-gradient-to-br from-white/[0.065] via-white/[0.02] to-white/[0.01]",
        "backdrop-blur-[18px] saturate-[140%] shadow-glass",
        "transition-all duration-200 group overflow-hidden",
        hoverLift && "hover:-translate-y-0.5 hover:border-glass-border-strong",
        className
      )}
      style={{
        boxShadow: "0 20px 50px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
      {...props}
    >
      {/* Hairline gradient top-left border highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-card opacity-60"
        style={{
          background: "radial-gradient(400px circle at 0% 0%, rgba(255,255,255,0.12), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Pointer-following spotlight */}
      {enableSpotlight && mousePos && (
        <div
          className="pointer-events-none absolute -inset-px rounded-card transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(25, 203, 176, 0.08), transparent 80%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Optional Colored Bottom-Edge Glow Line */}
      {glowEdge !== "none" && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 left-6 right-6 h-[2px] blur-[1px]",
            glowEdge === "teal" && "bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-80",
            glowEdge === "sell" && "bg-gradient-to-r from-transparent via-sell to-transparent opacity-80",
            glowEdge === "violet" && "bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-80"
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
