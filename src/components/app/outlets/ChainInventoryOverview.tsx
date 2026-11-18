"use client";

import React, { useState, useEffect } from "react";
import { formatINR } from "@/lib/money";
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  ArrowRightLeft, 
  TrendingUp, 
  CheckCircle2 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ChainInventoryOverviewProps {
  outlets: any[];
  onOpenTransfer: () => void;
}

export function ChainInventoryOverview({
  outlets,
  onOpenTransfer,
}: ChainInventoryOverviewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadStock() {
      setLoading(true);
      try {
        const res = await apiFetch("/api/inventory");
        const j = await res.json();
        if (j && Array.isArray(j.items)) {
          setItems(j.items);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadStock();
  }, []);

  const totalChainStockValuePaise = items.reduce(
    (sum, it) => sum + (it.stockValuePaise || it.currentStock * it.costPerUnitPaise || 0),
    0
  );

  const lowStockCount = items.filter((it) => it.isLowStock || it.currentStock <= it.lowStockThreshold).length;

  const filteredItems = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return it.name.toLowerCase().includes(q) || (it.unit || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Top Asset Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-[#E5EBE7] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#718078]">Total Chain Inventory Items</span>
            <div className="text-2xl font-black text-[#172B25] mt-1">{items.length}</div>
          </div>
          <Boxes className="h-6 w-6 text-[#16845B]" />
        </div>

        <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-xs bg-emerald-50/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800">Chain Stock Asset Valuation</span>
            <div className="text-2xl font-black text-[#16845B] mt-1 truncate">
              {formatINR(totalChainStockValuePaise)}
            </div>
          </div>
          <TrendingUp className="h-6 w-6 text-[#16845B]" />
        </div>

        <div className="bg-white p-4 rounded-3xl border border-amber-100 shadow-xs bg-amber-50/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-800">Low Stock Across Chain</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{lowStockCount} items</div>
          </div>
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-xs">
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chain ingredient..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] focus:outline-none focus:border-[#16845B]"
          />
        </div>

        <button
          type="button"
          onClick={onOpenTransfer}
          className="flex items-center gap-1.5 bg-[#172B25] hover:bg-black text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
          <span>Inter-branch Transfer</span>
        </button>
      </div>

      {/* Stock Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-[#718078]">Loading chain inventory...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <Boxes className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Raw Materials Found</h3>
          <p className="text-xs text-[#718078] mt-1">
            Raw materials created in Inventory Management will appear here with chain stock balances.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Raw Ingredient</th>
                  <th className="py-3 px-4">Combined Chain Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reorder Threshold</th>
                  <th className="py-3 px-4">Cost / Unit</th>
                  <th className="py-3 px-4 text-right">Total Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {filteredItems.map((item) => {
                  const isLow = item.isLowStock || item.currentStock <= item.lowStockThreshold;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#172B25] text-sm">{item.name}</div>
                        <div className="text-[11px] text-[#718078]">Unit: {item.unit}</div>
                      </td>

                      <td className="py-3.5 px-4 font-black text-[#172B25] text-sm">
                        {item.currentStock} {item.unit}
                      </td>

                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Adequate
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#718078]">
                        {item.lowStockThreshold || 5} {item.unit}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#172B25]">
                        {formatINR(item.costPerUnitPaise || 0)} / {item.unit}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-[#16845B] text-sm">
                          {formatINR(item.stockValuePaise || item.currentStock * (item.costPerUnitPaise || 0))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
