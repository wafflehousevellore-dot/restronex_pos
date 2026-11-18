"use client";

import React from "react";
import {
  Package,
  AlertTriangle,
  Boxes,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface InventoryAnalyticsTabProps {
  data: EnterpriseReportingPayload;
}

export function InventoryAnalyticsTab({ data }: InventoryAnalyticsTabProps) {
  const ia = data.inventoryAnalytics;

  return (
    <div className="space-y-6">
      {/* 1. Inventory KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-900 uppercase">Total Inventory Valuation</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">
            ₹{Math.round(ia.totalValuationPaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">{ia.totalItemsCount} raw ingredient items</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-900 uppercase">Low Stock Warnings</div>
          <div className="text-2xl font-black text-amber-950 mt-1">{ia.lowStockCount}</div>
          <p className="text-[11px] text-amber-700 mt-0.5">Below reorder threshold</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-rose-900 uppercase">Out of Stock Items</div>
          <div className="text-2xl font-black text-rose-950 mt-1">{ia.outOfStockCount}</div>
          <p className="text-[11px] text-rose-700 mt-0.5">Zero stock on hand</p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Procurement Spend</div>
          <div className="text-2xl font-black text-[#172B25] mt-1">
            ₹{Math.round(ia.purchasesTotalPaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#718078] mt-0.5">Across purchase orders</p>
        </div>
      </div>

      {/* 2. Low Stock Alerts & Reorder Table */}
      <div className="rounded-2xl border border-amber-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-amber-100 px-6 py-4 bg-amber-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-black text-amber-950">
              Low Stock & Reorder Requirement Alerts ({ia.lowStockAlerts.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-amber-800">
            Immediate purchase requisition recommended
          </span>
        </div>

        <div className="overflow-x-auto max-h-[300px] scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-[10px] font-bold uppercase text-[#718078] sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Ingredient Item</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3 text-right">Current Stock</th>
                <th className="py-2.5 px-3 text-right">Threshold</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {ia.lowStockAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#718078]">
                    All stock levels healthy. No items below threshold.
                  </td>
                </tr>
              ) : (
                ia.lowStockAlerts.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-2.5 px-4 font-bold">{item.name}</td>
                    <td className="py-2.5 px-3 text-[11px] text-[#718078]">{item.unit}</td>
                    <td className="py-2.5 px-3 text-right font-black text-amber-900">
                      {item.currentStock}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#718078]">
                      {item.threshold}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#718078]">
                      ₹{(item.costPerUnitPaise / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          item.currentStock <= 0
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {item.currentStock <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Movements & Supplier Procurement Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Stock Movements */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <Boxes className="h-4 w-4 text-[#16845B]" /> Stock Movements Ledger
            </h3>
          </div>

          <div className="divide-y divide-[#E5EBE7]">
            {ia.stockMovements.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#718078]">
                No stock movements logged in this period.
              </div>
            ) : (
              ia.stockMovements.map((sm) => (
                <div key={sm.type} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#172B25]">{sm.type}</div>
                    <div className="text-[10px] text-[#718078]">{sm.count} movement transactions</div>
                  </div>
                  <div className="font-black text-[#172B25]">
                    {sm.totalQty} units
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Supplier Breakdown */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-[#16845B]" /> Supplier Purchase Analysis
            </h3>
          </div>

          <div className="divide-y divide-[#E5EBE7]">
            {ia.suppliersBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#718078]">
                No purchase orders raised in this period.
              </div>
            ) : (
              ia.suppliersBreakdown.map((s) => (
                <div key={s.supplierName} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#172B25]">{s.supplierName}</div>
                    <div className="text-[10px] text-[#718078]">{s.poCount} purchase orders</div>
                  </div>
                  <div className="font-black text-[#172B25]">
                    ₹{Math.round(s.totalPaise / 100).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
