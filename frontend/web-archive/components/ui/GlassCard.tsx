"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Edge glow variant */
  glowEdge?: "brand" | "mint" | "sell" | "ward" | "none";
  /** Enable pointer-following spotlight on hover */
  enableSpotlight?: boolean;
  /** Lift on hover */
  hoverLift?: boolean;
  /** Shine sweep on hover (for primary CTAs) */
  shine?: boolean;
  /** Additional Tailwind classes for the inner content wrapper */
  innerClassName?: string;
}

const glowEdgeClassMap = {
  brand: "glow-edge-brand",
  mint: "glow-edge-mint",
  sell: "glow-edge-sell",
  ward: "glow-edge-ward",
  none: "",
} as const;

/**
 * GlassCard — The primary surface primitive.
 * Frosted glass with subtle gradient, hairline border, backdrop blur, deep shadow.
 * Optional colored bottom-edge glow, pointer spotlight, hover lift, shine sweep.
 */
export function GlassCard({
  children,
  className,
  glowEdge = "none",
  enableSpotlight = false,
  hoverLift = true,
  shine = false,
  innerClassName,
  style,
  id,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-hidden": ariaHidden,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...restProps
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enableSpotlight || !ref.current) return;
    const el = ref.current;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePos({ x, y });
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    const handleLeave = () => {
      setMousePos(null);
    };
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [enableSpotlight]);

  const baseClasses = cn(
    "relative glass-card overflow-hidden",
    glowEdgeClassMap[glowEdge],
    enableSpotlight && "spotlight-hover",
    hoverLift && "transition-smooth hover:shadow-card-hover",
    shine && "shine-sweep",
    className
  );

  return (
    <motion.div
      ref={ref}
      id={id}
      title={title}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-hidden={ariaHidden}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={baseClasses}
      style={{
        ...style,
        ...(mousePos && { "--mx": `${mousePos.x}%`, "--my": `${mousePos.y}%` }),
      }}
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={cn("relative z-10 p-5 md:p-6", innerClassName)}>
        {children}
      </div>
    </motion.div>
  );
}

/** Convenience wrapper for stat cards with consistent structure */
export interface StatCardContentProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subValue?: string;
  bottomSlot?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCardContent({
  icon,
  label,
  value,
  delta,
  deltaLabel,
  subValue,
  bottomSlot,
  trend = "neutral",
  className,
}: StatCardContentProps) {
  const deltaColor = trend === "up" ? "text-buy" : trend === "down" ? "text-sell" : "text-warning";

  return (
    <div className={cn("flex flex-col justify-between gap-4 h-full", className)}>
      <div className="flex items-center gap-3">
        <div className="icon-tile variant-neutral">{icon}</div>
        <span className="data-label block min-w-0 truncate">{label}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
        <div className="min-w-0">
          <span className="figure block text-[26px] md:text-[30px] text-text">
            {value}
          </span>
          {subValue && (
            <span className="block mt-1 font-mono text-[11px] text-text-dim">{subValue}</span>
          )}
        </div>
        {delta !== undefined && (
          <span className={cn("delta-pill mb-0.5 flex items-center gap-1 font-mono text-[10.5px] font-medium tabular-nums", deltaColor)}>
            {trend === "up" && <span>▲</span>}
            {trend === "down" && <span>▼</span>}
            {trend === "neutral" && <span>◆</span>}
            {Math.abs(delta).toFixed(1)}%
            {deltaLabel && <span className="text-text-dim ml-1">{deltaLabel}</span>}
          </span>
        )}
      </div>

      {bottomSlot && (
        <div className="border-t border-glass-border pt-4 mt-2">
          {bottomSlot}
        </div>
      )}
    </div>
  );
}

/** Icon tile used inside StatCard and elsewhere */
interface IconTileWrapperProps {
  children: React.ReactNode;
  variant?: "brand" | "mint" | "sell" | "amber" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IconTileWrapper({
  children,
  variant = "neutral",
  size = "md",
  className,
}: IconTileWrapperProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }[size];

  const variantClasses = {
    brand: "border-brand-500/35 bg-brand-500/[0.08] text-brand-400",
    mint: "border-mint-500/35 bg-mint-500/[0.08] text-mint-400",
    sell: "border-sell/35 bg-sell/[0.08] text-sell",
    amber: "border-warning/35 bg-warning/[0.08] text-warning",
    neutral: "border-glass-border bg-white/[0.025] text-text-muted",
  }[variant];

  return (
    <div
      className={cn(
        "icon-tile flex shrink-0 items-center justify-center border",
        sizeClasses,
        variantClasses,
        className
      )}
    >
      {children}
    </div>
  );
}