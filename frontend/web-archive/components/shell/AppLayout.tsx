"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { ObsidianBackground } from "./ObsidianBackground";
import { GlobalBanners } from "./GlobalBanners";
import { FooterStrip } from "./FooterStrip";
import { useUiStore } from "@/lib/stores/uiStore";
import { useWalletSync } from "@/lib/hooks/useWalletSync";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { connectionState, isAssetHalted, haltedAssetName } = useUiStore();

  // Authoritative wallet snapshot for the vault bar and balance readouts.
  useWalletSync();

  return (
    <>
      {/* Obsidian Background */}
      <ObsidianBackground />

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 flex flex-col overflow-hidden",
            sidebarCollapsed ? "lg:pl-[100px]" : "lg:pl-[276px]"
          )}
        >
          {/* Global Banners */}
          <GlobalBanners
            connectionState={connectionState}
            isAssetHalted={isAssetHalted}
            haltedAssetName={haltedAssetName ?? undefined}
          />

          {/* Top Header */}
          <TopHeader sidebarCollapsed={sidebarCollapsed} />

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>

          {/* Footer Strip */}
          <FooterStrip />
        </main>
      </div>
    </>
  );
}

/** Public layout (no sidebar) for landing, login, etc. */
export function PublicLayout({ children }: AppLayoutProps) {
  const { connectionState } = useUiStore();

  return (
    <>
      <ObsidianBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <GlobalBanners connectionState={connectionState} />
        <main className="flex-1">{children}</main>
        <FooterStrip />
      </div>
    </>
  );
}