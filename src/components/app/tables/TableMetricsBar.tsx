"use client";

import React from "react";
import { formatINR } from "@/lib/money";
import { 
  Users, 
  Utensils, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  TrendingUp,
  Percent
} from "lucide-react";

interface TableMetricsBarProps {
  tables: any[];
}

export function TableMetricsBar({ tables }: TableMetricsBarProps) {
  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED" || t.status === "BILLING").length;
  const reservedTables = tables.filter((t) => t.status === "RESERVED").length;
  const billedTables = tables.filter((t) => t.status === "BILLED" || t.status === "BILLING").length;
  const cleaningTables = tables.filter((t) => t.status === "CLEANING").length;

  const totalSeats = tables.reduce((sum, t) => sum + (t.capacity || 4), 0);
  const occupiedSeats = tables
    .filter((t) => t.status === "OCCUPIED" || t.status === "BILLING" || t.status === "BILLED")
    .reduce((sum, t) => sum + (t.capacity || 4), 0);

  const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  
  const activeRevenuePaise = tables.reduce((sum, t) => sum + (t.orderTotalPaise || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* Total Tables */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Total Tables</span>
          <Utensils className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-[#172B25]">{totalTables}</span>
          <span className="text-xs text-[#718078] font-medium">{totalSeats} seats</span>
        </div>
      </div>

      {/* Available */}
      <div className="bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-xs flex flex-col justify-between bg-emerald-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Available
          </span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-emerald-700">{availableTables}</span>
          <span className="text-xs text-emerald-600 font-medium">Ready</span>
        </div>
      </div>

      {/* Occupied */}
      <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs flex flex-col justify-between bg-blue-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Occupied
          </span>
          <Users className="h-4 w-4 text-blue-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-blue-700">{occupiedTables}</span>
          <span className="text-xs text-blue-600 font-medium">{occupiedSeats} seated</span>
        </div>
      </div>

      {/* Reserved */}
      <div className="bg-white rounded-2xl p-3.5 border border-purple-100 shadow-xs flex flex-col justify-between bg-purple-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-purple-800">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            Reserved
          </span>
          <Clock className="h-4 w-4 text-purple-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-purple-700">{reservedTables}</span>
          <span className="text-xs text-purple-600 font-medium">Booked</span>
        </div>
      </div>

      {/* Billed / Cleaning */}
      <div className="bg-white rounded-2xl p-3.5 border border-amber-100 shadow-xs flex flex-col justify-between bg-amber-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Billed / Clean
          </span>
          <Sparkles className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-amber-700">{billedTables + cleaningTables}</span>
          <span className="text-xs text-amber-600 font-medium">
            {billedTables} bil / {cleaningTables} cln
          </span>
        </div>
      </div>

      {/* Seating Occupancy % */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Occupancy</span>
          <Percent className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-2xl font-black text-[#172B25]">{occupancyRate}%</span>
          <div className="w-14 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyRate > 80 ? "bg-red-500" : occupancyRate > 50 ? "bg-amber-500" : "bg-[#16845B]"
              }`}
              style={{ width: `${Math.min(occupancyRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Revenue */}
      <div className="col-span-2 md:col-span-1 lg:col-span-1 bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
          <span>Active Sales</span>
          <TrendingUp className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-[#16845B] truncate">
            {formatINR(activeRevenuePaise)}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold uppercase">Live</span>
        </div>
      </div>
    </div>
  );
}
