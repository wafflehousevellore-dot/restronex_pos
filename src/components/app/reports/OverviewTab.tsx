"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Receipt,
  ShoppingCart,
  Percent,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  CreditCard,
  Building2,
  Utensils,
} from "lucide-react";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface OverviewTabProps {
  data: EnterpriseReportingPayload;
}

export function OverviewTab({ data }: OverviewTabProps) {
  const ex = data.executiveSummary;
  const isUp = (ex.salesGrowthPct || 0) > 0;
  const isDown = (ex.salesGrowthPct || 0) < 0;

  return (
    <div className="space-y-6">
      {/* 1. Executive Headline Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Gross Sales */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
            Gross Sales
          </div>
          <div className="mt-1.5 text-xl font-black text-[#172B25]">
            ₹{Math.round(ex.grossSalesPaise / 100).toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold">
            {ex.salesGrowthPct !== null ? (
              <>
                {isUp && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                {isDown && <TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
                {!isUp && !isDown && <Minus className="h-3.5 w-3.5 text-gray-500" />}
                <span className={isUp ? "text-emerald-700" : isDown ? "text-rose-700" : "text-gray-600"}>
                  {ex.salesGrowthPct > 0 ? `+${ex.salesGrowthPct}%` : `${ex.salesGrowthPct}%`}
                </span>
                <span className="text-[#718078] font-normal text-[10px]">vs prev</span>
              </>
            ) : (
              <span className="text-[#718078] text-[10px]">Baseline Period</span>
            )}
          </div>
        </div>

        {/* Net Sales */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
            Net Sales
          </div>
          <div className="mt-1.5 text-xl font-black text-emerald-800">
            ₹{Math.round(ex.netSalesPaise / 100).toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-[#718078]">Subtotal minus discounts</p>
        </div>

        {/* Total Orders & AOV */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
            Total Orders
          </div>
          <div className="mt-1.5 text-xl font-black text-[#172B25]">
            {ex.totalOrders.toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-[#718078]">
            AOV: <b>₹{Math.round(ex.avgOrderValuePaise / 100).toLocaleString()}</b>
          </p>
        </div>

        {/* Discounts & Vouchers */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
            Total Discounts
          </div>
          <div className="mt-1.5 text-xl font-black text-amber-700">
            ₹{Math.round(ex.totalDiscountsPaise / 100).toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-[#718078]">
            {ex.grossSalesPaise > 0
              ? `${Math.round((ex.totalDiscountsPaise / ex.grossSalesPaise) * 100)}% of gross`
              : "0%"}
          </p>
        </div>

        {/* GST Tax Collected */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
            GST Tax Collected
          </div>
          <div className="mt-1.5 text-xl font-black text-[#16845B]">
            ₹{Math.round(ex.totalTaxPaise / 100).toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-[#718078]">CGST + SGST (5%)</p>
        </div>

        {/* Operating Expenses */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
            Operating Expenses
          </div>
          <div className="mt-1.5 text-xl font-black text-purple-900">
            ₹{Math.round(ex.totalExpensesPaise / 100).toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-[#718078]">From recorded expenses</p>
        </div>
      </div>

      {/* 2. Profitability Card with Data Completeness Indicator */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E5EBE7] pb-3">
          <div>
            <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#16845B]" />
              Restaurant Profitability & Cost Analysis
            </h3>
            <p className="text-xs text-[#718078]">
              Net Sales minus Recipe Food Cost (COGS) minus Operating Expenses
            </p>
          </div>

          <div className="flex items-center gap-2">
            {ex.profitDataStatus === "COMPLETE" ? (
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Recipe Data Complete ({ex.foodCostCoveragePct}%)
              </span>
            ) : ex.profitDataStatus === "ESTIMATED" ? (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Estimated COGS ({ex.foodCostCoveragePct}% recipe coverage)
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-gray-500" />
                Recipe Costs Missing
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4">
          <div className="rounded-xl bg-[#F8FAF9] p-3 border border-[#E5EBE7]">
            <span className="text-[10px] font-bold uppercase text-[#718078]">Net Revenue</span>
            <div className="text-lg font-black text-[#172B25] mt-1">
              ₹{Math.round(ex.netSalesPaise / 100).toLocaleString()}
            </div>
            <p className="text-[10px] text-[#718078]">Sales after discounts</p>
          </div>

          <div className="rounded-xl bg-[#F8FAF9] p-3 border border-[#E5EBE7]">
            <span className="text-[10px] font-bold uppercase text-[#718078]">Cost of Goods (COGS)</span>
            <div className="text-lg font-black text-rose-700 mt-1">
              {ex.estimatedCogsPaise > 0
                ? `₹${Math.round(ex.estimatedCogsPaise / 100).toLocaleString()}`
                : "Not Configured"}
            </div>
            <p className="text-[10px] text-[#718078]">
              {ex.foodCostCoveragePct}% menu item coverage
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-800">Gross Profit</span>
            <div className="text-lg font-black text-emerald-900 mt-1">
              {ex.grossProfitPaise !== null
                ? `₹${Math.round(ex.grossProfitPaise / 100).toLocaleString()}`
                : "Unavailable"}
            </div>
            <p className="text-[10px] text-emerald-700">Net Sales - COGS</p>
          </div>

          <div className="rounded-xl bg-[#172B25] p-3 text-white">
            <span className="text-[10px] font-bold uppercase text-emerald-400">Net Operating Profit</span>
            <div className="text-lg font-black text-white mt-1">
              {ex.netProfitPaise !== null
                ? `₹${Math.round(ex.netProfitPaise / 100).toLocaleString()}`
                : "Unavailable"}
            </div>
            <p className="text-[10px] text-gray-300">Gross Profit - Expenses</p>
          </div>
        </div>
      </div>

      {/* 3. Daily Sales & Payment Breakdown Row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Daily Sales Trend Table */}
        <div className="md:col-span-2 rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25]">
              Daily Sales Trend Breakdown
            </h3>
            <span className="text-[11px] text-[#718078] font-bold">{data.dateRange.label}</span>
          </div>

          <div className="overflow-x-auto max-h-[320px] scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[10px] font-bold uppercase text-[#718078] sticky top-0">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-2 text-center">Orders</th>
                  <th className="py-2 px-2 text-right">Gross Sales</th>
                  <th className="py-2 px-2 text-right">Discounts</th>
                  <th className="py-2 px-2 text-right">Tax (5%)</th>
                  <th className="py-2 px-3 text-right">Net Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
                {data.salesAnalytics.salesByDay.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#718078]">
                      No orders billed in this period.
                    </td>
                  </tr>
                ) : (
                  data.salesAnalytics.salesByDay.map((d) => (
                    <tr key={d.date} className="hover:bg-[#F8FAF9] transition">
                      <td className="py-2.5 px-3 font-bold">
                        {d.label} <span className="text-[10px] text-[#718078] font-normal">({d.date})</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold">{d.orders}</td>
                      <td className="py-2.5 px-2 text-right font-black">
                        ₹{Math.round(d.grossPaise / 100).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right text-amber-700">
                        {d.discountPaise > 0 ? `₹${Math.round(d.discountPaise / 100)}` : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right text-[#16845B]">
                        ₹{Math.round(d.taxPaise / 100)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                        ₹{Math.round(d.netPaise / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Collection Share */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[#16845B]" /> Tender Breakdown
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {data.salesAnalytics.byPaymentMethod.map((pm) => (
              <div key={pm.method} className="space-y-1 text-xs">
                <div className="flex justify-between font-bold text-[#172B25]">
                  <span>{pm.label}</span>
                  <span>₹{Math.round(pm.amountPaise / 100).toLocaleString()} ({pm.sharePct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#F8FAF9] border border-[#E5EBE7] overflow-hidden">
                  <div
                    className="h-full bg-[#16845B] rounded-full transition-all duration-300"
                    style={{ width: `${pm.sharePct}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#718078]">{pm.orders} transactions</div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E5EBE7] text-[11px] text-[#718078]">
            Total Collections: <b>₹{Math.round(ex.grossSalesPaise / 100).toLocaleString()}</b>
          </div>
        </div>
      </div>

      {/* 4. Top Products & Outlet Ranking Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top 5 Products */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <Utensils className="h-4 w-4 text-amber-600" /> Top Revenue Products
            </h3>
          </div>

          <div className="divide-y divide-[#E5EBE7]">
            {data.productAnalytics.topProducts.slice(0, 5).map((p, idx) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F5EE] text-[#16845B] text-[10px] font-black">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-[#172B25]">{p.name}</div>
                    <div className="text-[10px] text-[#718078]">{p.category} • {p.quantity} sold</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-[#172B25]">
                    ₹{Math.round(p.revenuePaise / 100).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#718078] font-bold">{p.sharePct}% share</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outlet Performance Ranking */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-[#16845B]" /> Outlet Performance Leaderboard
            </h3>
          </div>

          <div className="divide-y divide-[#E5EBE7]">
            {data.outletPerformance.outlets.slice(0, 5).map((o) => (
              <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[#172B25] text-[10px] font-black">
                    #{o.rank}
                  </span>
                  <div>
                    <div className="font-bold text-[#172B25]">{o.name}</div>
                    <div className="text-[10px] text-[#718078]">{o.city} • {o.orders} orders</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-[#172B25]">
                    ₹{Math.round(o.grossSalesPaise / 100).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#718078] font-bold">{o.sharePct}% chain share</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
