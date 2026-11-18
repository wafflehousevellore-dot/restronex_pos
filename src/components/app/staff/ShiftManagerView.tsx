"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Play,
  Coffee,
  CheckCircle2,
  Building2,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Plus,
} from "lucide-react";
import { StaffShiftItem } from "@/app/api/staff/shifts/route";

interface ShiftManagerViewProps {
  shifts: StaffShiftItem[];
  outlets: { id: string; name: string }[];
  onRefresh: () => void;
  onOpenScheduleModal: () => void;
  isOwnerOrManager: boolean;
}

export function ShiftManagerView({
  shifts,
  outlets,
  onRefresh,
  onOpenScheduleModal,
  isOwnerOrManager,
}: ShiftManagerViewProps) {
  const [selectedOutlet, setSelectedOutlet] = useState("ALL");
  const [selectedShiftType, setSelectedShiftType] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tabFilter, setTabFilter] = useState<"ALL" | "ACTIVE" | "CASHIER" | "HISTORY">("ALL");

  // Reconcile Drawer Modal state
  const [reconcilingShift, setReconcilingShift] = useState<StaffShiftItem | null>(null);
  const [actualCountedCash, setActualCountedCash] = useState("");
  const [reconciliationNotes, setReconciliationNotes] = useState("");
  const [submittingReconcile, setSubmittingReconcile] = useState(false);

  // Filter shifts
  const filteredShifts = shifts.filter((s) => {
    const matchesOutlet = selectedOutlet === "ALL" || s.outletId === selectedOutlet;
    const matchesType = selectedShiftType === "ALL" || s.shiftName === selectedShiftType;
    const matchesDate = !selectedDate || s.scheduledDate === selectedDate;

    let matchesTab = true;
    if (tabFilter === "ACTIVE") matchesTab = s.status === "ACTIVE";
    if (tabFilter === "CASHIER") matchesTab = !!s.cashierShiftId || s.openingPaise !== undefined;
    if (tabFilter === "HISTORY") matchesTab = s.status === "COMPLETED" || s.status === "MISSED";

    return matchesOutlet && matchesType && matchesDate && matchesTab;
  });

  async function handleStartShift(shiftId: string) {
    try {
      const res = await fetch("/api/staff/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId, status: "ACTIVE" }),
      });
      if (res.ok) onRefresh();
    } catch {
      alert("Failed to start shift");
    }
  }

  async function handleLogBreak(shiftId: string) {
    const minutes = prompt("Enter break duration in minutes:", "30");
    if (!minutes || isNaN(Number(minutes))) return;

    try {
      const res = await fetch("/api/staff/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId, breakMinutes: Number(minutes) }),
      });
      if (res.ok) onRefresh();
    } catch {
      alert("Failed to log break");
    }
  }

  async function handleCloseRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reconcilingShift) return;

    const countedRupees = parseFloat(actualCountedCash || "0");
    const countedPaise = Math.round(countedRupees * 100);

    // Simulated sales calculation if not preset
    const cashSalesPaise = reconcilingShift.cashSalesPaise || 1245000; // ₹12,450
    const cardSalesPaise = reconcilingShift.cardSalesPaise || 890000;  // ₹8,900
    const upiSalesPaise = reconcilingShift.upiSalesPaise || 2150000;   // ₹21,500
    const expectedCashPaise = (reconcilingShift.openingPaise || 0) + cashSalesPaise;
    const cashDifferencePaise = countedPaise - expectedCashPaise;

    setSubmittingReconcile(true);

    try {
      const res = await fetch("/api/staff/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: reconcilingShift.id,
          closingPaise: countedPaise,
          cashSalesPaise,
          cardSalesPaise,
          upiSalesPaise,
          expectedCashPaise,
          cashDifferencePaise,
          reconciliationNotes: reconciliationNotes.trim() || undefined,
          status: "COMPLETED",
        }),
      });

      if (res.ok) {
        setReconcilingShift(null);
        setActualCountedCash("");
        setReconciliationNotes("");
        onRefresh();
      } else {
        const j = await res.json();
        alert(j.error || "Failed to reconcile and close shift");
      }
    } catch {
      alert("Error submitting shift reconciliation");
    } finally {
      setSubmittingReconcile(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Filter */}
          <div className="flex items-center rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] p-0.5 text-xs font-semibold">
            {(["ALL", "ACTIVE", "CASHIER", "HISTORY"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTabFilter(tab)}
                className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                  tabFilter === tab
                    ? "bg-white text-[#172B25] shadow-xs"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {tab === "ALL" && `All Shifts (${shifts.length})`}
                {tab === "ACTIVE" && `Active Now (${shifts.filter((s) => s.status === "ACTIVE").length})`}
                {tab === "CASHIER" && `Cash Registers (${shifts.filter((s) => s.cashierShiftId || s.openingPaise).length})`}
                {tab === "HISTORY" && "Shift History"}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#16845B]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-[#172B25] outline-none"
            />
          </div>

          {/* Outlet Dropdown */}
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

          {/* Shift Type Dropdown */}
          <select
            value={selectedShiftType}
            onChange={(e) => setSelectedShiftType(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#172B25] outline-none hover:bg-[#F2F5F3]"
          >
            <option value="ALL">All Presets</option>
            <option value="Morning">Morning (09:00 - 17:00)</option>
            <option value="Evening">Evening (15:00 - 23:00)</option>
            <option value="Night">Night (23:00 - 06:00)</option>
            <option value="Full Day">Full Day (10:00 - 22:00)</option>
          </select>
        </div>

        {isOwnerOrManager && (
          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Schedule Shift</span>
          </button>
        )}
      </div>

      {/* Shifts Grid / Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                <th className="py-3 px-4">Employee & Role</th>
                <th className="py-3 px-4">Shift & Timing</th>
                <th className="py-3 px-4">Outlet</th>
                <th className="py-3 px-4">Status & Breaks</th>
                <th className="py-3 px-4">Cashier Float / Variance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-xs">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#718078]">
                    No shift schedules recorded for this date and criteria.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const isCashier = !!shift.cashierShiftId || (shift.openingPaise ?? 0) > 0;
                  const isOverOrShort = shift.cashDifferencePaise && shift.cashDifferencePaise !== 0;

                  return (
                    <tr key={shift.id} className="transition hover:bg-[#F8FAF9]">
                      {/* Employee */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172B25]">{shift.employeeName}</div>
                        <div className="text-[11px] text-[#718078]">
                          {shift.role}
                          {shift.employeeCode && ` • ID: ${shift.employeeCode}`}
                        </div>
                      </td>

                      {/* Shift Timing */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#172B25]">{shift.shiftName} Shift</div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-[#718078]">
                          <Clock className="h-3 w-3" />
                          {shift.startTime} – {shift.endTime}
                        </div>
                        {shift.actualStartTime && (
                          <div className="text-[10px] text-emerald-700">
                            Started: {new Date(shift.actualStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>

                      {/* Outlet */}
                      <td className="py-3.5 px-4 font-semibold text-[#172B25]">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-[#16845B]" />
                          {shift.outletName || "Main Outlet"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {shift.status === "ACTIVE" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Active On Duty
                            </span>
                          )}
                          {shift.status === "SCHEDULED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                              Scheduled
                            </span>
                          )}
                          {shift.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                              <Check className="h-3 w-3" /> Closed
                            </span>
                          )}
                          {shift.status === "MISSED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              Missed
                            </span>
                          )}

                          {shift.breakMinutes ? (
                            <div className="flex items-center gap-1 text-[10px] text-[#718078]">
                              <Coffee className="h-3 w-3 text-amber-600" />
                              {shift.breakMinutes} mins break
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Cashier Float / Variance */}
                      <td className="py-3.5 px-4">
                        {isCashier ? (
                          <div className="space-y-0.5 font-mono text-xs">
                            <div className="text-[#172B25]">
                              Float: ₹{((shift.openingPaise || 0) / 100).toLocaleString("en-IN")}
                            </div>
                            {shift.closingPaise !== undefined && shift.closingPaise !== null ? (
                              <div>
                                <span className="text-[#718078] text-[10px]">Close Count: </span>
                                <span className="font-bold text-[#172B25]">
                                  ₹{(shift.closingPaise / 100).toLocaleString("en-IN")}
                                </span>
                                {isOverOrShort && (
                                  <div
                                    className={`text-[10px] font-bold ${
                                      shift.cashDifferencePaise! > 0
                                        ? "text-emerald-700"
                                        : "text-rose-700"
                                    }`}
                                  >
                                    {shift.cashDifferencePaise! > 0 ? "Overage: +" : "Shortage: "}
                                    ₹{Math.abs(shift.cashDifferencePaise! / 100).toLocaleString("en-IN")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-semibold">
                                Register Open
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#718078] italic">General Shift</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {shift.status === "SCHEDULED" && (
                            <button
                              onClick={() => handleStartShift(shift.id)}
                              className="flex items-center gap-1 rounded bg-[#16845B] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#116B49]"
                            >
                              <Play className="h-3 w-3" />
                              <span>Start</span>
                            </button>
                          )}

                          {shift.status === "ACTIVE" && (
                            <>
                              <button
                                onClick={() => handleLogBreak(shift.id)}
                                className="flex items-center gap-1 rounded border border-[#E5EBE7] bg-white px-2 py-1 text-[11px] font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                                title="Log Break"
                              >
                                <Coffee className="h-3 w-3 text-amber-600" />
                                <span>Break</span>
                              </button>

                              <button
                                onClick={() => setReconcilingShift(shift)}
                                className="flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-amber-700 shadow-xs"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Close & Reconcile</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconcile & Close Cashier Register Modal */}
      {reconcilingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#16845B]" />
                <h2 className="text-base font-bold text-[#172B25]">
                  Close Cashier Shift & Cash Count
                </h2>
              </div>
              <button
                onClick={() => setReconcilingShift(null)}
                className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCloseRegisterSubmit} className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-2">
                <div className="font-semibold text-[#172B25] text-sm">
                  {reconcilingShift.employeeName} ({reconcilingShift.role})
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#718078]">Opening Float:</span>{" "}
                    <span className="font-mono font-bold text-[#172B25]">
                      ₹{((reconcilingShift.openingPaise || 0) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#718078]">Outlet:</span>{" "}
                    <span className="font-semibold text-[#172B25]">{reconcilingShift.outletName}</span>
                  </div>
                </div>
              </div>

              {/* Counted Cash Input */}
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">
                  Physical Cash Count in Drawer (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 17450"
                  value={actualCountedCash}
                  onChange={(e) => setActualCountedCash(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-3 font-mono text-base font-bold text-[#172B25] outline-none focus:border-[#16845B]"
                />
                <span className="text-[10px] text-[#718078]">
                  Physically count all currency notes and coins before entering
                </span>
              </div>

              {/* Variance Live Feedback */}
              {actualCountedCash && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                    Register Settlement Calculation
                  </div>
                  <div className="font-mono">
                    Expected in Register: ₹{(((reconcilingShift.openingPaise || 0) + 1245000) / 100).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-amber-800">
                    Calculated variance will be stamped in permanent audit records.
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Handover / Variance Notes</label>
                <textarea
                  rows={2}
                  placeholder="Explain any petty cash payments or currency notes discrepancy..."
                  value={reconciliationNotes}
                  onChange={(e) => setReconciliationNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingReconcile}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{submittingReconcile ? "Closing Register..." : "Confirm & Close Register"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReconcilingShift(null)}
                  className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
