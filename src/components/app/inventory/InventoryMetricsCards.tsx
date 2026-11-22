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
  Store,
  Clock,
  Layers
} from "lucide-react";

interface InventoryMetricsCardsProps {
  metrics: {
    totalItems: number;
    totalAvailableStock?: number;
    totalStockValuePaise: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringCount?: number;
    pendingPurchaseOrders: number;
    totalPurchasesCount?: number;
    totalPurchasesValuePaise?: number;
    totalBulkSalesCount?: number;
    totalBulkSalesValuePaise?: number;
    inventoryWastagePaise?: number;
    todayConsumptionPaise: number;
    todayWastagePaise: number;
  };
}

export function InventoryMetricsCards({ metrics }: InventoryMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {/* Total Items */}
      <div className="bg-white rounded-2xl p-3 border border-[#E5EBE7] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
          <span>Total Items</span>
          <Boxes className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-[#172B25]">{metrics.totalItems}</span>
          <span className="text-[10px] text-[#718078] font-medium">Catalog</span>
        </div>
      </div>

      {/* Total Asset Valuation */}
      <div className="bg-white rounded-2xl p-3 border border-emerald-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
          <span>Valuation</span>
          <TrendingUp className="h-4 w-4 text-[#16845B]" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-base font-black text-[#16845B] truncate">
            {formatINR(metrics.totalStockValuePaise)}
          </span>
          <span className="text-[9px] text-emerald-700 font-bold uppercase">Assets</span>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white rounded-2xl p-3 border border-amber-100 shadow-xs flex flex-col justify-between bg-amber-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Low Stock
          </span>
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-amber-700">{metrics.lowStockCount}</span>
          <span className="text-[10px] text-amber-600 font-medium">Reorder</span>
        </div>
      </div>

      {/* Out of Stock Alert */}
      <div className="bg-white rounded-2xl p-3 border border-red-100 shadow-xs flex flex-col justify-between bg-red-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-red-800">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Stockout
          </span>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-red-700">{metrics.outOfStockCount}</span>
          <span className="text-[10px] text-red-600 font-medium">Zero Stock</span>
        </div>
      </div>

      {/* Expiring Soon */}
      <div className="bg-white rounded-2xl p-3 border border-purple-100 shadow-xs flex flex-col justify-between bg-purple-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-purple-800">
          <span>Expiring</span>
          <Clock className="h-4 w-4 text-purple-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-purple-700">{metrics.expiringCount || 0}</span>
          <span className="text-[10px] text-purple-600 font-medium">&lt;30 Days</span>
        </div>
      </div>

      {/* Bulk Sales */}
      <div className="bg-white rounded-2xl p-3 border border-orange-100 shadow-xs flex flex-col justify-between bg-orange-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-orange-800">
          <span>Bulk Sales</span>
          <Store className="h-4 w-4 text-orange-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-base font-black text-orange-700 truncate">
            {formatINR(metrics.totalBulkSalesValuePaise || 0)}
          </span>
          <span className="text-[9px] text-orange-600 font-bold uppercase">{metrics.totalBulkSalesCount || 0} Orders</span>
        </div>
      </div>

      {/* Total Purchases */}
      <div className="bg-white rounded-2xl p-3 border border-blue-100 shadow-xs flex flex-col justify-between bg-blue-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
          <span>Purchases</span>
          <ShoppingBag className="h-4 w-4 text-blue-600" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-base font-black text-blue-700 truncate">
            {formatINR(metrics.totalPurchasesValuePaise || 0)}
          </span>
          <span className="text-[9px] text-blue-600 font-bold uppercase">{metrics.pendingPurchaseOrders} Inward</span>
        </div>
      </div>

      {/* Wastage */}
      <div className="bg-white rounded-2xl p-3 border border-rose-100 shadow-xs flex flex-col justify-between bg-rose-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
          <span>Wastage</span>
          <Trash2 className="h-4 w-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-base font-black text-rose-600 truncate">
            {formatINR(metrics.inventoryWastagePaise || metrics.todayWastagePaise)}
          </span>
          <span className="text-[9px] text-rose-600 font-bold uppercase">Loss</span>
        </div>
      </div>
    </div>
  );
}
