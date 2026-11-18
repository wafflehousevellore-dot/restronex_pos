"use client";

import React, { useState } from "react";
import {
  History,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  User,
  RotateCw,
  FileText,
  CreditCard,
  ChefHat,
  Boxes,
  Users,
} from "lucide-react";

export interface ActivityLogItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  metadata?: any;
}

interface StaffActivityLogsViewProps {
  logs: ActivityLogItem[];
  onRefresh: () => void;
  loading?: boolean;
}

const ACTION_CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  STAFF_INVITATION_SENT: { label: "Staff Invited", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Users },
  STAFF_CREATED: { label: "Staff Created", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Users },
  STAFF_UPDATED: { label: "Staff Updated", color: "bg-sky-50 text-sky-700 border-sky-200", icon: Users },
  STAFF_STATUS_SUSPENDED: { label: "Access Suspended", color: "bg-rose-50 text-rose-700 border-rose-200", icon: Users },
  STAFF_STATUS_ACTIVE: { label: "Access Restored", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Users },
  STAFF_REMOVED: { label: "Staff Removed", color: "bg-rose-50 text-rose-700 border-rose-200", icon: Users },
  STAFF_SHIFT_SCHEDULED: { label: "Shift Scheduled", color: "bg-teal-50 text-teal-700 border-teal-200", icon: Clock },
  STAFF_SHIFT_ACTIVE: { label: "Shift Started", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Clock },
  CASHIER_SHIFT_OPENED: { label: "Drawer Opened", color: "bg-amber-50 text-amber-800 border-amber-200", icon: CreditCard },
  CASHIER_SHIFT_CLOSED: { label: "Drawer Closed", color: "bg-purple-50 text-purple-700 border-purple-200", icon: CreditCard },
  STAFF_ATTENDANCE_CHECKIN: { label: "Punch In", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Clock },
  STAFF_ATTENDANCE_CHECKOUT: { label: "Punch Out", color: "bg-gray-50 text-gray-700 border-gray-200", icon: Clock },
  ROLE_CREATED: { label: "Role Created", color: "bg-violet-50 text-violet-700 border-violet-200", icon: Users },
  ROLE_UPDATED: { label: "Role Updated", color: "bg-violet-50 text-violet-700 border-violet-200", icon: Users },
};

export function StaffActivityLogsView({
  logs,
  onRefresh,
  loading = false,
}: StaffActivityLogsViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [inspectingLog, setInspectingLog] = useState<ActivityLogItem | null>(null);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      (log.user?.name || "").toLowerCase().includes(q) ||
      (log.user?.email || "").toLowerCase().includes(q) ||
      (log.entityId || "").toLowerCase().includes(q);

    let matchesCategory = true;
    if (categoryFilter === "STAFF") matchesCategory = log.action.startsWith("STAFF_") && !log.action.includes("SHIFT") && !log.action.includes("ATTENDANCE");
    if (categoryFilter === "SHIFTS") matchesCategory = log.action.includes("SHIFT");
    if (categoryFilter === "ATTENDANCE") matchesCategory = log.action.includes("ATTENDANCE");
    if (categoryFilter === "ROLES") matchesCategory = log.action.includes("ROLE");

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search audit trail by employee, action or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] py-2 pl-9 pr-3 text-xs text-[#172B25] placeholder-[#718078] outline-none transition focus:border-[#16845B] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] p-0.5 text-xs font-semibold">
            {(["ALL", "STAFF", "SHIFTS", "ATTENDANCE", "ROLES"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                  categoryFilter === cat
                    ? "bg-white text-[#172B25] shadow-xs"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {cat === "ALL" && `All (${logs.length})`}
                {cat === "STAFF" && "Team & Access"}
                {cat === "SHIFTS" && "Shifts & Cash"}
                {cat === "ATTENDANCE" && "Timeclock"}
                {cat === "ROLES" && "Roles"}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3] disabled:opacity-50"
            title="Refresh logs"
          >
            <RotateCw className={`h-3.5 w-3.5 text-[#16845B] ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Activity Logs Feed */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator / Staff</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details / Metadata</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#718078]">
                    No activity logs recorded matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const cfg = ACTION_CATEGORY_CONFIG[log.action] || {
                    label: log.action.replace(/_/g, " "),
                    color: "bg-gray-50 text-gray-700 border-gray-200",
                    icon: History,
                  };
                  const Icon = cfg.icon;

                  return (
                    <tr key={log.id} className="transition hover:bg-[#F8FAF9]">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#718078] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      {/* Operator / Staff */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#172B25]">
                          {log.user?.name || "System"}
                        </div>
                        <div className="text-[10px] text-[#718078]">
                          {log.user?.email || "internal"}
                          {log.user?.role && ` • ${log.user.role}`}
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-[#172B25]">{log.entity}</span>
                        {log.entityId && (
                          <div className="font-mono text-[10px] text-[#718078] truncate max-w-[120px]">
                            ID: {log.entityId.slice(0, 10)}...
                          </div>
                        )}
                      </td>

                      {/* Details / Metadata */}
                      <td className="py-3 px-4">
                        {log.metadata ? (
                          <div className="max-w-xs truncate text-[11px] text-[#55655D] font-mono">
                            {JSON.stringify(log.metadata).replace(/[{}"]/g, " ").trim()}
                          </div>
                        ) : (
                          <span className="text-[#718078] italic">—</span>
                        )}
                      </td>

                      {/* Inspect */}
                      <td className="py-3 px-4 text-right">
                        {log.metadata && (
                          <button
                            onClick={() => setInspectingLog(log)}
                            className="rounded-lg border border-[#E5EBE7] bg-white px-2 py-1 text-[11px] font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
                          >
                            Inspect
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

      {/* Metadata Inspector Dialog */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#16845B]" />
                <div>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Audit Log Inspection: {inspectingLog.action}
                  </h3>
                  <div className="text-[11px] text-[#718078] font-mono">
                    {new Date(inspectingLog.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 text-xs space-y-1">
                <div>
                  <span className="text-[#718078]">Actor:</span>{" "}
                  <span className="font-bold text-[#172B25]">
                    {inspectingLog.user?.name} ({inspectingLog.user?.email})
                  </span>
                </div>
                <div>
                  <span className="text-[#718078]">Entity:</span>{" "}
                  <span className="font-mono text-[#172B25]">{inspectingLog.entity}</span>
                </div>
                {inspectingLog.entityId && (
                  <div>
                    <span className="text-[#718078]">Entity ID:</span>{" "}
                    <span className="font-mono text-[#172B25]">{inspectingLog.entityId}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#172B25]">
                  Sanitized Event Payload:
                </label>
                <pre className="mt-1 overflow-x-auto rounded-xl border border-[#E5EBE7] bg-[#172B25] p-3 font-mono text-[11px] text-emerald-400">
                  {JSON.stringify(inspectingLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="border-t border-[#E5EBE7] bg-[#F8FAF9] p-4 text-right">
              <button
                onClick={() => setInspectingLog(null)}
                className="rounded-lg bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#116B49]"
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
