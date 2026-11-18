"use client";

import React from "react";
import { 
  Layers, 
  Search, 
  Plus, 
  Map, 
  LayoutGrid, 
  Check, 
  Users, 
  Clock, 
  Sparkles,
  Filter
} from "lucide-react";

interface FloorAreaTabsProps {
  areas: string[];
  selectedArea: string;
  onSelectArea: (area: string) => void;
  statusFilter: string;
  onSelectStatus: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "MAP" | "GRID";
  onViewModeChange: (mode: "MAP" | "GRID") => void;
  onOpenAddTable: () => void;
  areaCounts: Record<string, number>;
}

export function FloorAreaTabs({
  areas,
  selectedArea,
  onSelectArea,
  statusFilter,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenAddTable,
  areaCounts,
}: FloorAreaTabsProps) {
  const statusOptions = [
    { id: "ALL", label: "All Tables" },
    { id: "AVAILABLE", label: "Available", color: "bg-emerald-500" },
    { id: "OCCUPIED", label: "Occupied", color: "bg-blue-500" },
    { id: "BILLED", label: "Billed", color: "bg-amber-500" },
    { id: "RESERVED", label: "Reserved", color: "bg-purple-500" },
    { id: "CLEANING", label: "Cleaning", color: "bg-slate-400" },
  ];

  return (
    <div className="space-y-3">
      {/* Area Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-[#E5EBE7] shadow-xs">
        {/* Horizontal scroll of area pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => onSelectArea("ALL")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedArea === "ALL"
                ? "bg-[#172B25] text-white shadow-xs"
                : "text-[#718078] hover:text-[#172B25] hover:bg-gray-100/70"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Areas</span>
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedArea === "ALL" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {areaCounts["ALL"] || 0}
            </span>
          </button>

          {areas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => onSelectArea(area)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedArea === area
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25] hover:bg-gray-100/70"
              }`}
            >
              <span>{area}</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedArea === area ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {areaCounts[area] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Right side: View mode toggle & Add Table */}
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => onViewModeChange("MAP")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "MAP"
                  ? "bg-white text-[#172B25] shadow-2xs font-extrabold"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              <span>Floor Map</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("GRID")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-white text-[#172B25] shadow-2xs font-extrabold"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {/* New Table button */}
          <button
            type="button"
            onClick={onOpenAddTable}
            className="flex items-center gap-1.5 bg-[#16845B] hover:bg-[#126b49] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {statusOptions.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStatus(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                statusFilter === st.id
                  ? "bg-white border-2 border-[#16845B] text-[#172B25] font-bold shadow-xs"
                  : "bg-white border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:border-gray-300"
              }`}
            >
              {st.color && <span className={`h-2 w-2 rounded-full ${st.color}`} />}
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search table # or waiter..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-[#E5EBE7] text-[#172B25] placeholder-[#718078] focus:outline-none focus:border-[#16845B] transition shadow-xs"
          />
        </div>
      </div>
    </div>
  );
}
