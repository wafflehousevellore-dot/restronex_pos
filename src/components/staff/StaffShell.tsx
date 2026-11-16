"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  ChefHat,
  Table2,
  Box,
  User,
  Bell,
  LogOut,
  Menu,
  X,
  Store,
  ShieldCheck,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";

interface StaffShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  membership: {
    id: string;
    role: string;
    permissions: string[];
    tenant: {
      id: string;
      name: string;
    };
    authorizedOutlets: {
      id: string;
      name: string;
    }[];
  };
  activeOutletId?: string | null;
  allMemberships?: {
    id: string;
    role: string;
    tenant: {
      id: string;
      name: string;
    };
  }[];
}

export function StaffShell({
  children,
  user,
  membership,
  activeOutletId,
  allMemberships = [],
}: StaffShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingOutlet, setSwitchingOutlet] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState(false);

  const permissions = membership.permissions || [];
  const isOwner = membership.role === "OWNER";

  // Build permitted navigation items
  const navItems = [
    { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard, show: true },
    {
      label: "POS Billing",
      href: "/staff/pos",
      icon: ShoppingCart,
      show: isOwner || permissions.includes("pos.view"),
    },
    {
      label: "Live Orders",
      href: "/staff/orders",
      icon: FileText,
      show: isOwner || permissions.includes("orders.view"),
    },
    {
      label: "Kitchen (KDS)",
      href: "/staff/kitchen",
      icon: ChefHat,
      show: isOwner || permissions.includes("kitchen.view"),
    },
    {
      label: "Tables & Floor",
      href: "/staff/tables",
      icon: Table2,
      show: isOwner || permissions.includes("tables.view"),
    },
    {
      label: "Inventory",
      href: "/staff/inventory",
      icon: Box,
      show: isOwner || permissions.includes("inventory.view"),
    },
    { label: "Notifications", href: "/staff/notifications", icon: Bell, show: true },
    { label: "My Profile", href: "/staff/profile", icon: User, show: true },
  ].filter((item) => item.show);

  const activeOutlet =
    membership.authorizedOutlets.find((o) => o.id === activeOutletId) ||
    membership.authorizedOutlets[0];

  async function handleOutletSwitch(outletId: string) {
    setSwitchingOutlet(true);
    document.cookie = `restronex_outlet=${outletId}; path=/; max-age=2592000; SameSite=Lax`;
    router.refresh();
    setSwitchingOutlet(false);
  }

  async function handleOrgSwitch(orgId: string) {
    setSwitchingOrg(true);
    document.cookie = `restronex_org=${orgId}; path=/; max-age=2592000; SameSite=Lax`;
    router.push("/staff/dashboard");
    router.refresh();
  }

  async function handleSignOut() {
    await signOut();
    router.push("/staff/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E3EBE6] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Organization */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#4A5D55] hover:bg-[#F0F5F2]"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href="/staff/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#16845B] text-white flex items-center justify-center font-bold text-base shadow-xs">
                RN
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#0F1E19] flex items-center gap-1.5">
                  RestroNex <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#E8F5EE] text-[#16845B]">STAFF</span>
                </span>
                <p className="text-[11px] text-[#6F8279] truncate max-w-[140px] sm:max-w-[200px]">
                  {membership.tenant.name}
                </p>
              </div>
            </Link>
          </div>

          {/* Context Switchers & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multi-Org Switcher */}
            {allMemberships.length > 1 && (
              <div className="relative">
                <select
                  value={membership.tenant.id}
                  onChange={(e) => handleOrgSwitch(e.target.value)}
                  disabled={switchingOrg}
                  className="text-xs bg-[#F8FAF9] border border-[#D2DFD8] rounded-xl px-2.5 py-1.5 text-[#0F1E19] font-medium focus:ring-1 focus:ring-[#16845B] outline-none"
                >
                  {allMemberships.map((m) => (
                    <option key={m.tenant.id} value={m.tenant.id}>
                      {m.tenant.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Authorized Outlet Selector */}
            {membership.authorizedOutlets.length > 1 ? (
              <div className="flex items-center gap-1 bg-[#F0F5F2] rounded-xl px-2.5 py-1.5 border border-[#D2DFD8]">
                <Store className="w-3.5 h-3.5 text-[#16845B]" />
                <select
                  value={activeOutlet?.id || ""}
                  onChange={(e) => handleOutletSwitch(e.target.value)}
                  disabled={switchingOutlet}
                  className="text-xs bg-transparent text-[#0F1E19] font-semibold focus:outline-none cursor-pointer"
                >
                  {membership.authorizedOutlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : activeOutlet ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-[#F0F5F2] rounded-xl px-2.5 py-1 text-xs text-[#0F1E19] font-medium border border-[#D2DFD8]">
                <Store className="w-3.5 h-3.5 text-[#16845B]" />
                <span>{activeOutlet.name}</span>
              </div>
            ) : null}

            {/* Role Badge */}
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              {membership.role}
            </span>

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E3EBE6]">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-[#0F1E19] leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#6F8279]">{user.email}</p>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl text-[#6F8279] hover:text-red-600 hover:bg-red-50 transition"
                title="Sign out of staff workspace"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex border-t border-[#E3EBE6] bg-[#FAFCFB]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 py-1.5 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? "bg-[#16845B] text-white shadow-xs"
                      : "text-[#4A5D55] hover:bg-[#E8F5EE] hover:text-[#16845B]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-[#E3EBE6] bg-white p-4 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    active
                      ? "bg-[#16845B] text-white"
                      : "text-[#4A5D55] hover:bg-[#F0F5F2]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
