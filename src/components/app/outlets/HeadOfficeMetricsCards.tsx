"use client";

import React from "react";
import { formatINR } from "@/lib/money";
import { 
  Building2, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Layers 
} from "lucide-react";

interface HeadOfficeMetricsCardsProps {
  analytics: {
    totalOutlets: number;
    activeOutlets: number;
    inactiveOutlets: number;
    totalRevenuePaise: number;
    totalOrders: number;
    averageOrderValuePaise: number;
    bestPerformingOutlet: { name: string; revenuePaise: number } | null;
    lowestPerformingOutlet: { name: string; revenuePaise: number } | null;
    maxOutlets: number;
    planName: string;
  };
}

export function HeadOfficeMetricsCards({ analytics }: HeadOfficeMetricsCardsProps) {
  const {
    totalOutlets,
    activeOutlets,
    inactiveOutlets,
    totalRevenuePaise,
    totalOrders,
    averageOrderValuePaise,
    bestPerformingOutlet,
    maxOutlets,
    planName,
  } = analytics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Outlets & Plan Limit */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Chain Outlets</span>
          <Building2 className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#172B25]">{activeOutlets}</span>
            <span className="text-xs text-[#718078] font-bold">
              / {maxOutlets} allowed
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                activeOutlets >= maxOutlets ? "bg-amber-500" : "bg-[#16845B]"
              }`}
              style={{ width: `${Math.min(100, (activeOutlets / maxOutlets) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chain Gross Sales */}
      <div className="col-span-2 md:col-span-1 lg:col-span-1 bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
          <span>Chain Revenue</span>
          <TrendingUp className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-[#16845B] truncate">
            {formatINR(totalRevenuePaise)}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold uppercase">Total</span>
        </div>
      </div>

      {/* Total Orders */}
      <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs flex flex-col justify-between bg-blue-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
          <span>Total Orders</span>
          <ShoppingBag className="h-4 w-4 text-blue-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-blue-700">{totalOrders}</span>
          <span className="text-xs text-blue-600 font-medium">Chain Orders</span>
        </div>
      </div>

      {/* Average Order Value (AOV) */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Chain AOV</span>
          <Layers className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-[#172B25] truncate">
            {formatINR(averageOrderValuePaise)}
          </span>
          <span className="text-[11px] text-[#718078] font-medium">Per Order</span>
        </div>
      </div>

      {/* Top Performing Outlet */}
      <div className="bg-white rounded-2xl p-3.5 border border-amber-100 shadow-xs flex flex-col justify-between bg-amber-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
          <span>Top Branch</span>
          <Award className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2">
          <div className="text-sm font-black text-amber-900 truncate">
            {bestPerformingOutlet ? bestPerformingOutlet.name : "N/A"}
          </div>
          <div className="text-xs font-extrabold text-amber-700 mt-0.5">
            {bestPerformingOutlet ? formatINR(bestPerformingOutlet.revenuePaise) : "₹0"}
          </div>
        </div>
      </div>

      {/* Subscription Tier */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Plan Tier</span>
          <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-lg font-black text-[#172B25] uppercase tracking-wide">
            {planName}
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
