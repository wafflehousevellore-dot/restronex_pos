"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { 
  Utensils, 
  Layers, 
  Calendar as CalendarIcon, 
  Clock, 
  RefreshCw, 
  Plus, 
  TrendingUp, 
  Check, 
  X, 
  Sparkles 
} from "lucide-react";
import { TableMetricsBar } from "./TableMetricsBar";
import { FloorAreaTabs } from "./FloorAreaTabs";
import { VisualFloorPlanView } from "./VisualFloorPlanView";
import { TableOrderDrawer } from "./TableOrderDrawer";
import { TableTransferMergeModal } from "./TableTransferMergeModal";
import { TableEditModal } from "./TableEditModal";
import { TableQrModal } from "./TableQrModal";
import { ReservationsManager } from "./ReservationsManager";
import { WalkInWaitlist } from "./WalkInWaitlist";
import { TableAnalyticsModal } from "./TableAnalyticsModal";
import { formatINR } from "@/lib/money";

export function TablesClient() {
  const [activeTab, setActiveTab] = useState<"FLOOR" | "RESERVATIONS" | "WAITLIST">("FLOOR");
  const [tables, setTables] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [tenantName, setTenantName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"MAP" | "GRID">("MAP");

  // Modals & Drawers
  const [drawerTable, setDrawerTable] = useState<any | null>(null);
  const [qrModalTable, setQrModalTable] = useState<any | null>(null);
  const [shiftModalTable, setShiftModalTable] = useState<any | null>(null);
  const [editModalTable, setEditModalTable] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Toast message
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (selectedOutlet) q.set("outletId", selectedOutlet);

      const [oList, tList, mList] = await Promise.all([
        apiFetch("/api/outlets").then((r) => r.json()).catch(() => []),
        apiFetch(`/api/tables?${q.toString()}`).then((r) => r.json()).catch(() => []),
        apiFetch("/api/tenants").then((r) => r.json()).catch(() => []),
      ]);

      if (Array.isArray(oList)) {
        setOutlets(oList);
        if (oList.length > 0 && !selectedOutlet) {
          setSelectedOutlet(oList[0].id);
        }
      }

      if (Array.isArray(tList)) {
        setTables(tList);
        // If drawer is open, keep drawerTable updated with latest order items
        if (drawerTable) {
          const fresh = tList.find((t: any) => t.id === drawerTable.id);
          if (fresh) setDrawerTable(fresh);
        }
      }

      if (Array.isArray(mList) && mList.length > 0) {
        const found = mList[0]?.tenant?.name;
        if (found) setTenantName(found);
      }
    } catch {
      showToast("error", "Failed to sync tables data");
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet, drawerTable]);

  useEffect(() => {
    loadData();
    // Auto refresh every 15s for live table updates
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Dynamic unique areas from tables
  const areas = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.area) set.add(t.area);
    });
    return Array.from(set);
  }, [tables]);

  // Area counts
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: tables.length };
    tables.forEach((t) => {
      const a = t.area || "Main Hall";
      counts[a] = (counts[a] || 0) + 1;
    });
    return counts;
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // Area match
      if (selectedArea !== "ALL" && (t.area || "Main Hall") !== selectedArea) {
        return false;
      }
      // Status match
      if (statusFilter !== "ALL") {
        if (statusFilter === "OCCUPIED" && t.status !== "OCCUPIED" && t.status !== "BILLING") {
          return false;
        } else if (statusFilter === "BILLED" && t.status !== "BILLED" && t.status !== "BILLING") {
          return false;
        } else if (statusFilter !== "OCCUPIED" && statusFilter !== "BILLED" && t.status !== statusFilter) {
          return false;
        }
      }
      // Search query match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = t.number.toLowerCase().includes(query);
        const waiterMatch = t.waiterName?.toLowerCase().includes(query);
        const areaMatch = t.area?.toLowerCase().includes(query);
        if (!numMatch && !waiterMatch && !areaMatch) return false;
      }
      return true;
    });
  }, [tables, selectedArea, statusFilter, searchQuery]);

  // Create or update table handler
  const handleSaveTable = async (data: any) => {
    try {
      if (data.id) {
        // Edit existing table
        const res = await apiFetch("/api/tables", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: data.id,
            number: data.number,
            area: data.area,
            capacity: data.capacity,
            waiterName: data.waiterName,
            qrOrderingEnabled: data.qrOrderingEnabled,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          showToast("error", j.error || "Failed to update table");
          return false;
        }
        showToast("success", `Table ${data.number} updated successfully`);
      } else {
        // Create new table
        const res = await apiFetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const j = await res.json();
        if (!res.ok) {
          showToast("error", j.error || "Failed to create table");
          return false;
        }
        showToast("success", `Table ${data.number} created successfully`);
      }
      loadData();
      return true;
    } catch {
      showToast("error", "Error saving table");
      return false;
    }
  };

  // Shift or merge table handler
  const handleShiftOrMerge = async (mode: "MOVE" | "MERGE", targetTableId: string) => {
    if (!shiftModalTable) return false;
    try {
      const res = await apiFetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "MOVE" ? "MOVE_ORDER" : "MERGE_TABLES",
          tableId: shiftModalTable.id,
          targetTableId,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        showToast("error", j.error || "Operation failed");
        return false;
      }

      showToast(
        "success",
        mode === "MOVE"
          ? `Order shifted from Table ${j.from} to Table ${j.to}`
          : `Tables merged successfully into Table ${j.target}`
      );
      loadData();
      return true;
    } catch {
      showToast("error", "Error shifting table");
      return false;
    }
  };

  // Update status handler
  const handleUpdateStatus = async (tableId: string, status: string) => {
    try {
      await apiFetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, status }),
      });
      showToast("success", `Table status updated to ${status}`);
      loadData();
    } catch {
      showToast("error", "Failed to update status");
    }
  };

  // Close / release table handler
  const handleCloseTable = async (tableId: string) => {
    try {
      await apiFetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE_TABLE", tableId }),
      });
      showToast("success", "Table cleared & released as Available");
      loadData();
    } catch {
      showToast("error", "Failed to release table");
    }
  };

  // Delete table handler
  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      const res = await apiFetch(`/api/tables?tableId=${tableId}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) {
        showToast("error", j.error || "Failed to delete table");
      } else {
        showToast("success", "Table removed successfully");
        loadData();
      }
    } catch {
      showToast("error", "Error deleting table");
    }
  };

  // Thermal print handler
  const handlePrintThermal = (type: "BILL" | "KOT", table: any) => {
    const order = table.activeOrder;
    if (!order) {
      showToast("error", "No active order on this table to print.");
      return;
    }

    const currentOutlet = outlets.find((o) => o.id === selectedOutlet) || outlets[0];
    const items = order.items || [];
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>${type === "KOT" ? "Kitchen Order Ticket" : "Guest Bill"} - Table ${table.number}</title>
          <style>
            @page { size: 80mm auto; margin: 2mm; }
            body { 
              font-family: monospace; 
              font-size: 12px; 
              width: 72mm; 
              margin: 0; 
              padding: 4mm;
              color: #000;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: 15px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="center title">${type === "KOT" ? "KITCHEN ORDER TICKET (KOT)" : (currentOutlet?.name || "RESTRONEX")}</div>
          <div class="center">${type === "KOT" ? "DINE-IN ORDER" : (currentOutlet?.city || "")}</div>
          <div class="divider"></div>
          <div><strong>TABLE: ${table.number}</strong> (${table.area || "Main Hall"})</div>
          <div>ORDER: #${order.orderNumber || order.id.slice(-6).toUpperCase()}</div>
          <div>TIME: ${new Date().toLocaleTimeString()}</div>
          ${table.waiterName ? `<div>WAITER: ${table.waiterName}</div>` : ""}
          <div class="divider"></div>
          ${items
            .map(
              (item: any) => `
            <div class="item-row">
              <span>${item.quantity}x ${item.name || "Item"}</span>
              ${type === "BILL" ? `<span>${formatINR(item.pricePaise * item.quantity)}</span>` : ""}
            </div>
          `
            )
            .join("")}
          <div class="divider"></div>
          ${
            type === "BILL"
              ? `
            <div class="item-row bold">
              <span>TOTAL DUE:</span>
              <span>${formatINR(table.orderTotalPaise || order.totalAmountPaise || 0)}</span>
            </div>
            <div class="center" style="margin-top: 12px;">Thank you for dining with us!</div>
          `
              : `<div class="center" style="margin-top: 8px;">KOT Dispatched</div>`
          }
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const currentOutletName = outlets.find((o) => o.id === selectedOutlet)?.name || "Main Outlet";

  return (
    <div className="space-y-6 text-[#172B25] pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-3.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150 ${
            toast.type === "success"
              ? "bg-[#172B25] text-white border border-emerald-500/30"
              : "bg-red-600 text-white border border-red-400"
          }`}
        >
          {toast.type === "success" ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#172B25]">
              Floor Plan & Reservations
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#16845B]/10 text-[#16845B]">
              RestroNex Table Management
            </span>
          </div>
          <p className="text-xs text-[#718078] mt-0.5">
            Real-time interactive floor plan • Table turnover • Live KOT orders • Table reservations & walk-in waitlist
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {outlets.length > 1 && (
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B] shadow-xs cursor-pointer"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.city ? `(${o.city})` : ""}
                </option>
              ))}
            </select>
          )}

          {/* Table Analytics Button */}
          <button
            type="button"
            onClick={() => setShowAnalyticsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E5EBE7] hover:border-[#16845B] rounded-full text-xs font-bold text-[#172B25] shadow-xs transition cursor-pointer"
            title="Floor Occupancy & Turnover Analytics"
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#16845B]" />
            <span>Turnover Analytics</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] shadow-xs transition cursor-pointer"
            title="Refresh floor status"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5EBE7] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("FLOOR")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "FLOOR"
              ? "bg-[#172B25] text-white shadow-xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
          }`}
        >
          <Utensils className="h-4 w-4" />
          <span>Interactive Floor Plan</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "FLOOR" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {tables.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("RESERVATIONS")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "RESERVATIONS"
              ? "bg-[#172B25] text-white shadow-xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Reservations Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("WAITLIST")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "WAITLIST"
              ? "bg-[#172B25] text-white shadow-xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Walk-in Waitlist</span>
        </button>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === "FLOOR" && (
        <div className="space-y-6">
          {/* Real-time KPI Metrics Bar */}
          <TableMetricsBar tables={tables} />

          {/* Floor Areas & Controls */}
          <FloorAreaTabs
            areas={areas}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
            statusFilter={statusFilter}
            onSelectStatus={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenAddTable={() => {
              setEditModalTable(null);
              setShowEditModal(true);
            }}
            areaCounts={areaCounts}
          />

          {/* 2D Interactive Floor Plan */}
          <VisualFloorPlanView
            tables={filteredTables}
            onSelectTable={(table) => setDrawerTable(table)}
            onOpenQrModal={(table) => setQrModalTable(table)}
            onOpenShiftModal={(table) => setShiftModalTable(table)}
            onOpenEditModal={(table) => {
              setEditModalTable(table);
              setShowEditModal(true);
            }}
            onUpdateStatus={handleUpdateStatus}
            onCloseTable={handleCloseTable}
            onDeleteTable={handleDeleteTable}
            viewMode={viewMode}
          />
        </div>
      )}

      {activeTab === "RESERVATIONS" && (
        <ReservationsManager
          outlets={outlets}
          selectedOutlet={selectedOutlet}
          allTables={tables}
          onRefreshTables={loadData}
        />
      )}

      {activeTab === "WAITLIST" && (
        <WalkInWaitlist
          outlets={outlets}
          selectedOutlet={selectedOutlet}
          allTables={tables}
          onRefreshTables={loadData}
        />
      )}

      {/* Slide-over Table Order Drawer */}
      <TableOrderDrawer
        table={drawerTable}
        onClose={() => setDrawerTable(null)}
        onOpenShiftModal={(table) => {
          setShiftModalTable(table);
        }}
        onCloseTable={handleCloseTable}
        onPrintThermal={handlePrintThermal}
      />

      {/* Shift / Merge Order Modal */}
      {shiftModalTable && (
        <TableTransferMergeModal
          sourceTable={shiftModalTable}
          allTables={tables}
          onClose={() => setShiftModalTable(null)}
          onExecute={handleShiftOrMerge}
        />
      )}

      {/* Create / Edit Table Modal */}
      {showEditModal && (
        <TableEditModal
          table={editModalTable}
          areas={areas}
          outlets={outlets}
          selectedOutlet={selectedOutlet}
          onClose={() => {
            setShowEditModal(false);
            setEditModalTable(null);
          }}
          onSave={handleSaveTable}
        />
      )}

      {/* QR Table Tent Modal */}
      {qrModalTable && (
        <TableQrModal
          table={qrModalTable}
          outletName={currentOutletName}
          tenantName={tenantName}
          onClose={() => setQrModalTable(null)}
        />
      )}

      {/* Floor Turnover Analytics Modal */}
      {showAnalyticsModal && (
        <TableAnalyticsModal
          tables={tables}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </div>
  );
}
