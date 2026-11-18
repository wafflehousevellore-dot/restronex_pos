"use client";

import React, { useState, useMemo } from "react";
import { formatINR } from "@/lib/money";
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  ShoppingBag, 
  RotateCcw, 
  SlidersHorizontal, 
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";

interface InventoryReportsViewProps {
  movements: any[];
  items: any[];
}

export function InventoryReportsView({ movements, items }: InventoryReportsViewProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Map item names by id
  const itemMap = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((it) => map.set(it.id, it));
    return map;
  }, [items]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const item = itemMap.get(m.inventoryItemId);
      const itemName = item?.name || "";

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = itemName.toLowerCase().includes(q);
        const matchRef = (m.reference || "").toLowerCase().includes(q);
        if (!matchName && !matchRef) return false;
      }

      if (typeFilter !== "ALL") {
        if (typeFilter === "WASTE" && m.type !== "WASTE" && m.type !== "DAMAGE" && m.type !== "EXPIRY") {
          return false;
        } else if (typeFilter !== "WASTE" && m.type !== typeFilter) {
          return false;
        }
      }

      return true;
    });
  }, [movements, itemMap, search, typeFilter]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Timestamp", "Item Name", "Type", "Quantity", "Unit", "Reference", "Outlet"];
    const rows = filteredMovements.map((m) => {
      const it = itemMap.get(m.inventoryItemId);
      return [
        new Date(m.createdAt).toLocaleString(),
        `"${it?.name || "Item"}"`,
        m.type,
        m.quantity,
        it?.unit || "",
        `"${(m.reference || "").replace(/"/g, '""')}"`,
        `"${m.outlet?.name || "Main"}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_audit_movements_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-xs">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "All Movements" },
            { id: "SALE_CONSUMPTION", label: "Sale Deductions" },
            { id: "PURCHASE", label: "Inward Purchases" },
            { id: "WASTE", label: "Wastage / Spoilage" },
            { id: "RETURN", label: "Cancelled Returns" },
            { id: "AUDIT_ADJUSTMENT", label: "Audit Corrections" },
            { id: "TRANSFER_OUT", label: "Transfers" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setTypeFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === st.id
                  ? "bg-[#172B25] text-white shadow-xs"
                  : "bg-gray-50 text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or item..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] placeholder-[#718078] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5EBE7] hover:border-gray-300 rounded-xl text-xs font-bold text-[#172B25] shadow-2xs transition cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#16845B]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Movements Audit Log */}
      {filteredMovements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <History className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Movements Logged</h3>
          <p className="text-xs text-[#718078] mt-1">
            No stock movements match your criteria. Stock deductions and receipts will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Ingredient Material</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity Change</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4 text-right">Branch Outlet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {filteredMovements.map((m) => {
                  const it = itemMap.get(m.inventoryItemId);
                  const isPositive = m.quantity > 0;
                  const absQty = Math.abs(m.quantity);

                  let badgeColor = "bg-gray-100 text-gray-800";
                  if (m.type === "SALE_CONSUMPTION") badgeColor = "bg-blue-100 text-blue-800";
                  else if (m.type === "PURCHASE" || m.type === "OPENING_STOCK") badgeColor = "bg-emerald-100 text-emerald-800";
                  else if (m.type === "WASTE" || m.type === "DAMAGE" || m.type === "EXPIRY") badgeColor = "bg-rose-100 text-rose-800";
                  else if (m.type === "RETURN") badgeColor = "bg-purple-100 text-purple-800";

                  return (
                    <tr key={m.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4 text-[#718078]">
                        <div className="font-semibold text-[#172B25]">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[11px]">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-extrabold text-[#172B25] text-sm">
                          {it?.name || "Raw Material"}
                        </div>
                        <div className="text-[11px] text-[#718078]">Unit: {it?.unit || "KG"}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badgeColor}`}>
                          {m.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-black text-sm ${
                            isPositive ? "text-[#16845B]" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? `+${absQty}` : `-${absQty}`} {it?.unit || ""}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="text-xs text-[#172B25] font-semibold truncate">
                          {m.reference || "Operational inventory update"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-[#718078]">
                          {m.outlet?.name || "Main Outlet"}
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
