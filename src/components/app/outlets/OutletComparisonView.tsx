"use client";

import React, { useMemo } from "react";
import { formatINR } from "@/lib/money";
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  ShoppingBag, 
  Users, 
  Utensils, 
  FileSpreadsheet,
  Layers
} from "lucide-react";

interface OutletComparisonViewProps {
  outlets: any[];
  totalRevenuePaise: number;
  totalOrders: number;
}

export function OutletComparisonView({
  outlets,
  totalRevenuePaise,
  totalOrders,
}: OutletComparisonViewProps) {
  // Sort outlets by revenue descending
  const sortedOutlets = useMemo(() => {
    return [...outlets].sort((a, b) => (b.revenuePaise || 0) - (a.revenuePaise || 0));
  }, [outlets]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Rank",
      "Branch Name",
      "City",
      "Status",
      "Revenue (INR)",
      "Revenue Share %",
      "Total Orders",
      "AOV (INR)",
      "Tables",
      "Staff",
    ];

    const rows = sortedOutlets.map((o, idx) => {
      const sharePct = totalRevenuePaise > 0 ? ((o.revenuePaise || 0) / totalRevenuePaise * 100).toFixed(1) : "0.0";
      return [
        idx + 1,
        `"${o.name}"`,
        `"${o.city || "Bengaluru"}"`,
        o.status,
        ((o.revenuePaise || 0) / 100).toFixed(2),
        `${sharePct}%`,
        o.orderCount || 0,
        ((o.aovPaise || 0) / 100).toFixed(2),
        o.tableCount || 0,
        o.staffCount || 0,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `chain_outlet_performance_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Visual Revenue Share Bars */}
      <div className="bg-white p-5 rounded-3xl border border-[#E5EBE7] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#16845B]" />
              <span>Chain Revenue Contribution by Branch</span>
            </h3>
            <p className="text-xs text-[#718078] mt-0.5">
              Live gross revenue split across {outlets.length} locations
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25] transition cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#16845B]" />
            <span>Export Table CSV</span>
          </button>
        </div>

        {/* Stacked segmented bar */}
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
          {sortedOutlets.map((o, idx) => {
            const share = totalRevenuePaise > 0 ? (o.revenuePaise / totalRevenuePaise) * 100 : 0;
            const colors = [
              "bg-[#16845B]",
              "bg-emerald-600",
              "bg-teal-500",
              "bg-blue-600",
              "bg-indigo-500",
              "bg-purple-500",
            ];
            const color = colors[idx % colors.length];

            return (
              <div
                key={o.id}
                className={`${color} h-full transition-all duration-500`}
                style={{ width: `${Math.max(1, share)}%` }}
                title={`${o.name}: ${share.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {sortedOutlets.slice(0, 6).map((o, idx) => {
            const share = totalRevenuePaise > 0 ? ((o.revenuePaise / totalRevenuePaise) * 100).toFixed(1) : "0.0";
            const colors = [
              "bg-[#16845B]",
              "bg-emerald-600",
              "bg-teal-500",
              "bg-blue-600",
              "bg-indigo-500",
              "bg-purple-500",
            ];
            const color = colors[idx % colors.length];

            return (
              <div key={o.id} className="flex items-center gap-1.5 text-xs text-[#718078]">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                <span className="font-semibold text-[#172B25]">{o.name}</span>
                <span className="font-bold text-[#16845B]">({share}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparative Performance Table */}
      <div className="bg-white rounded-3xl border border-[#E5EBE7] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E5EBE7] bg-[#F4F6F5]">
          <h3 className="text-sm font-black text-[#172B25]">
            Branch Benchmark Comparison Matrix
          </h3>
          <p className="text-xs text-[#718078]">
            Side-by-side revenue, order volume, check average and staffing efficiency
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Branch Outlet</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4">Share %</th>
                <th className="py-3 px-4">Total Orders</th>
                <th className="py-3 px-4">AOV</th>
                <th className="py-3 px-4">Tables</th>
                <th className="py-3 px-4 text-right">Staff Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {sortedOutlets.map((o, idx) => {
                const sharePct = totalRevenuePaise > 0 ? ((o.revenuePaise || 0) / totalRevenuePaise * 100).toFixed(1) : "0.0";
                const isTop = idx === 0 && o.revenuePaise > 0;

                return (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-black">
                      {isTop ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-black text-[11px]">
                          <Award className="h-3 w-3 text-amber-600" />
                          #1
                        </span>
                      ) : (
                        <span className="text-gray-500">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#172B25] text-sm">{o.name}</div>
                      <div className="text-[11px] text-[#718078]">{o.city || "Bengaluru"}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          o.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-black text-[#16845B] text-sm">
                        {formatINR(o.revenuePaise || 0)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#172B25]">{sharePct}%</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-[#172B25]">{o.orderCount || 0}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#172B25]">{formatINR(o.aovPaise || 0)}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[#718078] font-semibold">{o.tableCount || 0} tables</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-[#172B25]">{o.staffCount || 0} members</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
