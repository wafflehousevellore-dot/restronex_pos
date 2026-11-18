"use client";

import React from "react";
import {
  Search,
  Filter,
  Calendar,
  Building2,
  Volume2,
  VolumeX,
  RotateCw,
  Download,
  X,
} from "lucide-react";

export interface OrderFilterState {
  search: string;
  outletId: string;
  source: string;
  dateRange: "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL";
  paymentStatus: "ALL" | "PAID" | "UNPAID";
}

interface OutletOption {
  id: string;
  name: string;
}

interface OrderFilterBarProps {
  filters: OrderFilterState;
  onFilterChange: (updates: Partial<OrderFilterState>) => void;
  onResetFilters: () => void;
  outlets: OutletOption[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExportCsv: () => void;
  totalFilteredCount: number;
}

export function OrderFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  outlets,
  soundEnabled,
  onToggleSound,
  onRefresh,
  isRefreshing,
  onExportCsv,
  totalFilteredCount,
}: OrderFilterBarProps) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.outletId !== "ALL" ||
    filters.source !== "ALL" ||
    filters.dateRange !== "TODAY" ||
    filters.paymentStatus !== "ALL";

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
      {/* Left: Search & Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Order #, Customer, Phone..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16845B] focus:border-[#16845B] transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Outlet Selector */}
        {outlets.length > 1 && (
          <div className="relative flex items-center">
            <Building2 className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filters.outletId}
              onChange={(e) => onFilterChange({ outletId: e.target.value })}
              className="pl-7 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16845B] focus:border-[#16845B] cursor-pointer appearance-none"
            >
              <option value="ALL">All Outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Source / Channel Filter */}
        <div className="relative flex items-center">
          <Filter className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <select
            value={filters.source}
            onChange={(e) => onFilterChange({ source: e.target.value })}
            className="pl-7 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16845B] focus:border-[#16845B] cursor-pointer appearance-none"
          >
            <option value="ALL">All Channels</option>
            <option value="POS">POS Terminal</option>
            <option value="DINE_IN">Dine-In</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Direct Delivery</option>
            <option value="QR">QR Table Ordering</option>
            <option value="ONLINE">Website</option>
            <option value="SWIGGY">Swiggy</option>
            <option value="ZOMATO">Zomato</option>
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="relative flex items-center">
          <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <select
            value={filters.dateRange}
            onChange={(e) => onFilterChange({ dateRange: e.target.value as any })}
            className="pl-7 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16845B] focus:border-[#16845B] cursor-pointer appearance-none"
          >
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="ALL">All Time</option>
          </select>
        </div>

        {/* Payment Status Filter */}
        <select
          value={filters.paymentStatus}
          onChange={(e) => onFilterChange({ paymentStatus: e.target.value as any })}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16845B] focus:border-[#16845B] cursor-pointer appearance-none"
        >
          <option value="ALL">All Payments</option>
          <option value="PAID">Paid Only</option>
          <option value="UNPAID">Unpaid Only</option>
        </select>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Right: Sound Alert Toggle, Refresh & Export Buttons */}
      <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">
          {totalFilteredCount} {totalFilteredCount === 1 ? "order" : "orders"}
        </span>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? "Order chime enabled" : "Order chime muted"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
            soundEnabled
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-slate-100 border-slate-200 text-slate-500"
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-[#16845B]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden md:inline">{soundEnabled ? "Sound ON" : "Muted"}</span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh orders list"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#16845B]" : ""}`} />
        </button>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExportCsv}
          title="Export orders to CSV"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </div>
  );
}
