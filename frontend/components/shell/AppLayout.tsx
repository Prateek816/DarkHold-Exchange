"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { ObsidianBackground } from "./ObsidianBackground";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-canvas text-text selection:bg-brand-500 selection:text-canvas overflow-x-hidden flex">
      {/* 4-Layer Fixed Ambient Background */}
      <ObsidianBackground />

      {/* Outer 20px padding wrapper */}
      <div className="relative z-10 flex w-full p-3 sm:p-5 gap-4 sm:gap-6 min-h-screen">
        {/* Floating Glass Sidebar (Desktop/Tablet) */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          className="hidden md:flex"
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 space-y-4">
          <TopHeader />
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </div>
    </div>
  );
}
