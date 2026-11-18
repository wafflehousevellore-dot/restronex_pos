"use client";

import React from "react";
import { formatINR } from "@/lib/money";
import { 
  Boxes, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  ShoppingBag, 
  Trash2, 
  CheckCircle2, 
  DollarSign 
} from "lucide-react";

interface InventoryMetricsCardsProps {
  metrics: {
    totalItems: number;
    totalStockValuePaise: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingPurchaseOrders: number;
    todayConsumptionPaise: number;
    todayWastagePaise: number;
  };
}

export function InventoryMetricsCards({ metrics }: InventoryMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* Total Items */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Total Items</span>
          <Boxes className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-[#172B25]">{metrics.totalItems}</span>
          <span className="text-[11px] text-[#718078] font-medium">Raw Materials</span>
        </div>
      </div>

      {/* Total Asset Valuation */}
      <div className="col-span-2 md:col-span-1 lg:col-span-1 bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
          <span>Stock Valuation</span>
          <TrendingUp className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-[#16845B] truncate">
            {formatINR(metrics.totalStockValuePaise)}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold uppercase">Assets</span>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white rounded-2xl p-3.5 border border-amber-100 shadow-xs flex flex-col justify-between bg-amber-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Low Stock
          </span>
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-amber-700">{metrics.lowStockCount}</span>
          <span className="text-xs text-amber-600 font-medium">Reorder</span>
        </div>
      </div>

      {/* Out of Stock Alert */}
      <div className="bg-white rounded-2xl p-3.5 border border-red-100 shadow-xs flex flex-col justify-between bg-red-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-red-800">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Out of Stock
          </span>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-red-700">{metrics.outOfStockCount}</span>
          <span className="text-xs text-red-600 font-medium">Critical</span>
        </div>
      </div>

      {/* Pending POs */}
      <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs flex flex-col justify-between bg-blue-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
          <span>Pending POs</span>
          <ShoppingBag className="h-4 w-4 text-blue-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-blue-700">{metrics.pendingPurchaseOrders}</span>
          <span className="text-xs text-blue-600 font-medium">In Transit</span>
        </div>
      </div>

      {/* Today's Consumption */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Today Consumed</span>
          <TrendingDown className="h-4 w-4 text-blue-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-[#172B25] truncate">
            {formatINR(metrics.todayConsumptionPaise)}
          </span>
          <span className="text-[10px] text-[#718078] font-semibold uppercase">Sales</span>
        </div>
      </div>

      {/* Today's Wastage */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Today Wastage</span>
          <Trash2 className="h-4 w-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-rose-600 truncate">
            {formatINR(metrics.todayWastagePaise)}
          </span>
          <span className="text-[10px] text-rose-600 font-semibold uppercase">Waste</span>
        </div>
      </div>
    </div>
  );
}
