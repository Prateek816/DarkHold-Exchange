'use client';

import React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { ConnectionBanner } from './Banners';
import { useSidebarStore } from '@/lib/store';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);

  return (
    <div className="min-h-screen bg-[var(--bg-1)] text-[var(--text)] relative overflow-x-hidden">
      <AppSidebar />
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'pl-0 lg:pl-[68px]' : 'pl-0 lg:pl-[248px]'
        }`}
      >
        <AppTopBar title={title} />
        <div className="pt-16 flex-1 flex flex-col">
          <ConnectionBanner />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1680px] w-full mx-auto" id="main-content">
            {children}
          </main>
          <footer className="py-4 px-6 border-t border-[var(--line-soft)] text-center text-[11px] font-mono text-[var(--muted)]" role="contentinfo">
            Simulated market · Funds are simulated credits · Activity includes simulated traders (SIM)
          </footer>
        </div>
      </div>
      {/* ARIA live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcer" />
    </div>
  );
}
