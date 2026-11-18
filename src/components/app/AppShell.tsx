"use client";

import * as React from "react";
import Link from "next/link";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { ToastProvider } from "@/components/ui/toast-notification";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: React.ReactNode;
  user?: any;
  tenant?: any;
  outlet?: any;
}

export default function AppShell({
  children,
  user,
  tenant,
  outlet,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);

  // Load saved sidebar state from localStorage if available
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("restronex_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const handleToggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("restronex_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F8FAF9] text-[#172B25] flex flex-col antialiased">
        {/* Reusable Grouped Sidebar */}
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={handleToggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          tenant={tenant}
          outlet={outlet}
          user={user}
        />

        {/* Main Content Area */}
        <div
          className={cn(
            "flex-1 flex flex-col min-h-screen transition-all duration-300 bg-[#F8FAF9]",
            collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
          )}
        >
          {/* Top Sticky Navigation */}
          <AppHeader
            onOpenMobile={() => setMobileOpen(true)}
            tenant={tenant}
            outlet={outlet}
            user={user}
          />

          {/* Page Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#F8FAF9] text-[#172B25] max-w-[1600px] w-full mx-auto">
            {children}
          </main>

          {/* Standardized Application Footer */}
          <footer className="border-t border-[#E5EBE7] bg-white px-6 py-4 text-xs text-[#718078] flex flex-wrap gap-2 items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#172B25]">RestroNex Restaurant OS</span>
              <span>•</span>
              <span>Enterprise Edition</span>
              <span>•</span>
              <span className="text-[#16845B] font-medium">RestroNex Architecture</span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/app/settings"
                className="text-[#718078] hover:text-[#172B25] transition"
              >
                Settings
              </Link>
              <Link
                href="/"
                className="text-[#16845B] hover:underline font-semibold"
              >
                Public Website →
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
