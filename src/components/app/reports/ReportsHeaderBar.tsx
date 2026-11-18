"use client";

import React from "react";
import {
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Clock,
  MapPin,
  Utensils,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePreset, ReportFilters } from "@/lib/enterprise-reporting";

interface ReportsHeaderBarProps {
  filters: ReportFilters;
  onFilterChange: (updates: Partial<ReportFilters>) => void;
  outlets: Array<{ id: string; name: string; city: string }>;
  onRefresh: () => void;
  loading: boolean;
  onOpenExports: () => void;
  onOpenSchedules: () => void;
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "TODAY", label: "Today" },
  { key: "YESTERDAY", label: "Yesterday" },
  { key: "LAST_7_DAYS", label: "Last 7 Days" },
  { key: "LAST_30_DAYS", label: "Last 30 Days" },
  { key: "THIS_WEEK", label: "This Week" },
  { key: "LAST_WEEK", label: "Last Week" },
  { key: "THIS_MONTH", label: "This Month" },
  { key: "LAST_MONTH", label: "Last Month" },
  { key: "THIS_QUARTER", label: "This Quarter" },
  { key: "THIS_YEAR", label: "This Year" },
  { key: "CUSTOM", label: "Custom Dates..." },
];

export function ReportsHeaderBar({
  filters,
  onFilterChange,
  outlets,
  onRefresh,
  loading,
  onOpenExports,
  onOpenSchedules,
}: ReportsHeaderBarProps) {
  const isCustom = filters.rangePreset === "CUSTOM";

  return (
    <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs space-y-3">
      {/* Top Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          <Calendar className="h-4 w-4 text-[#16845B] shrink-0" />
          <div className="flex items-center gap-1.5 flex-nowrap">
            {PRESETS.map((p) => {
              const active = filters.rangePreset === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => onFilterChange({ rangePreset: p.key })}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                    active
                      ? "bg-[#16845B] text-white border-[#16845B] shadow-2xs"
                      : "bg-[#F8FAF9] text-[#718078] border-[#E5EBE7] hover:text-[#172B25] hover:border-[#16845B]/40"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 rounded-xl border-[#E5EBE7] text-xs font-bold gap-1 text-[#172B25] hover:bg-[#F8FAF9]"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSchedules}
            className="h-8 rounded-xl border-[#E5EBE7] text-xs font-bold gap-1 text-[#172B25] hover:bg-[#F8FAF9]"
          >
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            <span>Schedules</span>
          </Button>

          <Button
            size="sm"
            onClick={onOpenExports}
            className="h-8 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold gap-1 px-3.5 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Center</span>
          </Button>
        </div>
      </div>

      {/* Granular Scope Selectors (Outlet, Order Type, Payment, Custom Dates) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-[#E5EBE7] text-xs">
        {/* Outlet Scope */}
        <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-2.5 py-1">
          <MapPin className="h-3.5 w-3.5 text-[#16845B]" />
          <span className="text-[11px] font-bold text-[#718078]">Outlet:</span>
          <select
            value={filters.outletId || "ALL"}
            onChange={(e) => onFilterChange({ outletId: e.target.value === "ALL" ? null : e.target.value })}
            className="bg-transparent font-bold text-[#172B25] focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Outlets (Consolidated)</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} {o.city ? `(${o.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Order Type */}
        <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-2.5 py-1">
          <Utensils className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[11px] font-bold text-[#718078]">Service:</span>
          <select
            value={filters.orderType || "ALL"}
            onChange={(e) => onFilterChange({ orderType: e.target.value })}
            className="bg-transparent font-bold text-[#172B25] focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Services</option>
            <option value="DINE_IN">Dine-In</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {isCustom && (
          <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200 rounded-xl px-3 py-1">
            <span className="text-[11px] font-bold text-amber-900">Custom Range:</span>
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="bg-white border border-amber-200 text-xs rounded-lg px-2 py-0.5 font-bold text-[#172B25]"
            />
            <span className="text-[11px] text-amber-800 font-bold">to</span>
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="bg-white border border-amber-200 text-xs rounded-lg px-2 py-0.5 font-bold text-[#172B25]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
