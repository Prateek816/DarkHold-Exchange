"use client";

import React from "react";

/**
 * ObsidianBackground — The fixed ambient background for the entire app.
 * Layer 1: Canvas (body bg)
 * Layer 2: Violet glow (top-center) + Mint glow (top-left) + Ember glow (bottom-right)
 * Layer 3: Faint violet-tinted grid masked by a radial fade
 * Layer 4: Film grain
 * Layer 5: Vignette — the frame falls off so the centre reads as lit
 * Glow emphasis is controlled per route via the data-glow attribute on body.
 */
export function ObsidianBackground() {
  return (
    <div className="obsidian-bg" aria-hidden="true">
      {/* Layer 2: Ambient glows */}
      <div className="obsidian-bg__layer obsidian-bg__glow-violet" />
      <div className="obsidian-bg__layer obsidian-bg__glow-mint" />
      <div className="obsidian-bg__layer obsidian-bg__glow-ember" />

      {/* Layer 3: Grid */}
      <div className="obsidian-bg__layer obsidian-bg__grid" />

      {/* Layer 4: Film grain */}
      <div className="obsidian-bg__layer obsidian-bg__grain" />

      {/* Layer 5: Vignette */}
      <div className="obsidian-bg__layer obsidian-bg__vignette" />
    </div>
  );
}
