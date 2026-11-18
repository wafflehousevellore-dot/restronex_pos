"use client";

import React, { useState } from "react";
import {
  UtensilsCrossed,
  Sparkles,
  PieChart,
  Layers,
  Search,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface ProductAnalyticsTabProps {
  data: EnterpriseReportingPayload;
}

export function ProductAnalyticsTab({ data }: ProductAnalyticsTabProps) {
  const pa = data.productAnalytics;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filteredProducts = pa.topProducts.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* 1. Category Revenue Share Breakdown */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
            <PieChart className="h-4 w-4 text-[#16845B]" /> Menu Category Contribution
          </h3>
          <span className="text-[11px] text-[#718078] font-bold">
            {pa.categories.length} Active Categories
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
          {pa.categories.map((c) => (
            <div key={c.name} className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-1">
              <div className="text-[10px] font-bold uppercase text-[#718078] truncate">{c.name}</div>
              <div className="text-sm font-black text-[#172B25]">
                ₹{Math.round(c.revenuePaise / 100).toLocaleString()}
              </div>
              <div className="text-[10px] font-bold text-[#16845B]">
                {c.sharePct}% share • {c.quantity} sold
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Top-Selling Products Intelligence Leaderboard */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[#16845B]" />
              Product Revenue & Gross Margin Leaderboard ({filteredProducts.length})
            </h3>
            <p className="text-xs text-[#718078]">
              Aggregated from immutable historical order item snapshots
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter products..."
              className="h-8 text-xs bg-white border-[#E5EBE7] rounded-xl w-44"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 text-xs bg-white border border-[#E5EBE7] rounded-xl px-2.5 font-bold text-[#172B25] focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              {pa.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[10px] font-bold uppercase text-[#718078]">
              <tr>
                <th className="py-2.5 px-4">Rank & Item Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                <th className="py-2.5 px-3 text-right">Revenue Share</th>
                <th className="py-2.5 px-3 text-right">Est. Unit Food Cost</th>
                <th className="py-2.5 px-4 text-right">Gross Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#718078]">
                    No items match the search query.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-bold flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-[#172B25]">
                        #{idx + 1}
                      </span>
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#718078] font-medium">{p.category}</td>
                    <td className="py-3 px-3 text-center font-bold">{p.quantity}</td>
                    <td className="py-3 px-3 text-right font-black">
                      ₹{Math.round(p.revenuePaise / 100).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#16845B]">
                      {p.sharePct}%
                    </td>
                    <td className="py-3 px-3 text-right text-[#718078]">
                      {p.estimatedCogsPaise > 0
                        ? `₹${Math.round(p.estimatedCogsPaise / p.quantity / 100)}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-black">
                      {p.grossMarginPct !== null ? (
                        <span className={p.grossMarginPct >= 65 ? "text-emerald-700" : "text-amber-700"}>
                          {p.grossMarginPct}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#718078] font-normal italic">
                          No BOM Recipe
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Least Selling Products & Modifier Addon Revenue */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Least-Selling Products */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25]">
              Least-Selling Menu Items (Low Velocity)
            </h3>
            <span className="text-[10px] text-[#718078] font-bold">Candidates for Review</span>
          </div>

          <div className="divide-y divide-[#E5EBE7]">
            {pa.leastSellingProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#172B25]">{p.name}</div>
                  <div className="text-[10px] text-[#718078]">{p.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-800">{p.quantity} sold</div>
                  <div className="text-[10px] text-[#718078]">
                    ₹{Math.round(p.revenuePaise / 100).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Addons & Customization Revenue */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[#16845B]" /> Modifiers & Add-on Revenue
            </h3>
            <span className="text-xs font-black text-[#16845B]">
              Total: ₹{Math.round(pa.addonRevenuePaise / 100).toLocaleString()}
            </span>
          </div>

          <div className="divide-y divide-[#E5EBE7] max-h-[220px] overflow-y-auto scrollbar-thin">
            {pa.addonItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#718078]">
                No modifiers sold in this period.
              </div>
            ) : (
              pa.addonItems.map((a, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#172B25]">{a.optionName}</div>
                    <div className="text-[10px] text-[#718078]">{a.groupName} • {a.quantity} added</div>
                  </div>
                  <div className="font-black text-[#16845B]">
                    ₹{Math.round(a.revenuePaise / 100).toLocaleString()}
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
