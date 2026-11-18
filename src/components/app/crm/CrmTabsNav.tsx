"use client";

import React from "react";
import { Users, Award, Ticket, Star, Send, BarChart3, AlertCircle } from "lucide-react";

export type CrmTabKey = "DIRECTORY" | "LOYALTY" | "OFFERS" | "FEEDBACK" | "CAMPAIGNS" | "ANALYTICS";

interface CrmTabsNavProps {
  activeTab: CrmTabKey;
  onTabChange: (tab: CrmTabKey) => void;
  unresolvedCount?: number;
  whatsAppSetupRequired?: boolean;
}

export function CrmTabsNav({
  activeTab,
  onTabChange,
  unresolvedCount = 0,
  whatsAppSetupRequired = false,
}: CrmTabsNavProps) {
  const tabs = [
    {
      key: "DIRECTORY" as CrmTabKey,
      label: "Customer Directory",
      icon: Users,
    },
    {
      key: "LOYALTY" as CrmTabKey,
      label: "Loyalty & Rewards",
      icon: Award,
    },
    {
      key: "OFFERS" as CrmTabKey,
      label: "Memberships & Coupons",
      icon: Ticket,
    },
    {
      key: "FEEDBACK" as CrmTabKey,
      label: "Feedback & Complaints",
      icon: Star,
      badge: unresolvedCount > 0 ? `${unresolvedCount} Open` : undefined,
      badgeColor: "bg-red-500 text-white",
    },
    {
      key: "CAMPAIGNS" as CrmTabKey,
      label: "Marketing Automation",
      icon: Send,
      alert: whatsAppSetupRequired,
    },
    {
      key: "ANALYTICS" as CrmTabKey,
      label: "Customer Analytics",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E5EBE7] pb-2 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              isActive
                ? "bg-[#16845B] text-white shadow-xs"
                : "bg-white text-[#718078] hover:bg-[#F8FAF9] hover:text-[#172B25] border border-[#E5EBE7]"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#718078]"}`} />
            <span>{tab.label}</span>

            {tab.badge && (
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tab.badgeColor}`}>
                {tab.badge}
              </span>
            )}

            {tab.alert && (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
