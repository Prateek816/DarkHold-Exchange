"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  ChevronDown,
  ChevronUp,
  Settings,
  User,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SearchField } from "@/components/ui/PillButton";
import { VaultBarCompact } from "@/components/ui/GaugeBar";
import { LivePill } from "@/components/ui/LivePill";
import { AvatarButton } from "@/components/ui/AvatarButton";
import { PillButton } from "@/components/ui/PillButton";
import { SimBadge } from "@/components/ui/SimBadge";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";

interface TopHeaderProps {
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Page title for breadcrumb */
  pageTitle?: string;
  /** Additional actions on the right */
  actions?: React.ReactNode;
  /** Sidebar collapsed state */
  sidebarCollapsed?: boolean;
}

export function TopHeader({
  breadcrumbs = [],
  pageTitle,
  actions,
  sidebarCollapsed,
}: TopHeaderProps) {
  const pathname = usePathname();
  const { connectionState, notifications, markNotificationRead } = useUiStore();
  const { totalCredits, availableCredits, reservedCredits } = useWalletStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Build breadcrumb items
  const breadcrumbItems = React.useMemo(() => {
    const items = [
      { label: "Overview", href: "/market" },
      ...breadcrumbs,
    ];
    if (pageTitle) {
      items.push({ label: pageTitle });
    }
    return items;
  }, [breadcrumbs, pageTitle]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Focus search - would need ref
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-4 z-30 flex h-14 shrink-0 items-center gap-4 rounded-[16px] border border-glass-border bg-white/[0.02] backdrop-blur-xl px-4 transition-all duration-300 ease-spring">
      {/* Breadcrumb */}
      <div className="flex-1 min-w-0 flex items-center gap-3 overflow-hidden">
        <Breadcrumb items={breadcrumbItems} />

        {/* Search */}
        <div className="hidden md:block ml-4 max-w-[320px]">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Jump to asset, page…"
            shortcut="⌘K"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Vault Bar */}
        <VaultBarCompact
          available={availableCredits}
          reserved={reservedCredits}
          total={totalCredits}
          formatValue={(v) => v.toLocaleString()}
        />

        {/* Live Connection */}
        <LivePill state={connectionState} compact />

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <IconButton
            variant="glass"
            size="sm"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sell text-[8px] font-bold text-canvas">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </IconButton>

          {showNotifications && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute right-0 top-full mt-2 w-80 glass-card rounded-card shadow-card overflow-hidden z-50"
                role="menu"
              >
                <div className="border-b border-glass-border p-3 flex items-center justify-between">
                  <span className="font-semibold text-text">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
                      className="text-[10px] font-mono text-brand-400 hover:text-brand-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-text-muted text-[12px]">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markNotificationRead(notification.id)}
                        className={cn(
                          "w-full p-3 text-left transition-colors hover:bg-white/[0.03] border-b border-glass-border/50 last:border-0",
                          !notification.read && "bg-white/[0.02]"
                        )}
                        role="menuitem"
                      >
                        <p className="font-medium text-[12px] text-text">{notification.title}</p>
                        {notification.message && (
                          <p className="mt-0.5 text-[11px] text-text-muted">{notification.message}</p>
                        )}
                        <p className="mt-1 font-mono text-[9px] text-text-dim">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <AvatarButton
            name="trader_01"
            size="sm"
            status="online"
            dropdown={
              <>
                <div className="p-2 border-b border-glass-border">
                  <p className="font-semibold text-text">trader_01</p>
                  <p className="font-mono text-[10px] text-text-dim">Demo Account</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-[12px] text-text-muted hover:text-text hover:bg-white/[0.03] flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-[12px] text-text-muted hover:text-text hover:bg-white/[0.03] flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-[12px] text-text-muted hover:text-text hover:bg-white/[0.03] flex items-center gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  Help
                </button>
                <div className="border-t border-glass-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => window.location.href = "/login"}
                  className="w-full px-3 py-2 text-left text-[12px] text-sell hover:bg-sell-tint flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </>
            }
          />
        </div>

        {/* Custom Actions */}
        {actions}

        {/* Sim Badge */}
        <SimBadge label="SIM" size="sm" />
      </div>
    </header>
  );
}

/** IconButton re-export for convenience */
import { IconButton } from "@/components/ui/PillButton";