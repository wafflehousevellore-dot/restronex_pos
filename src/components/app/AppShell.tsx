"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import {
  LayoutDashboard,
  ShoppingCart,
  Utensils,
  ChefHat,
  Table2,
  Box,
  Users,
  BarChart3,
  Building2,
  UserCog,
  Settings,
  Plug,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "POS Billing", href: "/app/pos", icon: ShoppingCart },
  { label: "Orders", href: "/app/orders", icon: FileText },
  { label: "Floor & Tables", href: "/app/tables", icon: Table2 },
  { label: "Kitchen (KDS)", href: "/app/kitchen", icon: ChefHat },
  { label: "Menu Catalog", href: "/app/menu", icon: Utensils },
  { label: "Inventory", href: "/app/inventory", icon: Box },
  { label: "Purchases", href: "/app/purchases", icon: Box },
  { label: "Customers", href: "/app/customers", icon: Users },
  { label: "Reports & Analytics", href: "/app/reports", icon: BarChart3 },
  { label: "Payments & Gateway", href: "/app/payments", icon: CreditCard },
  { label: "Outlets", href: "/app/outlets", icon: Building2 },
  { label: "Staff & Team", href: "/app/staff", icon: UserCog },
  { label: "Integrations", href: "/app/integrations", icon: Plug },
  { label: "Subscription", href: "/app/subscription", icon: CreditCard },
  { label: "Marketplace", href: "/app/marketplace", icon: Plug, badge: "Hub" },
  { label: "Tokens", href: "/app/tokens", icon: FileText },
  { label: "Reservations", href: "/app/reservations", icon: Table2 },
  { label: "Feedback", href: "/app/feedback", icon: Users },
  { label: "Expenses", href: "/app/expenses", icon: CreditCard },
  { label: "Settings", href: "/app/settings", icon: Settings },
  { label: "WhatsApp & Printing", href: "/app/settings/integrations", icon: Plug },
  { label: "Audit Logs", href: "/app/audit-logs", icon: FileText },
];

export default function AppShell({
  children,
  user,
  tenant,
  outlet,
}: {
  children: React.ReactNode;
  user?: any;
  tenant?: any;
  outlet?: any;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" });
    router.push("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25] flex">
      {/* Mobile Drawer Overlay */}
      {mobile && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[268px] bg-white text-[#172B25] flex flex-col border-r border-[#E5EBE7] ${
          mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform shadow-xs`}
      >
        {/* Brand Header */}
        <div className="h-[68px] flex items-center justify-between px-5 border-b border-[#E5EBE7] bg-white shrink-0">
          <Link href="/app/dashboard" className="flex items-center gap-2.5">
            <Logo size="small" />
          </Link>
          <button
            className="lg:hidden p-2 text-[#718078] hover:text-[#172B25] rounded-lg hover:bg-[#F8FAF9]"
            onClick={() => setMobile(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tenant / Outlet Info Card */}
        {tenant && (
          <div className="px-3.5 py-3 border-b border-[#E5EBE7] bg-[#F8FAF9]/50 shrink-0">
            <div className="rounded-xl bg-white border border-[#E5EBE7] p-3 shadow-2xs">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#172B25] truncate">
                  {tenant.name}
                </span>
                <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-2 py-0.5 text-[10px] font-bold text-[#16845B]">
                  LIVE
                </span>
              </div>
              <div className="text-xs text-[#718078] truncate mt-0.5">
                {outlet ? outlet.name : `${tenant.outlets?.length || 1} outlet(s)`} •{" "}
                {tenant.businessType || "Restaurant"}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobile(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all ${
                  active
                    ? "bg-[#E8F5EE] text-[#16845B] font-bold shadow-2xs"
                    : "text-[#718078] hover:bg-[#F8FAF9] hover:text-[#172B25] font-medium"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-[#16845B]" : "text-[#718078]"
                  }`}
                />
                <span className="truncate flex-1">{n.label}</span>
                {(n as any).badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
                    {(n as any).badge}
                  </span>
                )}
              </Link>
            );
          })}

          {user?.isPlatformAdmin && (
            <div className="pt-2 mt-2 border-t border-[#E5EBE7]">
              <Link
                href="/platform"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[#16845B] hover:bg-[#E8F5EE] transition"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Platform Admin →</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User & Org Switcher Bottom Panel */}
        <div className="p-3.5 border-t border-[#E5EBE7] bg-white space-y-3 shrink-0">
          <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-2">
            <div className="text-[10px] font-bold tracking-widest text-[#718078] uppercase mb-1 px-1">
              Organization
            </div>
            <OrganizationSwitcher
              hidePersonal
              createOrganizationMode="navigation"
              createOrganizationUrl="/app/organization"
              afterCreateOrganizationUrl="/app/organization"
              afterSelectOrganizationUrl="/app/dashboard"
              appearance={{
                elements: {
                  organizationSwitcherTrigger:
                    "bg-white border border-[#E5EBE7] text-[#172B25] hover:bg-[#F8FAF9] w-full text-xs font-semibold py-1.5 rounded-lg shadow-2xs",
                  organizationPreviewTextContainer: "text-[#172B25]",
                  organizationSwitcherTriggerIcon: "text-[#718078]",
                },
              }}
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <div className="h-9 w-9 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-xs font-bold text-[#16845B] shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#172B25] truncate">
                {user?.name || "Restaurant Owner"}
              </div>
              <div className="text-[11px] text-[#718078] truncate">
                {user?.email || "owner@restronex.app"}
              </div>
            </div>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }} />
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 rounded-lg hover:bg-red-50 text-[#718078] hover:text-red-600 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-[268px] flex flex-col min-h-screen bg-[#F8FAF9]">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 h-[68px] flex items-center justify-between gap-4 border-b border-[#E5EBE7] bg-white/95 backdrop-blur px-6 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl border border-[#E5EBE7] bg-white text-[#172B25] shadow-2xs"
              onClick={() => setMobile(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-semibold text-[#16845B]">
              <span className="h-2 w-2 rounded-full bg-[#16845B] animate-pulse" />
              <span>Cloud Sync Active • Multi-Tenant Protected</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/onboarding"
              className="rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] hover:border-[#16845B]/30 px-4 py-2 text-xs font-semibold text-[#172B25] shadow-2xs transition"
            >
              Setup Wizard
            </Link>
            <Link
              href="/app/pos"
              className="rounded-xl bg-[#16845B] hover:bg-[#116B49] px-5 py-2 text-xs font-bold text-white shadow-xs hover:shadow-sm transition flex items-center gap-1.5"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Open POS</span>
            </Link>
            <UserButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 md:p-8 bg-[#F8FAF9] text-[#172B25]">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[#E5EBE7] bg-white px-6 py-4 text-xs text-[#718078] flex flex-wrap gap-2 items-center justify-between">
          <div>© 2026 RestroNex Restaurant OS • Enterprise Security • GST-Ready • Razorpay Verified</div>
          <Link
            href="/"
            className="text-[#16845B] hover:underline font-semibold flex items-center gap-1"
          >
            <span>Public Website →</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}
