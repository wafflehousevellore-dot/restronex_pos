"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatINR } from "@/lib/money";
import { 
  UtensilsCrossed, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Percent, 
  X, 
  Check 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface RecipeManagerProps {
  inventoryItems: any[];
}

export function RecipeManager({ inventoryItems }: RecipeManagerProps) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "CONFIGURED" | "MISSING">("ALL");

  // Recipe Editor Drawer/Modal state
  const [editingMenuItem, setEditingMenuItem] = useState<any | null>(null);
  const [yieldQty, setYieldQty] = useState<string>("1");
  const [ingredientRows, setIngredientRows] = useState<{ inventoryItemId: string; quantity: string }[]>([]);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, mRes] = await Promise.all([
        apiFetch("/api/recipes").then((r) => r.json()).catch(() => []),
        apiFetch("/api/menu").then((r) => r.json()).catch(() => ({ products: [] })),
      ]);

      if (Array.isArray(rRes)) setRecipes(rRes);
      if (mRes && Array.isArray(mRes.products)) setMenuItems(mRes.products);
      else if (Array.isArray(mRes)) setMenuItems(mRes);
    } catch {
      setToast({ type: "error", text: "Failed to load recipe & menu data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map recipes by menuItemId
  const recipeMap = useMemo(() => {
    const map = new Map<string, any>();
    recipes.forEach((r) => {
      if (r.menuItemId) map.set(r.menuItemId, r);
    });
    return map;
  }, [recipes]);

  // Combine menu items with recipe status
  const combinedItems = useMemo(() => {
    return menuItems.map((item) => {
      const recipe = recipeMap.get(item.id);
      const hasRecipe = Boolean(recipe && recipe.ingredients?.length > 0);
      const recipeCostPaise = recipe?.recipeCostPaise || 0;
      const sellingPricePaise = item.pricePaise || 0;
      const foodCostPct = sellingPricePaise > 0 ? Math.round((recipeCostPaise / sellingPricePaise) * 100) : 0;
      const grossMarginPct = Math.max(0, 100 - foodCostPct);

      return {
        ...item,
        recipe,
        hasRecipe,
        recipeCostPaise,
        foodCostPct,
        grossMarginPct,
      };
    });
  }, [menuItems, recipeMap]);

  // Filtered
  const filteredDishes = useMemo(() => {
    return combinedItems.filter((dish) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (!dish.name.toLowerCase().includes(q) && !(dish.category?.name || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filter === "CONFIGURED") return dish.hasRecipe;
      if (filter === "MISSING") return !dish.hasRecipe;
      return true;
    });
  }, [combinedItems, search, filter]);

  // Open recipe editor
  const handleOpenEditor = (dish: any) => {
    setEditingMenuItem(dish);
    const existing = recipeMap.get(dish.id);
    if (existing && existing.ingredients?.length > 0) {
      setYieldQty(String(existing.yieldQty || "1"));
      setIngredientRows(
        existing.ingredients.map((ing: any) => ({
          inventoryItemId: ing.inventoryItemId,
          quantity: String(ing.quantity || "1"),
        }))
      );
    } else {
      setYieldQty("1");
      setIngredientRows([{ inventoryItemId: inventoryItems[0]?.id || "", quantity: "1" }]);
    }
  };

  // Add row
  const handleAddRow = () => {
    setIngredientRows((prev) => [
      ...prev,
      { inventoryItemId: inventoryItems[0]?.id || "", quantity: "1" },
    ]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    setIngredientRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update row
  const handleUpdateRow = (index: number, field: "inventoryItemId" | "quantity", value: string) => {
    setIngredientRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Real-time calculated cost in editor
  const calculatedEditorCostPaise = useMemo(() => {
    let sum = 0;
    const invMap = new Map(inventoryItems.map((i) => [i.id, i]));
    ingredientRows.forEach((row) => {
      const inv = invMap.get(row.inventoryItemId);
      if (inv) {
        const qty = parseFloat(row.quantity || "0") || 0;
        sum += Math.round(qty * inv.costPerUnitPaise);
      }
    });
    return sum;
  }, [ingredientRows, inventoryItems]);

  const editorFoodCostPct = editingMenuItem?.pricePaise > 0
    ? Math.round((calculatedEditorCostPaise / editingMenuItem.pricePaise) * 100)
    : 0;

  // Save recipe
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItem) return;

    setSavingRecipe(true);
    try {
      const validRows = ingredientRows
        .filter((r) => r.inventoryItemId && parseFloat(r.quantity) > 0)
        .map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: parseFloat(r.quantity),
        }));

      const res = await apiFetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: editingMenuItem.id,
          yieldQty: parseInt(yieldQty, 10) || 1,
          ingredients: validRows,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        setToast({ type: "error", text: j.error || "Failed to save recipe" });
      } else {
        setToast({ type: "success", text: `Recipe for ${editingMenuItem.name} updated` });
        setEditingMenuItem(null);
        loadData();
      }
    } catch {
      setToast({ type: "error", text: "Error saving recipe" });
    } finally {
      setSavingRecipe(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "All Dishes", count: combinedItems.length },
            { id: "CONFIGURED", label: "Recipe Configured", count: combinedItems.filter((i) => i.hasRecipe).length, color: "text-emerald-700 bg-emerald-50" },
            { id: "MISSING", label: "Recipe Missing", count: combinedItems.filter((i) => !i.hasRecipe).length, color: "text-amber-700 bg-amber-50" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFilter(st.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === st.id
                  ? "bg-[#172B25] text-white shadow-xs"
                  : "bg-gray-50 text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
              }`}
            >
              <span>{st.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filter === st.id ? "bg-white/20 text-white" : st.color || "bg-gray-200 text-gray-700"
                }`}
              >
                {st.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dish or category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] placeholder-[#718078] focus:outline-none focus:border-[#16845B]"
          />
        </div>
      </div>

      {/* Recipes Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-[#718078]">Loading recipes...</div>
      ) : filteredDishes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <UtensilsCrossed className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Dishes Found</h3>
          <p className="text-xs text-[#718078] mt-1">
            No dishes match your filter. Make sure products are added to your menu.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Menu Dish</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Recipe Ingredients (BOM)</th>
                  <th className="py-3 px-4">Food Cost</th>
                  <th className="py-3 px-4">Food Cost %</th>
                  <th className="py-3 px-4">Gross Margin</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {filteredDishes.map((dish) => {
                  const hasRecipe = dish.hasRecipe;
                  const ingredients = dish.recipe?.ingredients || [];
                  const costPct = dish.foodCostPct;

                  // Benchmark color
                  let costBadge = "bg-emerald-100 text-emerald-800";
                  if (costPct > 40) costBadge = "bg-rose-100 text-rose-800";
                  else if (costPct > 30) costBadge = "bg-amber-100 text-amber-800";

                  return (
                    <tr key={dish.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#172B25] text-sm">{dish.name}</div>
                        <div className="text-[11px] text-[#718078]">
                          {dish.category?.name || "General Menu"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-[#172B25]">
                          {formatINR(dish.pricePaise || 0)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {hasRecipe ? (
                          <div className="flex flex-wrap gap-1">
                            {ingredients.map((ing: any, idx: number) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded"
                              >
                                {ing.inventoryItem?.name || "Ingredient"}: {ing.quantity} {ing.inventoryItem?.unit || ""}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 italic font-semibold">
                            ⚠️ No recipe linked (Stock not deducted)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasRecipe ? (
                          <span className="font-black text-[#16845B]">
                            {formatINR(dish.recipeCostPaise)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasRecipe ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${costBadge}`}>
                            {costPct}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasRecipe ? (
                          <span className="font-extrabold text-[#172B25]">
                            {dish.grossMarginPct}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditor(dish)}
                          className="px-3 py-1.5 bg-[#172B25] hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>{hasRecipe ? "Edit Recipe" : "Build Recipe"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recipe Builder Modal */}
      {editingMenuItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#172B25]">
                    Recipe BOM: {editingMenuItem.name}
                  </h3>
                  <p className="text-xs text-[#718078]">
                    Selling Price: {formatINR(editingMenuItem.pricePaise || 0)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMenuItem(null)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-[#718078] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="p-5 space-y-4">
              {/* Cost Summary Banner */}
              <div className="bg-[#F4F6F5] p-3 rounded-2xl border border-[#E5EBE7] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718078]">Portion Cost</span>
                  <div className="text-base font-black text-[#16845B]">
                    {formatINR(calculatedEditorCostPaise)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#718078]">Food Cost %</span>
                  <div className={`text-base font-black ${editorFoodCostPct > 40 ? "text-rose-600" : "text-[#172B25]"}`}>
                    {editorFoodCostPct}%
                  </div>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#172B25]">Ingredients & Quantities</label>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-xs font-bold text-[#16845B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Ingredient</span>
                  </button>
                </div>

                {ingredientRows.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#718078] bg-gray-50 rounded-xl border border-dashed border-[#E5EBE7]">
                    Click "+ Add Ingredient" to link raw materials to this dish.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {ingredientRows.map((row, idx) => {
                      const selectedInv = inventoryItems.find((i) => i.id === row.inventoryItemId);

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-[#E5EBE7]"
                        >
                          {/* Material select */}
                          <select
                            value={row.inventoryItemId}
                            onChange={(e) => handleUpdateRow(idx, "inventoryItemId", e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-[#E5EBE7] rounded-lg text-xs font-semibold text-[#172B25]"
                          >
                            {inventoryItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} ({inv.unit} • {formatINR(inv.costPerUnitPaise || 0)}/{inv.unit})
                              </option>
                            ))}
                          </select>

                          {/* Quantity */}
                          <div className="flex items-center gap-1 w-28">
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              value={row.quantity}
                              onChange={(e) => handleUpdateRow(idx, "quantity", e.target.value)}
                              placeholder="Qty"
                              className="w-full px-2 py-1.5 bg-white border border-[#E5EBE7] rounded-lg text-xs font-bold text-[#172B25]"
                            />
                            <span className="text-xs font-bold text-[#718078]">
                              {selectedInv?.unit || ""}
                            </span>
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
                <button
                  type="button"
                  onClick={() => setEditingMenuItem(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecipe || ingredientRows.length === 0}
                  className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {savingRecipe ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Recipe</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
