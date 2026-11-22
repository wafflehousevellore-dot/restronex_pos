"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  PackageSearch,
  Menu,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
  user?: any;
}

export function MobileBottomNav({ onOpenDrawer, user }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/app/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/app/dashboard",
    },
    {
      label: "POS Billing",
      href: "/app/pos",
      icon: ShoppingCart,
      active: pathname.startsWith("/app/pos"),
      badge: "POS",
    },
    {
      label: "Orders",
      href: "/app/orders",
      icon: ReceiptText,
      active: pathname.startsWith("/app/orders"),
    },
    {
      label: "Inventory",
      href: "/app/inventory",
      icon: PackageSearch,
      active: pathname.startsWith("/app/inventory"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5EBE7] px-2 py-1.5 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative select-none min-w-[56px] min-h-[48px]",
                item.active
                  ? "text-[#16845B] font-bold"
                  : "text-[#718078] hover:text-[#172B25] font-medium"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", item.active && "stroke-[2.5]")} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-[#16845B] text-white text-[9px] font-black px-1 py-0.2 rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              {item.active && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-[#16845B] rounded-full" />
              )}
            </Link>
          );
        })}

        {/* More Options / Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[#718078] hover:text-[#172B25] transition select-none min-w-[56px] min-h-[48px] cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
