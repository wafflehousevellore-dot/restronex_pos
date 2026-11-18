"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Clock, 
  Users, 
  Utensils, 
  Edit2, 
  ExternalLink, 
  Check, 
  Power, 
  Search, 
  ChevronRight,
  TrendingUp,
  ShoppingBag
} from "lucide-react";

interface OutletDirectoryGridProps {
  outlets: any[];
  onSelectOutlet: (outletId: string) => void;
  onEditOutlet: (outlet: any) => void;
  onToggleStatus: (outletId: string, currentStatus: string) => Promise<void>;
  onDeleteOutlet: (outletId: string) => Promise<void>;
}

export function OutletDirectoryGrid({
  outlets,
  onSelectOutlet,
  onEditOutlet,
  onToggleStatus,
  onDeleteOutlet,
}: OutletDirectoryGridProps) {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("ALL");

  const cities = Array.from(new Set(outlets.map((o) => o.city || "Bengaluru")));

  const filteredOutlets = outlets.filter((o) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = o.name.toLowerCase().includes(q);
      const matchCity = (o.city || "").toLowerCase().includes(q);
      const matchAddress = (o.address || "").toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchAddress) return false;
    }
    if (cityFilter !== "ALL" && (o.city || "Bengaluru") !== cityFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & City Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-xs">
        {/* City Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setCityFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              cityFilter === "ALL"
                ? "bg-[#172B25] text-white shadow-xs"
                : "bg-gray-50 text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
            }`}
          >
            All Locations ({outlets.length})
          </button>
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCityFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                cityFilter === c
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "bg-gray-50 text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branch name, address, or city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] placeholder-[#718078] focus:outline-none focus:border-[#16845B]"
          />
        </div>
      </div>

      {/* Grid of Outlets */}
      {filteredOutlets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <Building2 className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Outlets Found</h3>
          <p className="text-xs text-[#718078] mt-1">
            No branch locations match your search or filter. Click "+ Add New Outlet" to expand your chain.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutlets.map((outlet) => {
            const isActive = outlet.status === "ACTIVE";
            const serviceList = (outlet.serviceModes || "DINE_IN,TAKEAWAY,DELIVERY").split(",");

            return (
              <div
                key={outlet.id}
                className={`bg-white rounded-3xl p-5 border shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  isActive ? "border-[#E5EBE7] hover:border-[#16845B]/60" : "border-gray-200 bg-gray-50/50 opacity-75"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-[#172B25] tracking-tight">
                          {outlet.name}
                        </h3>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {outlet.status}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#718078] mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[#16845B]" />
                        <span>{outlet.city || "Bengaluru"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditOutlet(outlet)}
                        className="p-1.5 hover:bg-gray-100 text-[#718078] hover:text-[#172B25] rounded-xl transition cursor-pointer"
                        title="Edit Branch Settings"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(outlet.id, outlet.status)}
                        className={`p-1.5 rounded-xl transition cursor-pointer ${
                          isActive
                            ? "hover:bg-red-50 text-gray-400 hover:text-red-600"
                            : "hover:bg-emerald-50 text-emerald-600"
                        }`}
                        title={isActive ? "Deactivate Branch" : "Activate Branch"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Address & Hours */}
                  <div className="mt-3 space-y-1 text-xs text-[#718078]">
                    {outlet.address && (
                      <div className="truncate">
                        {outlet.address}
                      </div>
                    )}
                    {outlet.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-[#16845B]" />
                        <span>{outlet.phone}</span>
                      </div>
                    )}
                    {outlet.openingHours && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-[#16845B]" />
                        <span>{outlet.openingHours}</span>
                      </div>
                    )}
                  </div>

                  {/* Service Modes */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {serviceList.map((mode: string) => (
                      <span
                        key={mode}
                        className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md"
                      >
                        {mode.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Performance Metrics */}
                  <div className="mt-4 grid grid-cols-2 gap-2 bg-[#F4F6F5] p-3 rounded-2xl border border-[#E5EBE7]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#718078] flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-[#16845B]" />
                        Revenue
                      </span>
                      <div className="text-sm font-black text-[#16845B] mt-0.5">
                        {formatINR(outlet.revenuePaise || 0)}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#718078] flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3 text-blue-600" />
                        Orders
                      </span>
                      <div className="text-sm font-black text-[#172B25] mt-0.5">
                        {outlet.orderCount || 0}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-[#E5EBE7]/60">
                      <span className="text-[10px] uppercase font-bold text-[#718078]">Tables</span>
                      <div className="text-xs font-black text-[#172B25] mt-0.5">
                        {outlet.tableCount || 0} dining tables
                      </div>
                    </div>

                    <div className="pt-1 border-t border-[#E5EBE7]/60">
                      <span className="text-[10px] uppercase font-bold text-[#718078]">Staff</span>
                      <div className="text-xs font-black text-[#172B25] mt-0.5">
                        {outlet.staffCount || 0} members
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Switch to Branch */}
                <div className="mt-4 pt-3 border-t border-[#E5EBE7]">
                  <button
                    type="button"
                    onClick={() => onSelectOutlet(outlet.id)}
                    className="w-full py-2 bg-[#172B25] hover:bg-black text-white text-xs font-bold rounded-xl transition text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Manage Branch Workspace</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
