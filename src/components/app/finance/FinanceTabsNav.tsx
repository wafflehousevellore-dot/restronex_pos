"use client";

import React from "react";
import {
  TrendingUp,
  Receipt,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Plus,
} from "lucide-react";

export type FinanceTabMode = "overview" | "dayend" | "tax" | "reconciliation" | "reports";

interface FinanceTabsNavProps {
  activeTab: FinanceTabMode;
  onTabChange: (tab: FinanceTabMode) => void;
  selectedDays: number;
  onDaysChange: (days: number) => void;
  selectedOutlet: string;
  onOutletChange: (outletId: string) => void;
  outlets: Array<{ id: string; name: string }>;
  onOpenDayEndModal: () => void;
  onExportCsv: () => void;
  isOwnerOrManager: boolean;
}

export function FinanceTabsNav({
  activeTab,
  onTabChange,
  selectedDays,
  onDaysChange,
  selectedOutlet,
  onOutletChange,
  outlets,
  onOpenDayEndModal,
  onExportCsv,
  isOwnerOrManager,
}: FinanceTabsNavProps) {
  const tabs = [
    { id: "overview" as FinanceTabMode, label: "Financial Overview", icon: TrendingUp },
    { id: "dayend" as FinanceTabMode, label: "Day-End Closing & Z-Reports", icon: CheckCircle2 },
    { id: "tax" as FinanceTabMode, label: "GST & Tax Configuration", icon: Percent },
    { id: "reconciliation" as FinanceTabMode, label: "Payment Reconciliation", icon: Receipt },
    { id: "reports" as FinanceTabMode, label: "Reports & Analytics", icon: FileSpreadsheet },
  ];

  return (
    <div className="flex flex-col gap-3.5 border-b border-[#E5EBE7] pb-3">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#16845B] text-white shadow-xs"
                    : "bg-white text-[#55655D] border border-[#E5EBE7] hover:bg-[#F2F5F3] hover:text-[#172B25]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#718078]"}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#16845B]" />
            <select
              value={selectedDays}
              onChange={(e) => onDaysChange(Number(e.target.value))}
              className="bg-transparent font-semibold text-[#172B25] outline-none cursor-pointer"
            >
              <option value={1}>Today (Live)</option>
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={365}>Last 1 Year</option>
            </select>
          </div>

          {/* Outlet Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-[#16845B]" />
            <select
              value={selectedOutlet}
              onChange={(e) => onOutletChange(e.target.value)}
              className="bg-transparent font-semibold text-[#172B25] outline-none cursor-pointer"
            >
              <option value="ALL">All Outlets (Consolidated)</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
            title="Download CSV"
          >
            <Download className="h-3.5 w-3.5 text-[#718078]" />
            <span>Export CSV</span>
          </button>

          {/* Day End Trigger */}
          {isOwnerOrManager && (
            <button
              onClick={onOpenDayEndModal}
              className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Perform Day-End</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
