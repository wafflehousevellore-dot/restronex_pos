"use client";

import React, { useState, useMemo } from "react";
import { formatINR } from "@/lib/money";
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  UtensilsCrossed,
  Boxes
} from "lucide-react";

interface IngredientsTableProps {
  items: any[];
  onQuickRestock: (item: any) => void;
  onQuickWaste: (item: any) => void;
  onEditItem: (item: any) => void;
  onDeleteItem: (itemId: string) => Promise<void>;
}

export function IngredientsTable({
  items,
  onQuickRestock,
  onQuickWaste,
  onEditItem,
  onDeleteItem,
}: IngredientsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HEALTHY" | "LOW" | "OUT">("ALL");

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Search match
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (!it.name.toLowerCase().includes(q) && !(it.unit || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      // Status match
      if (statusFilter === "LOW") return it.isLowStock;
      if (statusFilter === "OUT") return it.isOutOfStock;
      if (statusFilter === "HEALTHY") return !it.isLowStock && !it.isOutOfStock;
      return true;
    });
  }, [items, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "All Items", count: items.length },
            { id: "HEALTHY", label: "Healthy Stock", count: items.filter((i) => !i.isLowStock && !i.isOutOfStock).length },
            { id: "LOW", label: "Low Stock Alert", count: items.filter((i) => i.isLowStock).length, color: "text-amber-700 bg-amber-50" },
            { id: "OUT", label: "Out of Stock", count: items.filter((i) => i.isOutOfStock).length, color: "text-red-700 bg-red-50" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st.id
                  ? "bg-[#172B25] text-white shadow-xs"
                  : "bg-gray-50 text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
              }`}
            >
              <span>{st.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === st.id ? "bg-white/20 text-white" : st.color || "bg-gray-200 text-gray-700"
                }`}
              >
                {st.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search raw material or unit..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] placeholder-[#718078] focus:outline-none focus:border-[#16845B] transition"
          />
        </div>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <Boxes className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Ingredients Found</h3>
          <p className="text-xs text-[#718078] mt-1">
            No stock items match your search or filter. Click &quot;+ New Ingredient&quot; to add raw materials.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Raw Ingredient</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Health Status</th>
                  <th className="py-3 px-4">Reorder Level</th>
                  <th className="py-3 px-4">Cost / Unit</th>
                  <th className="py-3 px-4">Asset Value</th>
                  <th className="py-3 px-4">Recipes</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {filteredItems.map((item) => {
                  const stock = item.currentStock;
                  const threshold = item.lowStockThreshold || 5;
                  const isOut = item.isOutOfStock;
                  const isLow = item.isLowStock;
                  const assetValue = item.stockValuePaise || 0;

                  // Progress percentage against 2x threshold
                  const pct = Math.min(100, Math.round((stock / (threshold * 2)) * 100));

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#172B25] text-sm">{item.name}</div>
                        <div className="text-[11px] text-[#718078] uppercase font-semibold">
                          Unit: {item.unit}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-black text-[#172B25] text-sm">
                            {stock} {item.unit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-[#16845B]"
                            }`}
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Optimal
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#718078]">
                          {threshold} {item.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#172B25]">
                          {formatINR(item.costPerUnitPaise || 0)} / {item.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-[#16845B]">{formatINR(assetValue)}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#718078] bg-gray-100 px-2 py-0.5 rounded-lg text-xs">
                          <UtensilsCrossed className="h-3 w-3 text-[#16845B]" />
                          <span>{item.recipesCount || 0} dishes</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Restock */}
                          <button
                            type="button"
                            onClick={() => onQuickRestock(item)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#16845B] rounded-lg transition cursor-pointer"
                            title="Quick Inward / Restock"
                          >
                            <Plus className="h-4 w-4" />
                          </button>

                          {/* Quick Spoilage */}
                          <button
                            type="button"
                            onClick={() => onQuickWaste(item)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            title="Record Spoilage / Wastage"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          {/* Edit Item */}
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="p-1.5 hover:bg-gray-100 text-[#718078] hover:text-[#172B25] rounded-lg transition cursor-pointer"
                            title="Edit Ingredient"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                            title="Delete Ingredient"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
