"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ObsidianBackground() {
  const pathname = usePathname();

  // Route-based glow weighting
  let tealOpacity = "opacity-90";
  let violetOpacity = "opacity-90";

  if (pathname === "/market" || pathname === "/demo") {
    // Favor teal
    tealOpacity = "opacity-100 scale-105";
    violetOpacity = "opacity-70 scale-95";
  } else if (pathname?.startsWith("/auctions")) {
    // Favor violet
    tealOpacity = "opacity-60 scale-95";
    violetOpacity = "opacity-100 scale-105";
  } else if (pathname === "/") {
    // Landing: both stronger
    tealOpacity = "opacity-100 scale-110";
    violetOpacity = "opacity-100 scale-110";
  } else {
    // Terminal and others: balanced
    tealOpacity = "opacity-90";
    violetOpacity = "opacity-90";
  }

  return (
    <div className="obsidian-bg-layer" aria-hidden="true">
      {/* Layer 2: Blurred Radial Glows */}
      <div
        className={cn(
          "glow-teal animate-glow-drift-1 transition-all duration-1000",
          tealOpacity
        )}
      />
      <div
        className={cn(
          "glow-violet animate-glow-drift-2 transition-all duration-1000",
          violetOpacity
        )}
      />

      {/* Layer 3: Faint 64px Grid Masked */}
      <div className="obsidian-grid" />

      {/* Layer 4: Subtle Film Grain */}
      <div className="obsidian-grain" />
    </div>
  );
}
