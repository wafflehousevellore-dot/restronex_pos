"use client";

import React, { useState } from "react";
import {
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  LogOut,
  Search,
  Check,
} from "lucide-react";
import { AttendanceItem } from "@/app/api/staff/attendance/route";

interface AttendanceDashboardProps {
  records: AttendanceItem[];
  outlets: { id: string; name: string }[];
  totalStaffCount: number;
  onRefresh: () => void;
  onOpenRecordModal: () => void;
  isOwnerOrManager: boolean;
}

export function AttendanceDashboard({
  records,
  outlets,
  totalStaffCount,
  onRefresh,
  onOpenRecordModal,
  isOwnerOrManager,
}: AttendanceDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedOutlet, setSelectedOutlet] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  // Compute metrics for selected date
  const dateRecords = records.filter((r) => !selectedDate || r.date === selectedDate);
  const presentCount = dateRecords.filter((r) => r.status === "PRESENT").length;
  const lateCount = dateRecords.filter((r) => r.status === "LATE").length;
  const halfDayCount = dateRecords.filter((r) => r.status === "HALF_DAY").length;
  const clockedInNow = dateRecords.filter((r) => !r.checkOutTime).length;
  const totalAttended = dateRecords.length;
  const attendanceRate = totalStaffCount > 0 ? Math.min(100, Math.round((totalAttended / totalStaffCount) * 100)) : 0;

  // Filter table records
  const filteredRecords = dateRecords.filter((r) => {
    const matchesOutlet = selectedOutlet === "ALL" || r.outletId === selectedOutlet;
    const matchesStatus = selectedStatus === "ALL" || r.status === selectedStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.employeeName.toLowerCase().includes(q) ||
      (r.employeeCode || "").toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q);

    return matchesOutlet && matchesStatus && matchesSearch;
  });

  async function handleCheckOut(recordId: string, employeeName: string) {
    if (!confirm(`Confirm check-out punch for ${employeeName}?`)) return;

    setCheckingOutId(recordId);
    try {
      const res = await fetch("/api/staff/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId }),
      });
      if (res.ok) {
        onRefresh();
      } else {
        const j = await res.json();
        alert(j.error || "Failed to punch check out");
      }
    } catch {
      alert("Error punching check out");
    } finally {
      setCheckingOutId(null);
    }
  }

  function handleExportCsv() {
    window.open(`/api/staff/attendance?export=true&date=${selectedDate}`, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Attendance KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Present On-Time</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700">{presentCount}</div>
          <div className="text-[11px] text-[#718078]">Punctual check-ins</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Late Arrivals (&gt;15m)</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-700">{lateCount}</div>
          <div className="text-[11px] text-[#718078]">Grace period exceeded</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Half-Day (&lt;4h)</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-purple-700">{halfDayCount}</div>
          <div className="text-[11px] text-[#718078]">Short shift duration</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Clocked In Now</span>
            <Clock className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#16845B]">{clockedInNow}</div>
          <div className="text-[11px] text-[#718078]">Currently on floor</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Attendance Rate</span>
            <span className="text-xs font-bold text-[#16845B]">{attendanceRate}%</span>
          </div>
          <div className="mt-2 text-xl font-bold text-[#172B25]">{attendanceRate}%</div>
          <div className="text-[11px] text-[#718078]">{totalAttended}/{totalStaffCount} staff on duty</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search attendance by employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] py-2 pl-9 pr-3 text-xs text-[#172B25] placeholder-[#718078] outline-none transition focus:border-[#16845B] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#172B25] outline-none hover:bg-[#F2F5F3]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present (On-Time)</option>
            <option value="LATE">Late Arrivals</option>
            <option value="HALF_DAY">Half-Day</option>
          </select>

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

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5 text-[#718078]" />
            <span>Export CSV</span>
          </button>

          {/* Record Punch Button */}
          {isOwnerOrManager && (
            <button
              onClick={onOpenRecordModal}
              className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Punch</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Outlet & Shift</th>
                <th className="py-3 px-4">Punch In Time</th>
                <th className="py-3 px-4">Punch Out Time</th>
                <th className="py-3 px-4">Status & Method</th>
                <th className="py-3 px-4">Hours Worked</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#718078]">
                    No attendance records logged for {selectedDate || "selected date"}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const checkInFormatted = new Date(r.checkInTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const checkOutFormatted = r.checkOutTime
                    ? new Date(r.checkOutTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : null;

                  return (
                    <tr key={r.id} className="transition hover:bg-[#F8FAF9]">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#172B25]">{r.employeeName}</div>
                        <div className="text-[11px] text-[#718078]">
                          {r.role}
                          {r.employeeCode && ` • ${r.employeeCode}`}
                        </div>
                      </td>

                      {/* Outlet & Shift */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#172B25] flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-[#16845B]" />
                          {r.outletName || "Main Outlet"}
                        </div>
                        {r.shiftName && (
                          <div className="text-[11px] text-[#718078]">{r.shiftName} Shift</div>
                        )}
                      </td>

                      {/* Check In */}
                      <td className="py-3 px-4 font-mono text-xs text-[#172B25]">
                        <div>{checkInFormatted}</div>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-sans text-gray-700 uppercase">
                          {r.checkInMethod.replace("_", " ")}
                        </span>
                      </td>

                      {/* Check Out */}
                      <td className="py-3 px-4 font-mono text-xs">
                        {checkOutFormatted ? (
                          <div className="text-[#172B25]">{checkOutFormatted}</div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-[#16845B]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#16845B] animate-pulse" />
                            Clocked In
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {r.status === "PRESENT" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Present (On-Time)
                          </span>
                        )}
                        {r.status === "LATE" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                            <AlertTriangle className="h-3 w-3" /> Late Arrival
                          </span>
                        )}
                        {r.status === "HALF_DAY" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                            Half Day
                          </span>
                        )}
                      </td>

                      {/* Hours Worked */}
                      <td className="py-3 px-4 font-mono text-xs">
                        {r.hoursWorked ? (
                          <span className="font-bold text-[#172B25]">{r.hoursWorked} hrs</span>
                        ) : (
                          <span className="text-[#718078] italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {!r.checkOutTime && isOwnerOrManager && (
                          <button
                            onClick={() => handleCheckOut(r.id, r.employeeName)}
                            disabled={checkingOutId === r.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 shadow-xs hover:bg-rose-50"
                          >
                            <LogOut className="h-3 w-3" />
                            <span>{checkingOutId === r.id ? "Punching..." : "Punch Out"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
