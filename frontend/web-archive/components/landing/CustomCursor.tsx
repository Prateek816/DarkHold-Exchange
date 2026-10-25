"use client";

import React, { useEffect, useState, useRef } from "react";

export function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isFinePointer = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    isFinePointer.current = mq.matches;
    if (!mq.matches) {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!isFinePointer.current) return;

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };

    const handleLeave = () => setVisible(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed z-[9999] pointer-events-none rounded-full border border-brand-500/50 bg-white/[0.06] backdrop-blur-[4px] transition-transform duration-100 ease-out",
        visible ? "block" : "hidden",
        hovered ? "scale-150 border-brand-500 bg-brand-500/20" : "scale-100",
        `translate-x-${pos.x}px translate-y-${pos.y}px -translate-x-1/2 -translate-y-1/2`,
      )}
      style={{ width: 16, height: 16 }}
      aria-hidden="true"
    />
  );
}

import { cn } from "@/lib/utils";
