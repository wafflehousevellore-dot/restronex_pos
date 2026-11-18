"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Boxes, 
  Check, 
  AlertCircle 
} from "lucide-react";
import { toPaise } from "@/lib/money";

interface IngredientModalProps {
  item: any | null; // null if creating
  suppliers: any[];
  onClose: () => void;
  onSave: (data: {
    id?: string;
    name: string;
    unit: string;
    currentStock: number;
    lowStockThreshold: number;
    costPerUnitPaise: number;
    supplierId?: string;
  }) => Promise<boolean>;
}

export function IngredientModal({
  item,
  suppliers,
  onClose,
  onSave,
}: IngredientModalProps) {
  const isEditing = Boolean(item);

  const [name, setName] = useState(item?.name || "");
  const [unit, setUnit] = useState(item?.unit || "KG");
  const [currentStock, setCurrentStock] = useState(String(item?.currentStock || "0"));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(item?.lowStockThreshold || "5"));
  const [costRupees, setCostRupees] = useState(item?.costPerUnitPaise ? String(item.costPerUnitPaise / 100) : "0");
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setUnit(item.unit || "KG");
      setCurrentStock(String(item.currentStock || "0"));
      setLowStockThreshold(String(item.lowStockThreshold || "5"));
      setCostRupees(item.costPerUnitPaise ? String(item.costPerUnitPaise / 100) : "0");
      setSupplierId(item.lowestSupplierPrice?.supplierId || "");
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ingredient name is required");
      return;
    }

    const stockNum = parseFloat(currentStock);
    const thresholdNum = parseFloat(lowStockThreshold);
    const costPaise = toPaise(parseFloat(costRupees || "0"));

    if (isNaN(stockNum) || stockNum < 0) {
      setError("Please specify a valid stock quantity");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const ok = await onSave({
        id: item?.id,
        name: name.trim(),
        unit: unit.toUpperCase(),
        currentStock: stockNum,
        lowStockThreshold: isNaN(thresholdNum) ? 5 : thresholdNum,
        costPerUnitPaise: costPaise,
        supplierId: supplierId || undefined,
      });

      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save ingredient");
    } finally {
      setLoading(false);
    }
  };

  const unitsList = ["KG", "G", "L", "ML", "PCS", "PKT", "BOX", "CAN"];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">
                {isEditing ? `Edit ${item?.name}` : "New Raw Ingredient"}
              </h3>
              <p className="text-xs text-[#718078]">Stock material configuration & unit cost</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-[#718078] hover:text-[#172B25] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">
              Ingredient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basmati Rice, Milk, Red Velvet Mix, Butter"
              className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              required
            />
          </div>

          {/* Unit & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">Unit of Measure</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              >
                {unitsList.map((u) => (
                  <option key={u} value={u}>
                    {u} ({u === "KG" ? "Kilogram" : u === "G" ? "Gram" : u === "L" ? "Litre" : u === "ML" ? "Millilitre" : u})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">
                Cost Per Unit (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costRupees}
                onChange={(e) => setCostRupees(e.target.value)}
                placeholder="e.g. 120.00"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              />
            </div>
          </div>

          {/* Current Stock & Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">
                Current Stock ({unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">
                Reorder Threshold ({unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              />
            </div>
          </div>

          {/* Supplier Link */}
          {suppliers.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">Preferred Vendor / Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              >
                <option value="">-- No vendor assigned --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditing ? "Update Ingredient" : "Create Ingredient"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
