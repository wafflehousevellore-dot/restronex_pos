"use client";

import React from "react";
import {
  TrendingUp,
  Clock,
  Utensils,
  CreditCard,
  Percent,
  AlertCircle,
} from "lucide-react";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface SalesAnalyticsTabProps {
  data: EnterpriseReportingPayload;
}

export function SalesAnalyticsTab({ data }: SalesAnalyticsTabProps) {
  const sa = data.salesAnalytics;
  const ex = data.executiveSummary;

  // Find peak hour
  const peakHourObj = [...sa.salesByHour].sort((a, b) => b.grossPaise - a.grossPaise)[0];

  return (
    <div className="space-y-6">
      {/* 1. Peak Hour & Hourly Sales Intelligence */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#E5EBE7] pb-3">
          <div>
            <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#16845B]" /> Hourly Sales & Peak Kitchen Velocity
            </h3>
            <p className="text-xs text-[#718078]">
              24-hour distribution of order volumes and dining rush hours
            </p>
          </div>

          {peakHourObj && peakHourObj.grossPaise > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900">
              Peak Rush: <b>{peakHourObj.label}</b> (₹{Math.round(peakHourObj.grossPaise / 100).toLocaleString()} • {peakHourObj.orders} orders)
            </div>
          )}
        </div>

        {/* 24-hour visual bar distribution */}
        <div className="grid grid-cols-12 gap-1.5 pt-2">
          {sa.salesByHour.map((h) => {
            const maxHour = Math.max(1, peakHourObj?.grossPaise || 1);
            const heightPct = Math.max(6, Math.round((h.grossPaise / maxHour) * 100));
            return (
              <div key={h.hour} className="flex flex-col items-center gap-1 group">
                <div className="w-full h-24 bg-[#F8FAF9] rounded-lg border border-[#E5EBE7] p-0.5 flex items-end">
                  <div
                    className="w-full bg-[#16845B] rounded-md transition-all duration-300 group-hover:bg-[#116B49]"
                    style={{ height: `${heightPct}%` }}
                    title={`${h.label}: ₹${Math.round(h.grossPaise / 100)} (${h.orders} orders)`}
                  />
                </div>
                <span className="text-[10px] font-bold text-[#718078]">{h.hour}h</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Channels & Payment Modes Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Service Mode Breakdown */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <Utensils className="h-4 w-4 text-[#16845B]" /> Sales by Service Mode
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {sa.byOrderType.map((ot) => (
              <div key={ot.type} className="space-y-1 text-xs">
                <div className="flex justify-between font-bold text-[#172B25]">
                  <span>{ot.label}</span>
                  <span>₹{Math.round(ot.grossPaise / 100).toLocaleString()} ({ot.sharePct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#F8FAF9] border border-[#E5EBE7] overflow-hidden">
                  <div
                    className="h-full bg-emerald-700 rounded-full transition-all duration-300"
                    style={{ width: `${ot.sharePct}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#718078]">{ot.orders} orders</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Modes */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[#16845B]" /> Settlement Tender Breakdown
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {sa.byPaymentMethod.map((pm) => (
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
        </div>
      </div>

      {/* 3. Discounts & Deductions Analysis */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-black text-[#172B25]">
              Discounts, Vouchers & Overrides Audit Log ({sa.discountsBreakdown.length})
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-800">
            Total Given: ₹{Math.round(ex.totalDiscountsPaise / 100).toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[300px] scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-[10px] font-bold uppercase text-[#718078] sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Order #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Service Mode</th>
                <th className="py-2.5 px-3 text-right">Discount Applied</th>
                <th className="py-2.5 px-4 text-right">Final Billed Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {sa.discountsBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[#718078]">
                    No discounts or promo codes applied to orders in this period.
                  </td>
                </tr>
              ) : (
                sa.discountsBreakdown.map((d, i) => (
                  <tr key={i} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-2.5 px-4 font-mono font-bold">{d.orderNumber}</td>
                    <td className="py-2.5 px-3 text-[11px] text-[#718078]">
                      {new Date(d.date).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">
                        {d.serviceMode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-amber-700">
                      -₹{Math.round(d.discountPaise / 100).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black">
                      ₹{Math.round(d.totalPaise / 100).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
