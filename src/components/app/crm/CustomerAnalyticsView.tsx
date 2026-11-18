"use client";

import React from "react";
import {
  TrendingUp,
  Users,
  Award,
  Crown,
  Flame,
  Clock,
  MapPin,
  ArrowUpRight,
  PieChart,
} from "lucide-react";

interface CustomerAnalyticsViewProps {
  customers: any[];
  metrics: {
    totalCustomers: number;
    totalRevenuePaise: number;
    averageOrderValuePaise: number;
    repeatCustomerRate: number;
    repeatCustomersCount: number;
  };
}

export function CustomerAnalyticsView({ customers, metrics }: CustomerAnalyticsViewProps) {
  const totalCust = metrics.totalCustomers || 1;
  const avgCLV = Math.round(metrics.totalRevenuePaise / totalCust / 100);

  // Segment distribution
  const segments = {
    VIP: customers.filter((c) => c.segment === "VIP").length,
    REGULAR: customers.filter((c) => c.segment === "REGULAR").length,
    NEW: customers.filter((c) => c.segment === "NEW").length,
    AT_RISK: customers.filter((c) => c.segment === "AT_RISK").length,
    CHURNED: customers.filter((c) => c.segment === "CHURNED").length,
  };

  // Top spenders leaderboard (top 10)
  const topSpenders = [...customers]
    .sort((a, b) => (b.totalSpentPaise || 0) - (a.totalSpentPaise || 0))
    .slice(0, 10);

  // Top frequent diners (top 10)
  const mostFrequent = [...customers]
    .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-900 uppercase">Customer Lifetime Value (CLV)</div>
          <div className="text-2xl font-black text-indigo-950 mt-1">₹{avgCLV.toLocaleString()}</div>
          <p className="text-[11px] text-indigo-700 mt-0.5">Average spend per unique diner</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-900 uppercase">Repeat Diner Rate</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">{metrics.repeatCustomerRate}%</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            {metrics.repeatCustomersCount} multi-visit customers
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-900 uppercase">At-Risk & Churned</div>
          <div className="text-2xl font-black text-amber-950 mt-1">
            {Math.round(((segments.AT_RISK + segments.CHURNED) / totalCust) * 100)}%
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">
            {segments.AT_RISK} at risk • {segments.CHURNED} churned
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Average Order Value</div>
          <div className="text-2xl font-black text-[#172B25] mt-1">
            ₹{Math.round(metrics.averageOrderValuePaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#718078] mt-0.5">Across all billed orders</p>
        </div>
      </div>

      {/* Customer Segmentation Cohort Breakdown */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
          <PieChart className="h-4 w-4 text-[#16845B]" /> Diner Lifecycle Segmentation Cohorts
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
            <div className="text-[10px] font-black uppercase text-purple-900">VIP Diners</div>
            <div className="text-xl font-black text-purple-950 mt-1">{segments.VIP}</div>
            <div className="text-[10px] text-purple-700">
              {Math.round((segments.VIP / totalCust) * 100)}% of total
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-[10px] font-black uppercase text-emerald-900">Regulars</div>
            <div className="text-xl font-black text-emerald-950 mt-1">{segments.REGULAR}</div>
            <div className="text-[10px] text-emerald-700">
              {Math.round((segments.REGULAR / totalCust) * 100)}% of total
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <div className="text-[10px] font-black uppercase text-blue-900">New Diners</div>
            <div className="text-xl font-black text-blue-950 mt-1">{segments.NEW}</div>
            <div className="text-[10px] text-blue-700">
              {Math.round((segments.NEW / totalCust) * 100)}% of total
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-[10px] font-black uppercase text-amber-900">At Risk (&gt;45d)</div>
            <div className="text-xl font-black text-amber-950 mt-1">{segments.AT_RISK}</div>
            <div className="text-[10px] text-amber-700">
              {Math.round((segments.AT_RISK / totalCust) * 100)}% of total
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <div className="text-[10px] font-black uppercase text-rose-900">Churned (&gt;90d)</div>
            <div className="text-xl font-black text-rose-950 mt-1">{segments.CHURNED}</div>
            <div className="text-[10px] text-rose-700">
              {Math.round((segments.CHURNED / totalCust) * 100)}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Spenders */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
          <div className="border-b border-[#E5EBE7] px-5 py-3.5 bg-[#F8FAF9] flex items-center justify-between">
            <h4 className="text-xs font-black text-[#172B25] flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" /> Top Spending Diners
            </h4>
            <span className="text-[10px] text-[#718078] font-bold">Lifetime Revenue</span>
          </div>

          <div className="divide-y divide-[#E5EBE7]">
            {topSpenders.slice(0, 7).map((c, idx) => (
              <div key={c.id} className="p-3 px-5 flex items-center justify-between text-xs hover:bg-[#F8FAF9]/50 transition">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                      idx === 0
                        ? "bg-amber-400 text-amber-950 font-black"
                        : idx === 1
                        ? "bg-slate-300 text-slate-900"
                        : idx === 2
                        ? "bg-amber-700/30 text-amber-950"
                        : "bg-gray-100 text-[#718078]"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-[#172B25]">{c.name}</div>
                    <div className="text-[10px] text-[#718078]">{c.phone} • {c.visitCount} visits</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-[#172B25]">
                    ₹{Math.round((c.totalSpentPaise || 0) / 100).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-amber-700 font-bold">
                    {c.loyaltyPoints} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Frequent Visitors */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
          <div className="border-b border-[#E5EBE7] px-5 py-3.5 bg-[#F8FAF9] flex items-center justify-between">
            <h4 className="text-xs font-black text-[#172B25] flex items-center gap-2">
              <Flame className="h-4 w-4 text-emerald-600" /> Most Frequent Diners
            </h4>
            <span className="text-[10px] text-[#718078] font-bold">Total Visits</span>
          </div>

          <div className="divide-y divide-[#E5EBE7]">
            {mostFrequent.slice(0, 7).map((c, idx) => (
              <div key={c.id} className="p-3 px-5 flex items-center justify-between text-xs hover:bg-[#F8FAF9]/50 transition">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                      idx === 0
                        ? "bg-emerald-400 text-emerald-950"
                        : idx === 1
                        ? "bg-teal-300 text-teal-950"
                        : "bg-gray-100 text-[#718078]"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-[#172B25]">{c.name}</div>
                    <div className="text-[10px] text-[#718078]">{c.phone} • {c.tier?.name}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-emerald-800">{c.visitCount} visits</div>
                  <div className="text-[10px] text-[#718078]">
                    ₹{Math.round((c.totalSpentPaise || 0) / 100).toLocaleString()} total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
