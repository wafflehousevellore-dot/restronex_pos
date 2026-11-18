"use client";

import React from "react";
import {
  Building2,
  Crown,
  TrendingUp,
  MapPin,
  Layers,
} from "lucide-react";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface OutletPerformanceTabProps {
  data: EnterpriseReportingPayload;
}

export function OutletPerformanceTab({ data }: OutletPerformanceTabProps) {
  const op = data.outletPerformance;
  const ex = data.executiveSummary;

  return (
    <div className="space-y-6">
      {/* 1. Chain Consolidated Overview */}
      <div className="rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#16845B]">
            Head Office Multi-Outlet Consolidated Performance
          </span>
          <h2 className="text-xl font-black text-[#172B25] mt-1">
            ₹{Math.round(ex.grossSalesPaise / 100).toLocaleString()}{" "}
            <span className="text-xs text-[#718078] font-normal">Consolidated Chain Revenue</span>
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            Across {op.outlets.length} authorized branch locations • {ex.totalOrders} total orders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-3 border border-[#E5EBE7] text-center shadow-2xs">
            <div className="text-[10px] font-bold uppercase text-[#718078]">Chain AOV</div>
            <div className="text-base font-black text-[#172B25] mt-0.5">
              ₹{Math.round(ex.avgOrderValuePaise / 100).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Outlet Performance Matrix Table */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              Branch & Franchise Revenue Leaderboard ({op.outlets.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-[#718078]">
            Ranked by gross revenue contribution
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[10px] font-bold uppercase text-[#718078]">
              <tr>
                <th className="py-2.5 px-4">Rank & Outlet Name</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3 text-center">Orders Count</th>
                <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                <th className="py-2.5 px-3 text-right">AOV</th>
                <th className="py-2.5 px-3 text-right">Discounts</th>
                <th className="py-2.5 px-3 text-right">Tax (5%)</th>
                <th className="py-2.5 px-4 text-right">Chain Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {op.outlets.map((o) => (
                <tr key={o.id} className="hover:bg-[#F8FAF9] transition">
                  <td className="py-3 px-4 font-bold flex items-center gap-2.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                        o.rank === 1
                          ? "bg-amber-400 text-amber-950"
                          : o.rank === 2
                          ? "bg-slate-300 text-slate-900"
                          : "bg-slate-100 text-[#718078]"
                      }`}
                    >
                      #{o.rank}
                    </span>
                    <span>{o.name}</span>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-[#718078] font-medium">{o.city}</td>
                  <td className="py-3 px-3 text-center font-bold">{o.orders}</td>
                  <td className="py-3 px-3 text-right font-black">
                    ₹{Math.round(o.grossSalesPaise / 100).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-[#172B25]">
                    ₹{Math.round(o.aovPaise / 100).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700">
                    {o.discountPaise > 0 ? `₹${Math.round(o.discountPaise / 100)}` : "—"}
                  </td>
                  <td className="py-3 px-3 text-right text-[#16845B]">
                    ₹{Math.round(o.taxPaise / 100)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-800">
                    {o.sharePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
