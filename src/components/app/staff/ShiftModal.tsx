"use client";

import React, { useState } from "react";
import {
  X,
  CalendarPlus,
  Clock,
  Building2,
  Users,
  CreditCard,
  Check,
} from "lucide-react";
import { StaffMemberData } from "./StaffDirectoryTable";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: StaffMemberData[];
  outlets: { id: string; name: string }[];
  onShiftCreated: () => void;
}

export function ShiftModal({
  isOpen,
  onClose,
  members,
  outlets,
  onShiftCreated,
}: ShiftModalProps) {
  const [membershipId, setMembershipId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [shiftName, setShiftName] = useState<"Morning" | "Evening" | "Night" | "Full Day" | "Custom">("Morning");
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isCashierShift, setIsCashierShift] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("5000"); // 5000 rupees default float
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleShiftTypeChange(type: "Morning" | "Evening" | "Night" | "Full Day" | "Custom") {
    setShiftName(type);
    if (type === "Morning") {
      setStartTime("09:00");
      setEndTime("17:00");
    } else if (type === "Evening") {
      setStartTime("15:00");
      setEndTime("23:00");
    } else if (type === "Night") {
      setStartTime("23:00");
      setEndTime("06:00");
    } else if (type === "Full Day") {
      setStartTime("10:00");
      setEndTime("22:00");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!membershipId || !outletId || !scheduledDate) {
      setErrorMsg("Please select an employee, outlet, and scheduled date.");
      return;
    }

    const selectedMember = members.find((m) => m.id === membershipId);
    if (!selectedMember) {
      setErrorMsg("Selected staff member not found.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/staff/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          membershipId,
          employeeName: selectedMember.staffProfile?.fullName || selectedMember.user.name,
          employeeCode: selectedMember.staffProfile?.employeeCode,
          role: selectedMember.role,
          shiftName,
          scheduledDate,
          startTime,
          endTime,
          notes: notes.trim() || undefined,
          isCashierShift,
          openingPaise: isCashierShift ? Math.round(parseFloat(openingFloat || "0") * 100) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to schedule shift.");
      } else {
        onShiftCreated();
        onClose();
      }
    } catch {
      setErrorMsg("An unexpected error occurred while scheduling shift.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-[#16845B]" />
            <h2 className="text-base font-bold text-[#172B25]">Schedule Work Shift</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Staff Member & Outlet Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={membershipId}
                  onChange={(e) => {
                    setMembershipId(e.target.value);
                    const m = members.find((x) => x.id === e.target.value);
                    if (m?.outletId) setOutletId(m.outletId);
                  }}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-semibold text-[#172B25] outline-none focus:border-[#16845B]"
                >
                  <option value="">Select Employee...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.staffProfile?.fullName || m.user.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">
                  Outlet Location <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-semibold text-[#172B25] outline-none focus:border-[#16845B]"
                >
                  <option value="">Select Outlet...</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shift Type Quick Select */}
            <div className="space-y-1">
              <label className="font-semibold text-[#172B25]">Shift Preset</label>
              <div className="grid grid-cols-4 gap-2">
                {(["Morning", "Evening", "Night", "Full Day"] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleShiftTypeChange(preset)}
                    className={`rounded-lg border py-2 text-center text-xs font-semibold transition ${
                      shiftName === preset
                        ? "border-[#16845B] bg-[#16845B]/10 text-[#16845B]"
                        : "border-[#E5EBE7] bg-white text-[#55655D] hover:bg-[#F8FAF9]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Times */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Date</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>
            </div>

            {/* Cashier Drawer Option */}
            <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-3">
              <label className="flex items-center gap-2 font-semibold text-[#172B25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCashierShift}
                  onChange={(e) => setIsCashierShift(e.target.checked)}
                  className="h-3.5 w-3.5 text-[#16845B]"
                />
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-[#16845B]" />
                  Open Cashier Register & Cash Float
                </span>
              </label>

              {isCashierShift && (
                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-[#718078]">
                    Opening Cash Float (₹)
                  </label>
                  <input
                    type="number"
                    step="50"
                    placeholder="5000"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5EBE7] bg-white p-2 font-mono text-xs text-[#172B25]"
                  />
                  <span className="text-[10px] text-[#718078]">
                    Amount placed in the physical cash drawer at start of shift
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-[#172B25]">Operational Notes</label>
              <textarea
                rows={2}
                placeholder="Station assignment, special events, handover notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                <Check className="h-3.5 w-3.5" />
                <span>{submitting ? "Scheduling..." : "Confirm & Schedule Shift"}</span>
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
        </div>
      </div>
    </div>
  );
}
