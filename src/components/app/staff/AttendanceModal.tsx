"use client";

import React, { useState } from "react";
import {
  X,
  Clock,
  Building2,
  Check,
} from "lucide-react";
import { StaffMemberData } from "./StaffDirectoryTable";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: StaffMemberData[];
  outlets: { id: string; name: string }[];
  onAttendanceLogged: () => void;
}

export function AttendanceModal({
  isOpen,
  onClose,
  members,
  outlets,
  onAttendanceLogged,
}: AttendanceModalProps) {
  const [membershipId, setMembershipId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [scheduledStartTime, setScheduledStartTime] = useState("09:00");
  const [shiftName, setShiftName] = useState("Morning");
  const [checkInMethod, setCheckInMethod] = useState<"SELF_POS" | "PIN" | "MANAGER_LOG" | "QR_CODE">("MANAGER_LOG");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!membershipId || !outletId) {
      setErrorMsg("Please select an employee and outlet location.");
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
      const res = await fetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          membershipId,
          employeeName: selectedMember.staffProfile?.fullName || selectedMember.user.name,
          employeeCode: selectedMember.staffProfile?.employeeCode,
          role: selectedMember.role,
          checkInMethod,
          shiftName,
          scheduledStartTime,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to log attendance punch.");
      } else {
        onAttendanceLogged();
        onClose();
      }
    } catch {
      setErrorMsg("An unexpected error occurred while logging attendance.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#16845B]" />
            <h2 className="text-base font-bold text-[#172B25]">Record Attendance Punch</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-semibold">
              {errorMsg}
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#172B25]">Shift Preset</label>
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-xs text-[#172B25]"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
                <option value="Full Day">Full Day</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#172B25]">Scheduled Start</label>
              <input
                type="time"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-xs text-[#172B25]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">Check-In Method</label>
            <select
              value={checkInMethod}
              onChange={(e) => setCheckInMethod(e.target.value as any)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-xs text-[#172B25]"
            >
              <option value="MANAGER_LOG">Manager Log (Manual Override)</option>
              <option value="SELF_POS">Self POS Terminal Login</option>
              <option value="PIN">Staff PIN Pad Punch</option>
              <option value="QR_CODE">QR Code Badge Scan</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">Punch Note</label>
            <input
              type="text"
              placeholder="e.g. Reliever shift, swapped with Rahul..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-xs text-[#172B25]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{submitting ? "Logging..." : "Confirm Punch In"}</span>
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
  );
}
