"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import {
  Menu,
  ShoppingCart,
  Bell,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { OutletSwitcher, OutletItem } from "@/components/ui/outlet-switcher";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/breadcrumbs";

export interface AppHeaderProps {
  onOpenMobile: () => void;
  tenant?: any;
  outlet?: any;
  user?: any;
}

// Map pathname segments to friendly breadcrumb labels
function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return [];

  const items: BreadcrumbItem[] = [];
  let currentPath = "";

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    currentPath += `/${parts[0]}/${parts.slice(1, i + 1).join("/")}`;

    const label = part
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    items.push({
      label,
      href: i === parts.length - 1 ? undefined : currentPath,
    });
  }

  return items;
}

export function AppHeader({
  onOpenMobile,
  tenant,
  outlet,
}: AppHeaderProps) {
  const pathname = usePathname();
  const breadcrumbItems = React.useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const outlets: OutletItem[] = (tenant?.outlets || []).map((o: any) => ({
    id: o.id,
    name: o.name,
    code: o.code,
    address: o.address,
  }));

  return (
    <header className="sticky top-0 z-20 h-[68px] flex items-center justify-between gap-3 border-b border-[#E5EBE7] bg-white/95 backdrop-blur-md px-4 sm:px-6 shadow-2xs">
      {/* Left: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl border border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs transition"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="hidden sm:block min-w-0">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      {/* Center: Global Search & Live Sync */}
      <div className="hidden xl:flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3 py-1 text-xs font-semibold text-[#16845B]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16845B] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16845B]" />
          </span>
          <span>Cloud Sync Active</span>
        </div>
      </div>

      {/* Right: Outlet Switcher, Notifications, Actions, User */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Outlet Switcher */}
        {outlets.length > 0 && (
          <div className="hidden md:block">
            <OutletSwitcher
              outlets={outlets}
              currentOutletId={outlet?.id}
            />
          </div>
        )}

        {/* Clerk Org Switcher (compact) */}
        <div className="hidden lg:block">
          <OrganizationSwitcher
            hidePersonal
            createOrganizationMode="navigation"
            createOrganizationUrl="/app/organization"
            afterCreateOrganizationUrl="/app/organization"
            afterSelectOrganizationUrl="/app/dashboard"
            appearance={{
              elements: {
                organizationSwitcherTrigger:
                  "bg-white border border-[#E5EBE7] text-[#172B25] hover:bg-[#F8FAF9] text-xs font-semibold py-1.5 px-2.5 rounded-xl shadow-2xs",
                organizationPreviewTextContainer: "text-[#172B25]",
                organizationSwitcherTriggerIcon: "text-[#718078]",
              },
            }}
          />
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs transition relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#16845B]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EBE7]">
                <span className="text-xs font-bold text-[#172B25]">Notifications</span>
                <span className="text-[10px] text-[#16845B] font-bold">1 New</span>
              </div>
              <div className="py-3 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-[#16845B] shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#172B25]">System Ready</div>
                    <div className="text-[11px] text-[#718078]">
                      All aggregator webhook receivers and thermal printing queues are running.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Setup Wizard */}
        <Link
          href="/app/onboarding"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] hover:border-[#16845B]/30 px-3.5 py-2 text-xs font-semibold text-[#172B25] shadow-2xs transition"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#16845B]" />
          <span>Wizard</span>
        </Link>

        {/* Open POS Primary Button */}
        <Link
          href="/app/pos"
          className="rounded-xl bg-[#16845B] hover:bg-[#116B49] px-4 py-2 text-xs font-bold text-white shadow-xs hover:shadow-sm transition flex items-center gap-1.5 active:scale-95"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open POS</span>
          <span className="sm:hidden">POS</span>
        </Link>

        {/* Clerk User Button */}
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "h-8 w-8 rounded-full border border-[#E5EBE7]",
            },
          }}
        />
      </div>
    </header>
  );
}
