"use client";

import React from "react";
import {
  BarChart3,
  TrendingUp,
  UtensilsCrossed,
  Package,
  Wallet,
  Receipt,
  Building2,
  Users,
  HeartHandshake,
  ShieldAlert,
  Download,
  Clock,
} from "lucide-react";

export type ReportsTabKey =
  | "OVERVIEW"
  | "SALES"
  | "PRODUCTS"
  | "INVENTORY"
  | "FINANCIAL"
  | "GST_TAX"
  | "OUTLETS"
  | "STAFF"
  | "CUSTOMERS"
  | "AUDIT"
  | "EXPORTS"
  | "SCHEDULES";

interface ReportsNavigationTabsProps {
  activeTab: ReportsTabKey;
  onTabChange: (tab: ReportsTabKey) => void;
  unresolvedAlertsCount?: number;
}

export function ReportsNavigationTabs({
  activeTab,
  onTabChange,
  unresolvedAlertsCount = 0,
}: ReportsNavigationTabsProps) {
  const tabs = [
    { key: "OVERVIEW" as ReportsTabKey, label: "Overview", icon: BarChart3 },
    { key: "SALES" as ReportsTabKey, label: "Sales Analytics", icon: TrendingUp },
    { key: "PRODUCTS" as ReportsTabKey, label: "Product Performance", icon: UtensilsCrossed },
    { key: "INVENTORY" as ReportsTabKey, label: "Inventory & Stock", icon: Package, badge: unresolvedAlertsCount > 0 ? `${unresolvedAlertsCount}` : undefined },
    { key: "FINANCIAL" as ReportsTabKey, label: "Financial Accounting", icon: Wallet },
    { key: "GST_TAX" as ReportsTabKey, label: "GST & Tax (India)", icon: Receipt },
    { key: "OUTLETS" as ReportsTabKey, label: "Outlet Performance", icon: Building2 },
    { key: "STAFF" as ReportsTabKey, label: "Staff Analytics", icon: Users },
    { key: "CUSTOMERS" as ReportsTabKey, label: "Customer & CLV", icon: HeartHandshake },
    { key: "AUDIT" as ReportsTabKey, label: "Audit Logs", icon: ShieldAlert },
    { key: "EXPORTS" as ReportsTabKey, label: "Export Center", icon: Download },
    { key: "SCHEDULES" as ReportsTabKey, label: "Scheduled Reports", icon: Clock },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E5EBE7] pb-2 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer border ${
              active
                ? "bg-[#16845B] text-white border-[#16845B] shadow-xs"
                : "bg-white text-[#718078] border-[#E5EBE7] hover:bg-[#F8FAF9] hover:text-[#172B25]"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-white" : "text-[#718078]"}`} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="rounded-full bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
