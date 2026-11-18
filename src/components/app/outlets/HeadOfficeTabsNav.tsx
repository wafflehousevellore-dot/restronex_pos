"use client";

import React from "react";
import { 
  Building2, 
  BarChart3, 
  UtensilsCrossed, 
  Boxes, 
  Handshake, 
  Plus, 
  FileSpreadsheet 
} from "lucide-react";

export type HeadOfficeTabType = "OUTLETS" | "COMPARISON" | "MENU" | "INVENTORY" | "FRANCHISE";

interface HeadOfficeTabsNavProps {
  activeTab: HeadOfficeTabType;
  onTabChange: (tab: HeadOfficeTabType) => void;
  onOpenCreateOutlet: () => void;
  onExportCsv: () => void;
  outletsCount: number;
}

export function HeadOfficeTabsNav({
  activeTab,
  onTabChange,
  onOpenCreateOutlet,
  onExportCsv,
  outletsCount,
}: HeadOfficeTabsNavProps) {
  const tabs = [
    { id: "OUTLETS" as HeadOfficeTabType, label: "Branch Outlets", icon: Building2, count: outletsCount },
    { id: "COMPARISON" as HeadOfficeTabType, label: "Chain Benchmark", icon: BarChart3 },
    { id: "MENU" as HeadOfficeTabType, label: "Central Menu Control", icon: UtensilsCrossed },
    { id: "INVENTORY" as HeadOfficeTabType, label: "Chain Inventory", icon: Boxes },
    { id: "FRANCHISE" as HeadOfficeTabType, label: "Franchise Standards", icon: Handshake },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EBE7] pb-2">
      {/* Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#172B25] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#E5EBE7] hover:border-gray-300 rounded-xl text-xs font-bold text-[#172B25] shadow-2xs transition cursor-pointer"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#16845B]" />
          <span>Export Analytics</span>
        </button>

        <button
          type="button"
          onClick={onOpenCreateOutlet}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Outlet</span>
        </button>
      </div>
    </div>
  );
}
