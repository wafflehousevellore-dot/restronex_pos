"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Calendar,
  Building2,
  Printer,
  Download,
  AlertTriangle,
  Receipt,
  Plus,
  RotateCw,
} from "lucide-react";
import { formatINR } from "@/lib/money";

export interface DayEndSummaryRow {
  id: string;
  outletId: string;
  outlet?: { id: string; name: string } | null;
  date: string;
  salesPaise: number;
  expensePaise: number;
  orders: number;
  closedAt: string;
}

interface DayEndClosingManagerProps {
  dayEnds: DayEndSummaryRow[];
  outlets: Array<{ id: string; name: string }>;
  onOpenDayEndModal: () => void;
  onRefresh: () => void;
  isOwnerOrManager: boolean;
}

export function DayEndClosingManager({
  dayEnds,
  outlets,
  onOpenDayEndModal,
  onRefresh,
  isOwnerOrManager,
}: DayEndClosingManagerProps) {
  const [selectedOutlet, setSelectedOutlet] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewingZReport, setViewingZReport] = useState<DayEndSummaryRow | null>(null);

  const filteredDayEnds = dayEnds.filter((d) => {
    const matchesOutlet = selectedOutlet === "ALL" || d.outletId === selectedOutlet;
    const matchesDate = !selectedDate || d.date === selectedDate;
    return matchesOutlet && matchesDate;
  });

  const totalSettledPaise = dayEnds.reduce((s, d) => s + d.salesPaise, 0);
  const totalExpensesPaise = dayEnds.reduce((s, d) => s + d.expensePaise, 0);
  const totalOrders = dayEnds.reduce((s, d) => s + d.orders, 0);

  function handleExportCsv() {
    window.open(`/api/reports/export?type=dayend`, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Day-End Closings</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#172B25]">{dayEnds.length} records</div>
          <div className="text-[11px] text-[#718078]">Audit stamped in database</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Total Settled Sales</span>
            <Receipt className="h-4 w-4 text-[#16845B]" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700 font-mono">
            {formatINR(totalSettledPaise)}
          </div>
          <div className="text-[11px] text-[#718078]">{totalOrders.toLocaleString()} total orders closed</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Petty Cash Expenses</span>
            <Receipt className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-800 font-mono">
            {formatINR(totalExpensesPaise)}
          </div>
          <div className="text-[11px] text-[#718078]">Paid-out register vouchers</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Audit Integrity</span>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              100% Safe
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-[#172B25]">Locked Z-Reports</div>
          <div className="text-[11px] text-[#718078]">Zero duplicate closures allowed</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Outlet Filter */}
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#172B25] outline-none hover:bg-[#F2F5F3]"
          >
            <option value="ALL">All Outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#16845B]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-[#172B25] outline-none"
            />
          </div>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-[11px] font-semibold text-[#718078] hover:text-[#172B25]"
            >
              Clear Date
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
          >
            <Download className="h-3.5 w-3.5 text-[#718078]" />
            <span>Export CSV</span>
          </button>

          {isOwnerOrManager && (
            <button
              onClick={onOpenDayEndModal}
              className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Perform Day-End</span>
            </button>
          )}
        </div>
      </div>

      {/* Day-End Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                <th className="py-3 px-4">Closing Date</th>
                <th className="py-3 px-4">Outlet</th>
                <th className="py-3 px-4 text-right">Orders Settled</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
                <th className="py-3 px-4 text-right">Expenses</th>
                <th className="py-3 px-4">Closed Timestamp</th>
                <th className="py-3 px-4 text-right">Z-Report Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {filteredDayEnds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#718078]">
                    No historical day-end closing records found for this selection.
                  </td>
                </tr>
              ) : (
                filteredDayEnds.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#172B25]">{d.date}</td>
                    <td className="py-3 px-4 font-semibold text-[#172B25]">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-[#16845B]" />
                        {d.outlet?.name || "Main Branch"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{d.orders}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(d.salesPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-800">
                      {formatINR(d.expensePaise)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#718078]">
                      {new Date(d.closedAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setViewingZReport(d)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
                      >
                        <Printer className="h-3 w-3 text-[#16845B]" />
                        <span>View Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Historical Z-Report Modal */}
      {viewingZReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-sm flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl p-6 font-mono text-xs space-y-3">
            <div className="text-center pb-2 border-b border-[#E5EBE7]">
              <div className="text-sm font-black text-[#172B25] uppercase tracking-wide">
                {viewingZReport.outlet?.name || "Restaurant Outlet"}
              </div>
              <div className="text-xs font-bold text-[#16845B] mt-1">
                *** ARCHIVED Z-REPORT ***
              </div>
              <div className="text-[10px] text-[#718078]">
                Date: {viewingZReport.date} • Closed:{" "}
                {new Date(viewingZReport.closedAt).toLocaleString()}
              </div>
            </div>

            <div className="space-y-1.5 py-2">
              <div className="flex justify-between">
                <span className="text-[#718078]">Orders Settled:</span>
                <span className="font-bold">{viewingZReport.orders}</span>
              </div>
              <div className="flex justify-between font-bold text-[#16845B]">
                <span>Gross Sales:</span>
                <span>{formatINR(viewingZReport.salesPaise)}</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>Voucher Expenses:</span>
                <span>{formatINR(viewingZReport.expensePaise)}</span>
              </div>
              <div className="flex justify-between border-t border-[#E5EBE7] pt-1 font-black text-sm">
                <span>Net Drawer Total:</span>
                <span>{formatINR(Math.max(0, viewingZReport.salesPaise - viewingZReport.expensePaise))}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#116B49]"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setViewingZReport(null)}
                className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
