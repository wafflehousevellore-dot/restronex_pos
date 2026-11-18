"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Printer,
  Receipt,
  Check,
} from "lucide-react";
import { formatINR } from "@/lib/money";

interface DayEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlets: Array<{ id: string; name: string }>;
  onDayEndCompleted: () => void;
}

export function DayEndModal({
  isOpen,
  onClose,
  outlets,
  onDayEndCompleted,
}: DayEndModalProps) {
  const [outletId, setOutletId] = useState(outlets[0]?.id || "");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [openingFloatRupees, setOpeningFloatRupees] = useState("5000");
  const [cashAdditionsRupees, setCashAdditionsRupees] = useState("0");
  const [cashAdditionsReason, setCashAdditionsReason] = useState("");
  const [cashWithdrawalsRupees, setCashWithdrawalsRupees] = useState("0");
  const [cashWithdrawalsReason, setCashWithdrawalsReason] = useState("");
  const [countedCashRupees, setCountedCashRupees] = useState("");
  const [managerNotes, setManagerNotes] = useState("");
  const [forceCloseWithOpenOrders, setForceCloseWithOpenOrders] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zReportData, setZReportData] = useState<any | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outletId) {
      setErrorMsg("Please select an outlet location.");
      return;
    }
    if (!countedCashRupees) {
      setErrorMsg("Please enter physical counted cash in register.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const openingPaise = Math.round(parseFloat(openingFloatRupees || "0") * 100);
    const countedPaise = Math.round(parseFloat(countedCashRupees || "0") * 100);
    const additionsPaise = Math.round(parseFloat(cashAdditionsRupees || "0") * 100);
    const withdrawalsPaise = Math.round(parseFloat(cashWithdrawalsRupees || "0") * 100);

    try {
      const res = await fetch("/api/day-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          date,
          openingFloatPaise: openingPaise,
          countedCashPaise: countedPaise,
          cashAdditionsPaise: additionsPaise,
          cashAdditionsReason: cashAdditionsReason.trim() || undefined,
          cashWithdrawalsPaise: withdrawalsPaise,
          cashWithdrawalsReason: cashWithdrawalsReason.trim() || undefined,
          managerNotes: managerNotes.trim() || undefined,
          forceCloseWithOpenOrders,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to perform day-end closing.");
      } else {
        setZReportData(data.zReport);
        onDayEndCompleted();
      }
    } catch {
      setErrorMsg("An unexpected error occurred during day-end closing.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrintZReport() {
    window.print();
  }

  function handleResetAndClose() {
    setZReportData(null);
    setErrorMsg(null);
    setForceCloseWithOpenOrders(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#16845B]" />
            <h2 className="text-base font-bold text-[#172B25]">
              {zReportData ? "Daily Z-Report Statement" : "Cashier & Outlet Day-End Closing"}
            </h2>
          </div>
          <button
            onClick={handleResetAndClose}
            className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {zReportData ? (
            /* Printable Z-Report View */
            <div className="space-y-4">
              <div
                id="printable-z-report"
                className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-5 font-mono text-xs space-y-3"
              >
                <div className="text-center pb-2 border-b border-[#E5EBE7]">
                  <div className="text-base font-black text-[#172B25] uppercase tracking-wide">
                    {zReportData.tenantName}
                  </div>
                  <div className="text-xs text-[#718078]">{zReportData.outletName}</div>
                  <div className="text-[11px] font-bold text-[#16845B] mt-1">
                    *** DAILY Z-REPORT CLOSING ***
                  </div>
                  <div className="text-[10px] text-[#718078]">
                    Date: {zReportData.date} • Closed:{" "}
                    {new Date(zReportData.closedAt).toLocaleTimeString()}
                  </div>
                </div>

                <div className="space-y-1.5 py-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#718078]">Completed Orders:</span>
                    <span className="font-bold text-[#172B25]">{zReportData.ordersCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718078]">Cancelled Orders:</span>
                    <span className="font-bold text-rose-700">{zReportData.cancelledOrdersCount || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E5EBE7] pt-1">
                    <span className="font-bold text-[#172B25]">Gross Sales:</span>
                    <span className="font-bold text-[#172B25]">{formatINR(zReportData.totalSalesPaise)}</span>
                  </div>
                  <div className="flex justify-between text-amber-800">
                    <span>Total Discounts:</span>
                    <span>-{formatINR(zReportData.totalDiscountPaise)}</span>
                  </div>
                  <div className="flex justify-between text-sky-800">
                    <span>GST Output Tax:</span>
                    <span>+{formatINR(zReportData.totalTaxPaise)}</span>
                  </div>
                  <div className="flex justify-between text-rose-800">
                    <span>Refunded Amount:</span>
                    <span>-{formatINR(zReportData.refundedPaise || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E5EBE7] pt-1 font-bold text-[#16845B]">
                    <span>Net Sales Realized:</span>
                    <span>{formatINR(zReportData.netSalesPaise)}</span>
                  </div>
                </div>

                {/* Tender Breakdown */}
                <div className="border-t border-[#E5EBE7] pt-2 space-y-1">
                  <div className="font-bold text-[11px] text-[#718078] uppercase">
                    Payment Method Tenders:
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Sales:</span>
                    <span>{formatINR(zReportData.cashSalesPaise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UPI Tenders:</span>
                    <span>{formatINR(zReportData.upiSalesPaise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card (EDC):</span>
                    <span>{formatINR(zReportData.cardSalesPaise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Gateway:</span>
                    <span>{formatINR(zReportData.onlineSalesPaise || 0)}</span>
                  </div>
                </div>

                {/* Cash Drawer Reconciliation */}
                <div className="border-t border-[#E5EBE7] pt-2 space-y-1">
                  <div className="font-bold text-[11px] text-[#718078] uppercase">
                    Cash Drawer Settlement:
                  </div>
                  <div className="flex justify-between">
                    <span>Opening Float:</span>
                    <span>{formatINR(zReportData.openingFloatPaise)}</span>
                  </div>
                  {zReportData.cashAdditionsPaise > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Cash In (Additions):</span>
                      <span>+{formatINR(zReportData.cashAdditionsPaise)}</span>
                    </div>
                  )}
                  {zReportData.cashWithdrawalsPaise > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Cash Out (Expenses):</span>
                      <span>-{formatINR(zReportData.cashWithdrawalsPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#E5EBE7] pt-1 font-bold">
                    <span>Expected Cash in Drawer:</span>
                    <span>{formatINR(zReportData.expectedCashPaise)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Actual Physical Cash Counted:</span>
                    <span>{formatINR(zReportData.countedCashPaise)}</span>
                  </div>
                  <div
                    className={`flex justify-between font-black text-xs border-t border-[#E5EBE7] pt-1 ${
                      zReportData.cashVariancePaise === 0
                        ? "text-emerald-700"
                        : zReportData.cashVariancePaise > 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    <span>Cash Register Variance:</span>
                    <span>
                      {zReportData.cashVariancePaise > 0 ? "+ (Overage) " : zReportData.cashVariancePaise < 0 ? "- (Shortage) " : "(Balanced) "}
                      {formatINR(Math.abs(zReportData.cashVariancePaise))}
                    </span>
                  </div>
                </div>

                {zReportData.managerNotes && (
                  <div className="border-t border-[#E5EBE7] pt-2 text-[10px] text-[#718078]">
                    <span className="font-bold">Manager Notes:</span> {zReportData.managerNotes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handlePrintZReport}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white hover:bg-[#116B49]"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Thermal Slip</span>
                </button>
                <button
                  onClick={handleResetAndClose}
                  className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 text-xs font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Day-End Form */
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-semibold space-y-2">
                  <div>{errorMsg}</div>
                  {errorMsg.includes("unbilled/open") && (
                    <label className="flex items-center gap-2 pt-1 font-bold text-rose-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceCloseWithOpenOrders}
                        onChange={(e) => setForceCloseWithOpenOrders(e.target.checked)}
                        className="h-3.5 w-3.5 text-rose-600"
                      />
                      <span>Force close with manager override (authorized)</span>
                    </label>
                  )}
                </div>
              )}

              {/* Outlet and Date Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">
                    Closing Outlet <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={outletId}
                    onChange={(e) => setOutletId(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-semibold text-[#172B25] outline-none focus:border-[#16845B]"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">
                    Closing Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-[#172B25] outline-none focus:border-[#16845B]"
                  />
                </div>
              </div>

              {/* Float and Cash Additions / Withdrawals */}
              <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-3">
                <div className="font-bold text-[#172B25] flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-[#16845B]" />
                  <span>Cash Drawer Ledger Adjustments</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#718078]">
                      Opening Cash Float (₹)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={openingFloatRupees}
                      onChange={(e) => setOpeningFloatRupees(e.target.value)}
                      className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2 font-mono text-xs text-[#172B25]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#718078]">
                      Cash In / Additions (₹)
                    </label>
                    <input
                      type="number"
                      step="10"
                      placeholder="0"
                      value={cashAdditionsRupees}
                      onChange={(e) => setCashAdditionsRupees(e.target.value)}
                      className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2 font-mono text-xs text-[#172B25]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#718078]">
                      Cash Out / Expenses (₹)
                    </label>
                    <input
                      type="number"
                      step="10"
                      placeholder="0"
                      value={cashWithdrawalsRupees}
                      onChange={(e) => setCashWithdrawalsRupees(e.target.value)}
                      className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2 font-mono text-xs text-[#172B25]"
                    />
                  </div>
                </div>

                {(Number(cashAdditionsRupees) > 0 || Number(cashWithdrawalsRupees) > 0) && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {Number(cashAdditionsRupees) > 0 && (
                      <input
                        type="text"
                        placeholder="Reason for Cash Addition..."
                        value={cashAdditionsReason}
                        onChange={(e) => setCashAdditionsReason(e.target.value)}
                        className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2 text-[11px]"
                      />
                    )}
                    {Number(cashWithdrawalsRupees) > 0 && (
                      <input
                        type="text"
                        placeholder="Reason for Cash Out (e.g. Milk, Ice)..."
                        value={cashWithdrawalsReason}
                        onChange={(e) => setCashWithdrawalsReason(e.target.value)}
                        className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2 text-[11px]"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Physical Cash Count */}
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">
                  Physical Counted Cash in Register (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 18450"
                  value={countedCashRupees}
                  onChange={(e) => setCountedCashRupees(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-3 font-mono text-base font-bold text-[#172B25] outline-none focus:border-[#16845B]"
                />
                <span className="text-[10px] text-[#718078]">
                  Total value of physical currency notes and coins counted at close
                </span>
              </div>

              {/* Manager Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">
                  Manager Closing Statement &amp; Discrepancy Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Closing supervisor comments, register variance explanations..."
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{submitting ? "Finalizing Day-End..." : "Submit & Generate Z-Report"}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
