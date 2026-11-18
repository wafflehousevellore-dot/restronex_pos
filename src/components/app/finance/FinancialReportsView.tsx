"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  Percent,
  Receipt,
  Printer,
  Search,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { FinanceSummaryData } from "@/app/api/finance/route";

interface FinancialReportsViewProps {
  data: FinanceSummaryData;
  onRefresh: () => void;
}

export function FinancialReportsView({ data, onRefresh }: FinancialReportsViewProps) {
  const [reportType, setReportType] = useState<"daily" | "gst" | "tenders" | "outlets" | "channels">("daily");
  const [search, setSearch] = useState("");

  function handleExportCsv() {
    let apiType = "daily";
    if (reportType === "gst") apiType = "gst";
    if (reportType === "outlets" || reportType === "daily") apiType = "daily";

    window.open(`/api/reports/export?type=${apiType}&days=30`, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Report Selector Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Report Type Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "daily", label: "Daily Sales Report" },
            { id: "gst", label: "GSTR-1 Tax Summary" },
            { id: "tenders", label: "Tender Reconciliation" },
            { id: "outlets", label: "Outlet Performance" },
            { id: "channels", label: "Service Channels" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                reportType === r.id
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "bg-white text-[#55655D] border border-[#E5EBE7] hover:bg-[#F2F5F3]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Export & Print Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
          >
            <Download className="h-3.5 w-3.5 text-[#718078]" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
          >
            <Printer className="h-3.5 w-3.5 text-[#16845B]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Render Selected Report View */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        {/* 1. Daily Sales Report */}
        {reportType === "daily" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Bills Settled</th>
                  <th className="py-3 px-4 text-right">Gross Sales</th>
                  <th className="py-3 px-4 text-right">Discounts</th>
                  <th className="py-3 px-4 text-right">Taxes (GST)</th>
                  <th className="py-3 px-4 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {data.dailyTrends.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#718078]">
                      No sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  data.dailyTrends.map((d) => (
                    <tr key={d.date} className="hover:bg-[#F8FAF9] transition">
                      <td className="py-3 px-4 font-bold text-[#172B25]">{d.label} ({d.date})</td>
                      <td className="py-3 px-4 text-right font-mono">{d.ordersCount}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#172B25]">
                        {formatINR(d.grossSalesPaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-800">
                        {formatINR(d.discountPaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sky-800">
                        {formatINR(d.taxPaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        {formatINR(d.netSalesPaise)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. GSTR-1 Tax Summary Report */}
        {reportType === "gst" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-3 px-4">Reporting Date</th>
                  <th className="py-3 px-4 text-right">Invoices</th>
                  <th className="py-3 px-4 text-right">Taxable Turnover</th>
                  <th className="py-3 px-4 text-right">CGST 2.5%</th>
                  <th className="py-3 px-4 text-right">SGST 2.5%</th>
                  <th className="py-3 px-4 text-right">Total Output GST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {data.dailyTrends.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#718078]">
                      No tax invoices recorded in this period.
                    </td>
                  </tr>
                ) : (
                  data.dailyTrends.map((d) => {
                    const taxable = Math.max(0, d.grossSalesPaise - d.discountPaise);
                    const cgst = Math.round(d.taxPaise / 2);
                    const sgst = d.taxPaise - cgst;

                    return (
                      <tr key={d.date} className="hover:bg-[#F8FAF9] transition">
                        <td className="py-3 px-4 font-bold text-[#172B25]">{d.label}</td>
                        <td className="py-3 px-4 text-right font-mono">{d.ordersCount}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#172B25]">
                          {formatINR(taxable)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sky-800">
                          {formatINR(cgst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sky-800">
                          {formatINR(sgst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                          {formatINR(d.taxPaise)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Tender Reconciliation Report */}
        {reportType === "tenders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-3 px-4">Payment Method Tender</th>
                  <th className="py-3 px-4 text-right">Transactions</th>
                  <th className="py-3 px-4 text-right">Tendered Volume</th>
                  <th className="py-3 px-4 text-right">Share of Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {data.paymentMethods.map((tender) => (
                  <tr key={tender.method} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-bold text-[#172B25]">{tender.label}</td>
                    <td className="py-3 px-4 text-right font-mono">{tender.count}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(tender.amountPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {tender.sharePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Outlet Performance */}
        {reportType === "outlets" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-3 px-4">Branch Location</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4 text-right">Orders Settled</th>
                  <th className="py-3 px-4 text-right">Gross Sales</th>
                  <th className="py-3 px-4 text-right">Taxes Collected</th>
                  <th className="py-3 px-4 text-right">Average Ticket Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {data.outletBreakdown.map((o) => (
                  <tr key={o.outletId} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-bold text-[#172B25]">{o.outletName}</td>
                    <td className="py-3 px-4 text-[#718078]">{o.city || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono">{o.ordersCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(o.grossSalesPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sky-800">
                      {formatINR(o.taxPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatINR(o.avgOrderPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Service Channels */}
        {reportType === "channels" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-3 px-4">Service Mode / Channel</th>
                  <th className="py-3 px-4 text-right">Order Count</th>
                  <th className="py-3 px-4 text-right">Sales Volume</th>
                  <th className="py-3 px-4 text-right">Channel Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {data.channels.map((c) => (
                  <tr key={c.channel} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-bold text-[#172B25]">{c.channel.replace(/_/g, " ")}</td>
                    <td className="py-3 px-4 text-right font-mono">{c.ordersCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(c.salesPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {c.sharePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
