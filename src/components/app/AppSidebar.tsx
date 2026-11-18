"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Table2,
  ChefHat,
  UtensilsCrossed,
  PackageSearch,
  Truck,
  Users,
  ShieldUser,
  BarChart3,
  SlidersHorizontal,
  CreditCard,
  Layers,
  History,
  Globe,
  MessageSquareShare,
  Tv2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  X,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  exact?: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    id: "overview",
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "sales",
    title: "SALES",
    items: [
      { label: "POS Billing", href: "/app/pos", icon: ShoppingCart, badge: "POS" },
      { label: "Orders", href: "/app/orders", icon: ReceiptText },
      { label: "Online Orders", href: "/app/integrations/online", icon: Globe, badge: "Live" },
      { label: "Tables & Floor", href: "/app/tables", icon: Table2 },
    ],
  },
  {
    id: "kitchen",
    title: "KITCHEN",
    items: [
      { label: "KDS Screen", href: "/app/kitchen", icon: ChefHat, badge: "Live" },
      { label: "Token Management", href: "/app/tokens", icon: Tv2 },
    ],
  },
  {
    id: "menu",
    title: "MENU",
    items: [
      { label: "Products & Pricing", href: "/app/menu", icon: UtensilsCrossed },
    ],
  },
  {
    id: "channels",
    title: "CHANNELS",
    items: [
      { label: "Swiggy & Zomato", href: "/app/integrations/online", icon: Globe },
      { label: "QR & Invoices", href: "/app/settings/integrations", icon: MessageSquareShare },
      { label: "Integrations Hub", href: "/app/integrations", icon: Layers },
    ],
  },
  {
    id: "operations",
    title: "OPERATIONS",
    items: [
      { label: "Inventory & Stock", href: "/app/inventory", icon: PackageSearch },
      { label: "Suppliers & Purchases", href: "/app/purchases", icon: Truck },
      { label: "Customers & CRM", href: "/app/customers", icon: Users },
      { label: "Staff & Team", href: "/app/staff", icon: ShieldUser },
    ],
  },
  {
    id: "business",
    title: "BUSINESS",
    items: [
      { label: "Reports & Analytics", href: "/app/reports", icon: BarChart3 },
      { label: "Marketplace", href: "/app/marketplace", icon: Layers, badge: "Add-ons" },
      { label: "Settings", href: "/app/settings", icon: SlidersHorizontal },
      { label: "Subscription", href: "/app/subscription", icon: CreditCard },
      { label: "Audit Logs", href: "/app/audit-logs", icon: History },
    ],
  },
];

export interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  tenant?: any;
  outlet?: any;
  user?: any;
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  tenant,
  outlet,
  user,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isItemActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#E5EBE7] bg-white transition-all duration-300 shadow-xs",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0 !w-[280px]" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand & Toggle Header */}
        <div className="h-[68px] px-4 flex items-center justify-between border-b border-[#E5EBE7] bg-white shrink-0">
          <Link
            href="/app/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <Logo size="small" showText={!collapsed || mobileOpen} />
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden lg:flex p-1.5 rounded-xl border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Outlet & Business Info Badge (When Expanded) */}
        {!collapsed && tenant && (
          <div className="p-3 border-b border-[#E5EBE7] bg-[#F8FAF9]/50 shrink-0">
            <div className="rounded-xl bg-white border border-[#E5EBE7] p-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#172B25] truncate">
                  {tenant.name}
                </span>
                <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-2 py-0.5 text-[9px] font-bold text-[#16845B]">
                  LIVE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#718078] truncate mt-1">
                <Store className="h-3 w-3 text-[#16845B] shrink-0" />
                <span className="truncate">
                  {outlet?.name || `${tenant.outlets?.length || 1} Outlets`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin">
          {navigationGroups.map((group) => {
            const isGroupCollapsed = Boolean(collapsedGroups[group.id]);

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Heading (Hidden in icon-only collapsed mode) */}
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#A0ACA5] uppercase hover:text-[#718078] transition"
                  >
                    <span>{group.title}</span>
                    <span className="text-[#A0ACA5]">
                      {isGroupCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </button>
                )}

                {/* Group Items */}
                {(!isGroupCollapsed || collapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobile}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "flex items-center rounded-xl text-xs font-semibold transition-all group relative",
                            collapsed
                              ? "justify-center p-2.5"
                              : "gap-2.5 px-3 py-2",
                            active
                              ? "bg-[#E8F5EE] text-[#16845B] font-bold shadow-2xs"
                              : "text-[#718078] hover:bg-[#F8FAF9] hover:text-[#172B25]"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              active
                                ? "text-[#16845B]"
                                : "text-[#718078] group-hover:text-[#172B25]"
                            )}
                          />

                          {!collapsed && (
                            <>
                              <span className="truncate flex-1">{item.label}</span>
                              {item.badge && (
                                <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#16845B]">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Platform Admin Link */}
          {user?.isPlatformAdmin && (
            <div className="pt-2 border-t border-[#E5EBE7]">
              <Link
                href="/platform"
                onClick={onCloseMobile}
                title={collapsed ? "Platform Admin" : undefined}
                className={cn(
                  "flex items-center rounded-xl text-xs font-semibold text-[#16845B] hover:bg-[#E8F5EE] transition",
                  collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#16845B]" />
                {!collapsed && <span>Platform Admin →</span>}
              </Link>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
