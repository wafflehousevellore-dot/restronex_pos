"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Clock,
  User,
  X,
  FileCode,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const ACTIONS = [
  "ALL",
  "ORDER_CANCELLED",
  "ORDER_REFUND",
  "ORDER_CREATED",
  "BILL_CLOSED",
  "STOCK_ADJUSTMENT",
  "MENU_PRICE_CHANGE",
  "STAFF_ROLE_CHANGE",
  "STAFF_INVITED",
  "TAX_CONFIG_CHANGE",
  "DAY_END_CLOSED",
];

const ENTITIES = [
  "ALL",
  "Order",
  "MenuItem",
  "InventoryItem",
  "Membership",
  "StaffShift",
  "Tenant",
  "TaxConfig",
  "Outlet",
];

export function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [page, setPage] = useState(0);
  const limit = 30;

  // Selected Log for Metadata Modal
  const [activeLog, setActiveLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedAction !== "ALL") params.set("action", selectedAction);
      if (selectedEntity !== "ALL") params.set("entity", selectedEntity);
      params.set("limit", String(limit));
      params.set("offset", String(page * limit));

      const res = await apiFetch(`/api/reports/audit?${params.toString()}`).then((r) => r.json());
      if (res && res.logs) {
        setLogs(res.logs);
        setTotalCount(res.totalCount || 0);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedAction, selectedEntity, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search action, entity ID, or actor..."
            className="pl-9 bg-white border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(0);
            }}
            className="bg-white border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 font-bold text-[#172B25] shadow-2xs focus:outline-hidden"
          >
            <option value="ALL">All Actions</option>
            {ACTIONS.filter((a) => a !== "ALL").map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => {
              setSelectedEntity(e.target.value);
              setPage(0);
            }}
            className="bg-white border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 font-bold text-[#172B25] shadow-2xs focus:outline-hidden"
          >
            <option value="ALL">All Entities</option>
            {ENTITIES.filter((en) => en !== "ALL").map((en) => (
              <option key={en} value={en}>
                {en}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-9 w-9 p-0 rounded-xl border-[#E5EBE7] bg-white text-xs font-bold hover:bg-[#F8FAF9] shadow-2xs"
            title="Refresh Audit Feed"
          >
            <RefreshCw className={`h-4 w-4 text-[#718078] ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. Audit Trail Table */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              Immutable Security & System Activity Trail ({totalCount})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-[#718078]">
            Tamper-resistant database audit records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[10px] font-bold uppercase text-[#718078]">
              <tr>
                <th className="py-2.5 px-4">Action Event</th>
                <th className="py-2.5 px-3">Actor / Performed By</th>
                <th className="py-2.5 px-3">Entity Target</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-xs text-[#718078] animate-pulse">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-xs text-[#718078]">
                    No audit records match the selected action and search filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-bold">
                      <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] px-2.5 py-0.5 text-[10px] font-mono font-black">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#172B25]">{log.actor.name}</div>
                      <div className="text-[10px] text-[#718078] font-medium">
                        {log.actor.role} • {log.actor.email}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#172B25]">{log.entity}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#718078]">
                      {log.entityId ? log.entityId.slice(0, 12) : "—"}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#718078]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.metadata ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveLog(log)}
                          className="h-7 text-[11px] rounded-lg text-[#16845B] hover:bg-[#E8F5EE] font-bold gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> View Data
                        </Button>
                      ) : (
                        <span className="text-[11px] text-[#718078] italic">No payload</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="p-3 border-t border-[#E5EBE7] bg-[#F8FAF9] flex items-center justify-between text-xs text-[#718078]">
            <span>
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="h-7 text-xs rounded-lg border-[#E5EBE7]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= totalCount}
                className="h-7 text-xs rounded-lg border-[#E5EBE7]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5EBE7] shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#16845B]" />
                <h4 className="text-sm font-black text-[#172B25]">
                  Audit Event Payload ({activeLog.action})
                </h4>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="rounded-full p-1 text-[#718078] hover:bg-[#E5EBE7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div>
                <b>Actor:</b> {activeLog.actor.name} ({activeLog.actor.email})
              </div>
              <div>
                <b>Timestamp:</b> {new Date(activeLog.createdAt).toLocaleString()}
              </div>
              <div>
                <b>Entity:</b> {activeLog.entity} (ID: {activeLog.entityId || "N/A"})
              </div>
            </div>

            <div className="rounded-xl bg-[#172B25] p-3 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-64 scrollbar-thin">
              <pre>{JSON.stringify(activeLog.metadata, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E5EBE7]">
              <Button
                size="sm"
                onClick={() => setActiveLog(null)}
                className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
