"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  Trash2,
  X,
  TrendingDown,
  PackageCheck,
  History,
} from "lucide-react";

type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  lowStockThreshold: number;
  costPerUnitPaise: number;
  recipeIngredients?: {
    recipe: {
      menuItem: { id: string; name: string };
    };
  }[];
};

type StockMovement = {
  id: string;
  type: string;
  quantity: number;
  inventoryItemId: string;
  reference?: string | null;
  createdAt: string;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "LOW_STOCK" | "HEALTHY">("ALL");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add Item Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    unit: "KG",
    currentStock: "",
    lowStockThreshold: "5",
    costPerUnitRupees: "",
  });

  // Adjust Stock Modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustAction, setAdjustAction] = useState<"RESTOCK" | "WASTE" | "ADJUST">("RESTOCK");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/inventory");
      if (res.ok) {
        const j = await res.json();
        setItems(j.items || []);
        setMovements(j.movements || []);
      }
    } catch {
      setMsg({ type: "error", text: "Failed to load inventory data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) return;

    try {
      const res = await apiFetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          unit: addForm.unit,
          currentStock: parseFloat(addForm.currentStock || "0"),
          lowStockThreshold: parseFloat(addForm.lowStockThreshold || "5"),
          costPerUnitPaise: Math.round(parseFloat(addForm.costPerUnitRupees || "0") * 100),
        }),
      });

      if (res.ok) {
        setMsg({ type: "success", text: `${addForm.name} added to inventory` });
        setIsAddOpen(false);
        setAddForm({ name: "", unit: "KG", currentStock: "", lowStockThreshold: "5", costPerUnitRupees: "" });
        loadData();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || "Failed to add ingredient" });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to save ingredient" });
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustItem || !adjustQty || isNaN(parseFloat(adjustQty))) return;

    setSavingAdjust(true);
    try {
      const res = await apiFetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: adjustItem.id,
          action: adjustAction,
          quantity: parseFloat(adjustQty),
          notes: adjustNotes || undefined,
        }),
      });

      if (res.ok) {
        setMsg({
          type: "success",
          text: `Stock updated for ${adjustItem.name} (${adjustAction}: ${adjustQty} ${adjustItem.unit})`,
        });
        setAdjustItem(null);
        setAdjustQty("");
        setAdjustNotes("");
        loadData();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || "Failed to adjust stock" });
      }
    } catch {
      setMsg({ type: "error", text: "Stock adjustment failed" });
    } finally {
      setSavingAdjust(false);
    }
  }

  async function handleDeleteItem(itemId: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name} from inventory?`)) return;
    try {
      const res = await apiFetch(`/api/inventory?itemId=${itemId}`, { method: "DELETE" });
      if (res.ok) {
        setMsg({ type: "success", text: `${name} deleted from inventory` });
        loadData();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || "Failed to delete" });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to delete item" });
    }
  }

  const lowStockItems = items.filter((i) => i.currentStock <= i.lowStockThreshold);

  const filteredItems = items.filter((i) => {
    const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterType === "ALL"
        ? true
        : filterType === "LOW_STOCK"
        ? i.currentStock <= i.lowStockThreshold
        : i.currentStock > i.lowStockThreshold;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Inventory & Recipe Stock</h1>
          <p className="text-sm text-[#718078]">
            Real-time raw material tracking, low-stock alerts, and automatic recipe deduction on order billing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddOpen(true)}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Material
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-full border-[#E5EBE7] bg-white text-xs font-semibold hover:bg-[#F8FAF9] p-2.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            msg.type === "success"
              ? "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/30"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="p-1 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Low Stock Urgent Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-amber-950">
                Low Stock Alert ({lowStockItems.length} ingredient{lowStockItems.length > 1 ? "s" : ""})
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                The following raw materials are below their replenishment threshold. Restock promptly to prevent kitchen stockouts.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {lowStockItems.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => {
                      setAdjustItem(it);
                      setAdjustAction("RESTOCK");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-950 shadow-2xs hover:bg-amber-100/60 transition cursor-pointer"
                  >
                    <span>{it.name}:</span>
                    <span className="text-red-700 font-black">
                      {it.currentStock} {it.unit}
                    </span>
                    <span className="text-[10px] text-amber-700 font-medium">
                      (min {it.lowStockThreshold})
                    </span>
                    <span className="text-[#16845B] font-bold text-[11px] ml-1">Restock →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Total Materials</div>
            <div className="text-2xl font-black text-[#172B25] mt-1">{items.length}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Tracked ingredients</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Low Stock Alerts</div>
            <div className={`text-2xl font-black mt-1 ${lowStockItems.length > 0 ? "text-red-600" : "text-[#16845B]"}`}>
              {lowStockItems.length}
            </div>
            <div className="text-[10px] text-[#718078] mt-0.5">Below alert threshold</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Inventory Valuation</div>
            <div className="text-2xl font-black text-[#16845B] mt-1">
              {formatINR(items.reduce((s, i) => s + Math.round(i.currentStock * i.costPerUnitPaise), 0))}
            </div>
            <div className="text-[10px] text-[#718078] mt-0.5">Current on-hand cost</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Recent Deductions</div>
            <div className="text-2xl font-black text-[#172B25] mt-1">{movements.length}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Stock audit events</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E5EBE7] p-3 rounded-2xl shadow-2xs">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search raw material name..."
            className="pl-9 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#718078] uppercase px-1">Filter:</span>
          {(["ALL", "LOW_STOCK", "HEALTHY"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-full px-3 py-1 text-xs font-bold border transition cursor-pointer ${
                filterType === t
                  ? "bg-[#16845B] text-white border-[#16845B] shadow-2xs"
                  : "bg-white border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
              }`}
            >
              {t === "ALL" ? "All Items" : t === "LOW_STOCK" ? `Low Stock (${lowStockItems.length})` : "Healthy"}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredItems.map((it) => {
          const isLow = it.currentStock <= it.lowStockThreshold;

          return (
            <Card
              key={it.id}
              className={`border transition shadow-xs ${
                isLow ? "bg-red-50/40 border-red-200" : "bg-white border-[#E5EBE7] hover:border-[#16845B]/40"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#172B25]">{it.name}</h3>
                    <div className="text-[11px] text-[#718078] mt-0.5">
                      Cost: {formatINR(it.costPerUnitPaise)} / {it.unit}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase ${
                      isLow ? "bg-red-600 text-white shadow-2xs" : "bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20"
                    }`}
                  >
                    {it.currentStock} {it.unit}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-[#718078] pt-2 border-t border-[#E5EBE7]">
                  <span>Threshold: {it.lowStockThreshold} {it.unit}</span>
                  <span>Value: {formatINR(Math.round(it.currentStock * it.costPerUnitPaise))}</span>
                </div>

                {/* Recipe Mapping link */}
                {it.recipeIngredients && it.recipeIngredients.length > 0 && (
                  <div className="text-[10px] text-[#16845B] bg-[#E8F5EE] px-2 py-1 rounded-md font-semibold truncate">
                    Linked in: {it.recipeIngredients.map((r) => r.recipe?.menuItem?.name).filter(Boolean).join(", ")}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setAdjustItem(it);
                      setAdjustAction("RESTOCK");
                    }}
                    className="flex-1 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Restock
                  </button>

                  <button
                    onClick={() => {
                      setAdjustItem(it);
                      setAdjustAction("WASTE");
                    }}
                    className="rounded-xl border border-[#E5EBE7] bg-white hover:bg-red-50 hover:text-red-700 text-[#718078] px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer"
                    title="Log Waste / Spoilage"
                  >
                    Waste
                  </button>

                  <button
                    onClick={() => handleDeleteItem(it.id, it.name)}
                    className="rounded-xl border border-[#E5EBE7] bg-white hover:bg-red-50 hover:text-red-700 text-[#718078] p-1.5 text-xs transition shadow-2xs cursor-pointer"
                    title="Delete Ingredient"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Movement Audit Log */}
      <Card className="bg-white border-[#E5EBE7] shadow-sm">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
            <History className="h-4 w-4 text-[#16845B]" />
            Recent Stock Movement Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-[#E5EBE7]">
          {movements.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#718078]">No movements recorded yet.</div>
          ) : (
            movements.slice(0, 15).map((m) => {
              const matchedItem = items.find((i) => i.id === m.inventoryItemId);
              return (
                <div key={m.id} className="p-3.5 sm:px-6 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`p-1.5 rounded-lg border font-bold text-[10px] ${
                        m.type === "PURCHASE"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : m.type === "SALE_DEDUCTION"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : m.type === "WASTE"
                          ? "bg-red-50 text-red-800 border-red-200"
                          : "bg-purple-50 text-purple-800 border-purple-200"
                      }`}
                    >
                      {m.type}
                    </span>
                    <div>
                      <span className="font-bold text-[#172B25]">
                        {matchedItem ? matchedItem.name : "Ingredient"}:{" "}
                      </span>
                      <span className="font-black text-[#172B25]">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {matchedItem?.unit || ""}
                      </span>
                      <div className="text-[11px] text-[#718078] mt-0.5">{m.reference || "System automatic event"}</div>
                    </div>
                  </div>

                  <span className="text-[11px] text-[#718078] shrink-0">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Add Material Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25] flex items-center gap-2">
                <Boxes className="h-4 w-4 text-[#16845B]" />
                Add Raw Material
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Ingredient Name *</Label>
                <Input
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Belgian Waffle Batter / Milk / Coffee Beans"
                  required
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Unit of Measure *</Label>
                  <select
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 text-xs text-[#172B25] font-semibold focus:border-[#16845B] focus:outline-none"
                  >
                    <option value="KG">Kilograms (KG)</option>
                    <option value="G">Grams (G)</option>
                    <option value="LTR">Liters (LTR)</option>
                    <option value="ML">Milliliters (ML)</option>
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="BOX">Boxes (BOX)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Current Stock *</Label>
                  <Input
                    type="number"
                    step="any"
                    value={addForm.currentStock}
                    onChange={(e) => setAddForm({ ...addForm, currentStock: e.target.value })}
                    placeholder="e.g. 50"
                    required
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Low Alert Threshold *</Label>
                  <Input
                    type="number"
                    step="any"
                    value={addForm.lowStockThreshold}
                    onChange={(e) => setAddForm({ ...addForm, lowStockThreshold: e.target.value })}
                    placeholder="e.g. 5"
                    required
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Cost per Unit (₹)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={addForm.costPerUnitRupees}
                    onChange={(e) => setAddForm({ ...addForm, costPerUnitRupees: e.target.value })}
                    placeholder="e.g. 60"
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 rounded-full border-[#E5EBE7] text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Add Ingredient
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25]">
                Adjust Stock: {adjustItem.name}
              </h3>
              <button
                onClick={() => setAdjustItem(null)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3.5">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Action Type</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {(["RESTOCK", "WASTE", "ADJUST"] as const).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setAdjustAction(act)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        adjustAction === act
                          ? "bg-[#16845B] text-white border-[#16845B]"
                          : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078]"
                      }`}
                    >
                      {act === "RESTOCK" ? "Restock +" : act === "WASTE" ? "Waste -" : "Audit ="}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">
                  {adjustAction === "ADJUST"
                    ? `Set Exact Current Stock (${adjustItem.unit})`
                    : `Quantity to ${adjustAction === "RESTOCK" ? "Add" : "Deduct"} (${adjustItem.unit})`}
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder={`e.g. 10 ${adjustItem.unit}`}
                  required
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
                <span className="text-[10px] text-[#718078] mt-1 block">
                  Current on-hand: {adjustItem.currentStock} {adjustItem.unit}
                </span>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Reference / Notes</Label>
                <Input
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Vendor delivery PO-102 or Kitchen spill"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustItem(null)}
                  className="flex-1 rounded-full border-[#E5EBE7] text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingAdjust}
                  className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {savingAdjust ? "Updating..." : "Save Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
