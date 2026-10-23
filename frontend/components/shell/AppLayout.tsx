"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { ObsidianBackground } from "./ObsidianBackground";
import { ScrollProgress } from "./ScrollProgress";
import { MobileDock } from "./MobileDock";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { FooterStrip } from "./FooterStrip";
import { useAuthStore } from "@/lib/stores/authStore";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLandingPage = pathname === "/";
  // When logged out on landing page, do not show the sidebar
  const showSidebar = !isLandingPage || (mounted && isAuthenticated);
  const showMobileDock = !isLandingPage || (mounted && isAuthenticated);

  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-canvas text-text selection:bg-brand-500/30 selection:text-white">
      {/* Ambient 4-layer background */}
      <ObsidianBackground />
      <ScrollProgress />

      <div
        className={cn(
          "relative z-10 flex min-h-screen w-full gap-4 p-3 pb-24 sm:gap-5 sm:p-5 md:pb-5",
          !showSidebar && "justify-center"
        )}
      >
        {/* Floating glass sidebar - hidden when logged out on landing page */}
        {showSidebar && (
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            className="hidden md:flex"
          />
        )}

        {/* Main column */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-4",
            !showSidebar && "max-w-[1320px] w-full"
          )}
        >
          <TopHeader />

          <main key={pathname} className="flex flex-1 flex-col animate-page-in">
            <AuthGuard>{children}</AuthGuard>
          </main>

          <FooterStrip />
        </div>
      </div>

      {showMobileDock && <MobileDock />}
    </div>
  );
}
