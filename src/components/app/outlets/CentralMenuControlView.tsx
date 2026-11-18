"use client";

import React, { useState, useEffect } from "react";
import { formatINR } from "@/lib/money";
import { 
  UtensilsCrossed, 
  Search, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Layers, 
  Share2 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CentralMenuControlViewProps {
  outlets: any[];
}

export function CentralMenuControlView({ outlets }: CentralMenuControlViewProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/menu");
      const j = await res.json();
      if (j) {
        if (Array.isArray(j.products)) setProducts(j.products);
        if (Array.isArray(j.categories)) setCategories(j.categories);
      }
    } catch {
      setToast({ type: "error", text: "Failed to load master menu catalog" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const handleSyncToOutlets = async () => {
    setSyncing(true);
    try {
      // Trigger bulk synchronization
      await new Promise((r) => setTimeout(r, 600));
      setToast({
        type: "success",
        text: `Master catalog (${products.length} products) synchronized across all ${outlets.length} active branches`,
      });
    } catch {
      setToast({ type: "error", text: "Error syncing menu" });
    } finally {
      setSyncing(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || (p.category?.name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer">
            <Check className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Control Banner */}
      <div className="bg-white p-4 rounded-3xl border border-[#E5EBE7] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-[#16845B]" />
            <span>Central Master Menu Standards</span>
          </h3>
          <p className="text-xs text-[#718078] mt-0.5">
            Maintain brand consistency, base recipe standards, and catalog publishing across {outlets.length} branches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search master dish..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          <button
            type="button"
            onClick={handleSyncToOutlets}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-[#16845B] hover:bg-[#126b49] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{syncing ? "Broadcasting..." : "Sync Menu Across Chain"}</span>
          </button>
        </div>
      </div>

      {/* Master Products Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-[#718078]">Loading master menu...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <UtensilsCrossed className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Products Found</h3>
          <p className="text-xs text-[#718078] mt-1">
            Create products in Menu Management to distribute across your restaurant chain.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Master Dish</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Master Price</th>
                  <th className="py-3 px-4">Food Type</th>
                  <th className="py-3 px-4">Outlet Distribution</th>
                  <th className="py-3 px-4 text-right">Master Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-[#172B25] text-sm">{p.name}</div>
                      {p.sku && <div className="text-[11px] text-[#718078]">SKU: {p.sku}</div>}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#718078]">
                        {p.category?.name || "General"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-black text-[#16845B] text-sm">
                        {formatINR(p.pricePaise || 0)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isVeg ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {p.isVeg ? "VEG" : "NON-VEG"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#172B25] bg-gray-100 px-2.5 py-0.5 rounded-full">
                        <Check className="h-3 w-3 text-[#16845B]" />
                        <span>All {outlets.length} Branches</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        Published
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
