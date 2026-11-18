"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { 
  Building2, 
  RefreshCw, 
  Plus, 
  Check, 
  X, 
  Layers 
} from "lucide-react";
import { HeadOfficeMetricsCards } from "./HeadOfficeMetricsCards";
import { HeadOfficeTabsNav, HeadOfficeTabType } from "./HeadOfficeTabsNav";
import { OutletDirectoryGrid } from "./OutletDirectoryGrid";
import { OutletEditModal } from "./OutletEditModal";
import { OutletComparisonView } from "./OutletComparisonView";
import { CentralMenuControlView } from "./CentralMenuControlView";
import { ChainInventoryOverview } from "./ChainInventoryOverview";
import { FranchiseManagerView } from "./FranchiseManagerView";
import { StockTransferModal } from "../inventory/StockTransferModal";
import { useRouter } from "next/navigation";

export function OutletsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HeadOfficeTabType>("OUTLETS");
  const [outlets, setOutlets] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [analytics, setAnalytics] = useState({
    totalOutlets: 0,
    activeOutlets: 0,
    inactiveOutlets: 0,
    totalRevenuePaise: 0,
    totalOrders: 0,
    averageOrderValuePaise: 0,
    bestPerformingOutlet: null as { name: string; revenuePaise: number } | null,
    lowestPerformingOutlet: null as { name: string; revenuePaise: number } | null,
    maxOutlets: 1,
    planName: "Starter",
  });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingOutlet, setEditingOutlet] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [outRes, tenRes, invRes] = await Promise.all([
        apiFetch("/api/outlets").then((r) => r.json()).catch(() => ({})),
        apiFetch("/api/tenants").then((r) => r.json()).catch(() => []),
        apiFetch("/api/inventory").then((r) => r.json()).catch(() => ({ items: [] })),
      ]);

      if (outRes) {
        if (Array.isArray(outRes.outlets)) setOutlets(outRes.outlets);
        else if (Array.isArray(outRes)) setOutlets(outRes);

        if (outRes.analytics) setAnalytics(outRes.analytics);
      }

      if (Array.isArray(tenRes) && tenRes.length > 0) {
        const tid = tenRes[0]?.tenant?.id || tenRes[0]?.id;
        if (tid) setTenantId(tid);
      }

      if (invRes && Array.isArray(invRes.items)) {
        setInventoryItems(invRes.items);
      }
    } catch {
      showToast("error", "Failed to sync multi-outlet data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 25000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Select outlet and switch context
  const handleSelectOutlet = (outletId: string) => {
    document.cookie = `restronex_outlet=${outletId}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    showToast("success", "Active outlet context updated");
    router.push("/app/dashboard");
  };

  // Save outlet (create or edit)
  const handleSaveOutlet = async (payload: any) => {
    try {
      if (payload.outletId) {
        const res = await apiFetch("/api/outlets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok) {
          showToast("error", j.error || "Failed to update outlet");
          return false;
        }
        showToast("success", `Branch ${payload.name} updated successfully`);
      } else {
        const res = await apiFetch("/api/outlets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            tenantId: payload.tenantId || tenantId || outlets[0]?.tenantId,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          showToast("error", j.error || "Failed to create outlet: Plan limit reached.");
          return false;
        }
        showToast("success", `New branch ${payload.name} created successfully`);
      }
      loadData();
      return true;
    } catch {
      showToast("error", "Error saving outlet");
      return false;
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (outletId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await apiFetch("/api/outlets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId, status: nextStatus }),
      });
      const j = await res.json();
      if (!res.ok) {
        showToast("error", j.error || "Cannot change branch status");
      } else {
        showToast("success", `Branch status set to ${nextStatus}`);
        loadData();
      }
    } catch {
      showToast("error", "Error updating branch status");
    }
  };

  // Delete / decommission outlet
  const handleDeleteOutlet = async (outletId: string) => {
    if (!confirm("Are you sure you want to deactivate this branch?")) return;
    try {
      const res = await apiFetch(`/api/outlets?outletId=${outletId}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) {
        showToast("error", j.error || "Failed to decommission outlet");
      } else {
        showToast("success", "Branch archived successfully");
        loadData();
      }
    } catch {
      showToast("error", "Error decommissioning outlet");
    }
  };

  // Save transfer
  const handleSaveTransfer = async (payload: any) => {
    try {
      const res = await apiFetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          ...payload,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        showToast("error", j.error || "Transfer failed");
        return false;
      }
      showToast("success", "Inter-branch stock transfer confirmed");
      loadData();
      return true;
    } catch {
      showToast("error", "Error transferring stock");
      return false;
    }
  };

  // Export analytics
  const handleExportCsv = () => {
    const headers = ["Branch Name", "City", "Status", "Revenue (INR)", "Orders", "AOV (INR)", "Tables", "Staff"];
    const rows = outlets.map((o) => [
      `"${o.name}"`,
      `"${o.city || "Bengaluru"}"`,
      o.status,
      ((o.revenuePaise || 0) / 100).toFixed(2),
      o.orderCount || 0,
      ((o.aovPaise || 0) / 100).toFixed(2),
      o.tableCount || 0,
      o.staffCount || 0,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `head_office_analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              Multi-Outlet & Head Office Control
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#16845B]/10 text-[#16845B]">
              RestroNex Chain Management
            </span>
          </div>
          <p className="text-xs text-[#718078] mt-0.5">
            Enterprise chain overview • Cross-outlet revenue comparison • Central master menu • Multi-branch inventory & franchise standards
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] shadow-xs transition cursor-pointer"
          title="Refresh chain data"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Top Metrics Cards */}
      <HeadOfficeMetricsCards analytics={analytics} />

      {/* Navigation Tabs Bar */}
      <HeadOfficeTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateOutlet={() => {
          setEditingOutlet(null);
          setShowEditModal(true);
        }}
        onExportCsv={handleExportCsv}
        outletsCount={outlets.length}
      />

      {/* Active Tab Views */}
      {activeTab === "OUTLETS" && (
        <OutletDirectoryGrid
          outlets={outlets}
          onSelectOutlet={handleSelectOutlet}
          onEditOutlet={(outlet) => {
            setEditingOutlet(outlet);
            setShowEditModal(true);
          }}
          onToggleStatus={handleToggleStatus}
          onDeleteOutlet={handleDeleteOutlet}
        />
      )}

      {activeTab === "COMPARISON" && (
        <OutletComparisonView
          outlets={outlets}
          totalRevenuePaise={analytics.totalRevenuePaise}
          totalOrders={analytics.totalOrders}
        />
      )}

      {activeTab === "MENU" && (
        <CentralMenuControlView outlets={outlets} />
      )}

      {activeTab === "INVENTORY" && (
        <ChainInventoryOverview
          outlets={outlets}
          onOpenTransfer={() => setShowTransferModal(true)}
        />
      )}

      {activeTab === "FRANCHISE" && (
        <FranchiseManagerView outlets={outlets} />
      )}

      {/* Outlet Edit Modal */}
      {showEditModal && (
        <OutletEditModal
          outlet={editingOutlet}
          tenantId={tenantId || outlets[0]?.tenantId || ""}
          maxOutlets={analytics.maxOutlets}
          activeCount={analytics.activeOutlets}
          onClose={() => {
            setShowEditModal(false);
            setEditingOutlet(null);
          }}
          onSave={handleSaveOutlet}
        />
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <StockTransferModal
          outlets={outlets}
          currentOutletId={outlets[0]?.id || ""}
          allItems={inventoryItems}
          onClose={() => setShowTransferModal(false)}
          onSave={handleSaveTransfer}
        />
      )}
    </div>
  );
}
