"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { 
  Boxes, 
  RefreshCw, 
  Plus, 
  Check, 
  X, 
  SlidersHorizontal 
} from "lucide-react";
import { InventoryMetricsCards } from "./InventoryMetricsCards";
import { InventoryTabsNav, InventoryTabType } from "./InventoryTabsNav";
import { IngredientsTable } from "./IngredientsTable";
import { IngredientModal } from "./IngredientModal";
import { RecipeManager } from "./RecipeManager";
import { PurchaseOrderManager } from "./PurchaseOrderManager";
import { SupplierManager } from "./SupplierManager";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { StockTransferModal } from "./StockTransferModal";
import { InventoryReportsView } from "./InventoryReportsView";

export function InventoryClient() {
  const [activeTab, setActiveTab] = useState<InventoryTabType>("STOCK");
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    totalStockValuePaise: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pendingPurchaseOrders: 0,
    todayConsumptionPaise: 0,
    todayWastagePaise: 0,
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  const [adjustmentItem, setAdjustmentItem] = useState<any | null>(null);
  const [adjustmentAction, setAdjustmentAction] = useState<any>("RESTOCK");
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

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
      const q = new URLSearchParams();
      if (selectedOutlet) q.set("outletId", selectedOutlet);

      const [invRes, supRes, outRes] = await Promise.all([
        apiFetch(`/api/inventory?${q.toString()}`).then((r) => r.json()).catch(() => ({})),
        apiFetch("/api/suppliers").then((r) => r.json()).catch(() => []),
        apiFetch("/api/outlets").then((r) => r.json()).catch(() => []),
      ]);

      if (invRes.items && Array.isArray(invRes.items)) {
        setItems(invRes.items);
      }
      if (invRes.movements && Array.isArray(invRes.movements)) {
        setMovements(invRes.movements);
      }
      if (invRes.metrics) {
        setMetrics(invRes.metrics);
      }
      if (Array.isArray(supRes)) {
        setSuppliers(supRes);
      }
      if (Array.isArray(outRes)) {
        setOutlets(outRes);
        if (outRes.length > 0 && !selectedOutlet) {
          setSelectedOutlet(outRes[0].id);
        }
      }
    } catch {
      showToast("error", "Failed to sync inventory data");
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Save Ingredient
  const handleSaveIngredient = async (payload: any) => {
    try {
      if (payload.id) {
        // Update
        const res = await apiFetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: payload.id,
            name: payload.name,
            unit: payload.unit,
            currentStock: payload.currentStock,
            lowStockThreshold: payload.lowStockThreshold,
            costPerUnitPaise: payload.costPerUnitPaise,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          showToast("error", j.error || "Failed to update ingredient");
          return false;
        }
        showToast("success", `Ingredient ${payload.name} updated`);
      } else {
        // Create
        const res = await apiFetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            outletId: selectedOutlet,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          showToast("error", j.error || "Failed to create ingredient");
          return false;
        }
        showToast("success", `Ingredient ${payload.name} added to inventory`);
      }
      loadData();
      return true;
    } catch {
      showToast("error", "Error saving ingredient");
      return false;
    }
  };

  // Save Stock Adjustment
  const handleSaveAdjustment = async (payload: any) => {
    try {
      const res = await apiFetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          outletId: selectedOutlet,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        showToast("error", j.error || "Adjustment failed");
        return false;
      }
      showToast("success", `Stock adjustment recorded successfully`);
      loadData();
      return true;
    } catch {
      showToast("error", "Error recording adjustment");
      return false;
    }
  };

  // Save Branch Transfer
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

  // Delete Ingredient
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this raw ingredient?")) return;
    try {
      const res = await apiFetch(`/api/inventory?itemId=${itemId}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) {
        showToast("error", j.error || "Failed to delete item");
      } else {
        showToast("success", "Ingredient removed from stock");
        loadData();
      }
    } catch {
      showToast("error", "Error deleting ingredient");
    }
  };

  // Quick Restock shortcut
  const handleQuickRestock = (item: any) => {
    setAdjustmentItem(item);
    setAdjustmentAction("RESTOCK");
    setShowAdjustmentModal(true);
  };

  // Quick Spoilage shortcut
  const handleQuickWaste = (item: any) => {
    setAdjustmentItem(item);
    setAdjustmentAction("WASTE");
    setShowAdjustmentModal(true);
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
              Inventory & Recipe Management
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#16845B]/10 text-[#16845B]">
              RestroNex Operations
            </span>
          </div>
          <p className="text-xs text-[#718078] mt-0.5">
            Real-time stock valuation • Automatic POS recipe consumption • Purchase orders • Food costing & waste control
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
              <option value="ALL">All Branch Outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.city ? `(${o.city})` : ""}
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] shadow-xs transition cursor-pointer"
            title="Refresh stock levels"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <InventoryMetricsCards metrics={metrics} />

      {/* Navigation Tabs Bar */}
      <InventoryTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddIngredient={() => {
          setEditingItem(null);
          setShowItemModal(true);
        }}
        onOpenAdjustment={() => {
          setAdjustmentItem(null);
          setAdjustmentAction("RESTOCK");
          setShowAdjustmentModal(true);
        }}
        onOpenTransfer={() => setShowTransferModal(true)}
        itemsCount={items.length}
        recipesCount={items.reduce((s, i) => s + (i.recipesCount || 0), 0)}
        posCount={metrics.pendingPurchaseOrders}
        suppliersCount={suppliers.length}
      />

      {/* Active Tab View */}
      {activeTab === "STOCK" && (
        <IngredientsTable
          items={items}
          onQuickRestock={handleQuickRestock}
          onQuickWaste={handleQuickWaste}
          onEditItem={(item) => {
            setEditingItem(item);
            setShowItemModal(true);
          }}
          onDeleteItem={handleDeleteItem}
        />
      )}

      {activeTab === "RECIPES" && (
        <RecipeManager inventoryItems={items} />
      )}

      {activeTab === "PURCHASES" && (
        <PurchaseOrderManager
          suppliers={suppliers}
          inventoryItems={items}
          onStockUpdated={loadData}
        />
      )}

      {activeTab === "SUPPLIERS" && (
        <SupplierManager
          suppliers={suppliers}
          onRefresh={loadData}
        />
      )}

      {activeTab === "REPORTS" && (
        <InventoryReportsView
          movements={movements}
          items={items}
        />
      )}

      {/* Ingredient Modal */}
      {showItemModal && (
        <IngredientModal
          item={editingItem}
          suppliers={suppliers}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveIngredient}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <StockAdjustmentModal
          initialItem={adjustmentItem}
          allItems={items}
          initialAction={adjustmentAction}
          onClose={() => {
            setShowAdjustmentModal(false);
            setAdjustmentItem(null);
          }}
          onSave={handleSaveAdjustment}
        />
      )}

      {/* Inter-Branch Transfer Modal */}
      {showTransferModal && (
        <StockTransferModal
          outlets={outlets}
          currentOutletId={selectedOutlet}
          allItems={items}
          onClose={() => setShowTransferModal(false)}
          onSave={handleSaveTransfer}
        />
      )}
    </div>
  );
}
