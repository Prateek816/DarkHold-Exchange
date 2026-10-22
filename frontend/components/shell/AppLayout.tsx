"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { ObsidianBackground } from "./ObsidianBackground";
import { ScrollProgress } from "./ScrollProgress";
import { MobileDock } from "./MobileDock";
import { FooterStrip } from "./FooterStrip";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-canvas text-text selection:bg-brand-500/30 selection:text-white">
      {/* Ambient 4-layer background */}
      <ObsidianBackground />
      <ScrollProgress />

      <div className="relative z-10 flex min-h-screen w-full gap-4 p-3 pb-24 sm:gap-5 sm:p-5 md:pb-5">
        {/* Floating glass sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          className="hidden md:flex"
        />

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TopHeader />

          <main key={pathname} className="flex flex-1 flex-col animate-page-in">
            {children}
          </main>

          <FooterStrip />
        </div>
      </div>

      <MobileDock />
    </div>
  );
}
