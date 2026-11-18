"use client";

import React from "react";
import { 
  X, 
  TrendingUp, 
  Users, 
  Clock, 
  Utensils, 
  Percent, 
  CheckCircle2, 
  Sparkles 
} from "lucide-react";
import { formatINR } from "@/lib/money";

interface AreaStats {
  tables: number;
  seats: number;
  occupiedSeats: number;
  revenuePaise: number;
}

interface TableAnalyticsModalProps {
  tables: any[];
  onClose: () => void;
}

export function TableAnalyticsModal({
  tables,
  onClose,
}: TableAnalyticsModalProps) {
  const totalTables = tables.length;
  const totalSeats = tables.reduce((s, t) => s + (t.capacity || 4), 0);
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED" || t.status === "BILLING").length;
  const occupiedSeats = tables
    .filter((t) => t.status === "OCCUPIED" || t.status === "BILLING" || t.status === "BILLED")
    .reduce((s, t) => s + (t.capacity || 4), 0);

  const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  const totalRevenuePaise = tables.reduce((s, t) => s + (t.orderTotalPaise || 0), 0);

  // Group by Area
  const areaBreakdown: Record<string, AreaStats> = tables.reduce((acc: Record<string, AreaStats>, t) => {
    const area = t.area || "Main Hall";
    if (!acc[area]) {
      acc[area] = { tables: 0, seats: 0, occupiedSeats: 0, revenuePaise: 0 };
    }
    const cap = t.capacity || 4;
    acc[area].tables += 1;
    acc[area].seats += cap;
    if (t.status === "OCCUPIED" || t.status === "BILLING" || t.status === "BILLED") {
      acc[area].occupiedSeats += cap;
    }
    acc[area].revenuePaise += t.orderTotalPaise || 0;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">Table Turnover & Floor Analytics</h3>
              <p className="text-xs text-[#718078]">Real-time dining floor metrics & occupancy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-[#718078] hover:text-[#172B25] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-2xl border border-[#E5EBE7] text-center">
              <span className="text-[10px] font-bold uppercase text-[#718078]">Occupancy</span>
              <div className="text-2xl font-black text-[#172B25] mt-1">{occupancyRate}%</div>
              <span className="text-[11px] text-[#718078]">
                {occupiedSeats} / {totalSeats} seats
              </span>
            </div>

            <div className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Active Sales</span>
              <div className="text-xl font-black text-[#16845B] mt-1 truncate">
                {formatINR(totalRevenuePaise)}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">On floor now</span>
            </div>

            <div className="p-3 bg-blue-50/40 rounded-2xl border border-blue-100 text-center">
              <span className="text-[10px] font-bold uppercase text-blue-800">Occupied Tables</span>
              <div className="text-2xl font-black text-blue-700 mt-1">{occupiedTables}</div>
              <span className="text-[11px] text-blue-600 font-medium">Of {totalTables} tables</span>
            </div>
          </div>

          {/* Area Performance Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#718078]">
              Dining Area Performance
            </h4>

            <div className="space-y-2">
              {(Object.entries(areaBreakdown) as [string, AreaStats][]).map(([area, stats]) => {
                const areaPct = stats.seats > 0 ? Math.round((stats.occupiedSeats / stats.seats) * 100) : 0;

                return (
                  <div
                    key={area}
                    className="p-3 bg-white rounded-xl border border-[#E5EBE7] shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#172B25]">{area}</span>
                      <span className="font-bold text-[#16845B]">{formatINR(stats.revenuePaise)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#718078]">
                      <span>
                        {stats.tables} tables • {stats.occupiedSeats}/{stats.seats} seats
                      </span>
                      <span className="font-bold text-[#172B25]">{areaPct}% utilized</span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#16845B] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(areaPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-[#E5EBE7] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#172B25] hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
