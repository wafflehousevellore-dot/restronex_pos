"use client";

import React from "react";
import { OrderMetrics } from "./OrderMetricsCards";

interface OrderTabsNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  metrics: OrderMetrics;
  heldOrdersCount: number;
}

export function OrderTabsNav({
  activeTab,
  onTabChange,
  metrics,
  heldOrdersCount,
}: OrderTabsNavProps) {
  const tabs = [
    { id: "ALL", label: "All Orders", count: metrics.total },
    { id: "NEW", label: "New", count: metrics.new, badgeColor: "bg-amber-100 text-amber-800" },
    { id: "ACCEPTED", label: "Accepted", count: metrics.accepted, badgeColor: "bg-blue-100 text-blue-800" },
    { id: "PREPARING", label: "Preparing", count: metrics.preparing, badgeColor: "bg-purple-100 text-purple-800" },
    { id: "READY", label: "Ready", count: metrics.ready, badgeColor: "bg-emerald-100 text-emerald-800" },
    { id: "COMPLETED", label: "Completed", count: metrics.completed, badgeColor: "bg-slate-100 text-slate-700" },
    { id: "CANCELLED", label: "Cancelled", count: metrics.cancelled, badgeColor: "bg-rose-100 text-rose-800" },
    { id: "HELD", label: "Held Orders", count: heldOrdersCount, badgeColor: "bg-amber-100 text-amber-900 border border-amber-300" },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200 pb-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              isActive
                ? "bg-[#16845B] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                isActive
                  ? "bg-white/25 text-white"
                  : tab.badgeColor || "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
