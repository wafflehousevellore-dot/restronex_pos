"use client";

import React, { useState } from "react";
import { 
  X, 
  SlidersHorizontal, 
  Check, 
  AlertCircle, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle 
} from "lucide-react";

interface StockAdjustmentModalProps {
  initialItem: any | null;
  allItems: any[];
  initialAction?: "RESTOCK" | "WASTE" | "DAMAGE" | "EXPIRY" | "ADJUST";
  onClose: () => void;
  onSave: (payload: {
    itemId: string;
    action: "RESTOCK" | "WASTE" | "DAMAGE" | "EXPIRY" | "ADJUST";
    quantity: number;
    notes: string;
  }) => Promise<boolean>;
}

export function StockAdjustmentModal({
  initialItem,
  allItems,
  initialAction = "RESTOCK",
  onClose,
  onSave,
}: StockAdjustmentModalProps) {
  const [selectedItemId, setSelectedItemId] = useState(
    initialItem?.id || allItems[0]?.id || ""
  );
  const [action, setAction] = useState<"RESTOCK" | "WASTE" | "DAMAGE" | "EXPIRY" | "ADJUST">(
    initialAction
  );
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = allItems.find((i) => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError("Please select an inventory ingredient.");
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError("Please specify a valid adjustment quantity.");
      return;
    }
    if (!notes.trim()) {
      setError("Reason / reference notes are required for audit trail.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ok = await onSave({
        itemId: selectedItemId,
        action,
        quantity: qtyNum,
        notes: notes.trim(),
      });
      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || "Adjustment failed.");
    } finally {
      setLoading(false);
    }
  };

  const actionOptions = [
    { id: "RESTOCK", label: "Inward Restock (+)", desc: "Add stock received from supplier" },
    { id: "WASTE", label: "Kitchen Wastage (-)", desc: "Record preparation spoilage" },
    { id: "DAMAGE", label: "Damaged Stock (-)", desc: "Broken, spilled or compromised" },
    { id: "EXPIRY", label: "Expired Stock (-)", desc: "Materials passed expiration date" },
    { id: "ADJUST", label: "Physical Count (=)", desc: "Set exact stock from audit count" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">Record Stock Adjustment</h3>
              <p className="text-xs text-[#718078]">Update inventory with immutable audit movement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-[#718078] cursor-pointer"
          >
            <X className="h-4 w-4" />
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

          {/* Action Type */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">Adjustment Reason / Type</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
            >
              {actionOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Material Select */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">Select Raw Material</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
            >
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Current: {item.currentStock} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Snapshot */}
          {selectedItem && (
            <div className="bg-[#F4F6F5] p-3 rounded-2xl border border-[#E5EBE7] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#718078]">Current In-Stock</span>
                <div className="text-sm font-black text-[#172B25]">
                  {selectedItem.currentStock} {selectedItem.unit}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#718078]">Unit Cost</span>
                <div className="text-sm font-black text-[#16845B]">
                  ₹{(selectedItem.costPerUnitPaise / 100).toFixed(2)} / {selectedItem.unit}
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">
              {action === "ADJUST" ? "New Exact Stock Count" : "Quantity to Adjust"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="flex-1 px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25]"
                required
              />
              <span className="text-xs font-black text-[#718078] px-2">
                {selectedItem?.unit || "Units"}
              </span>
            </div>
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">
              Mandatory Reason / Audit Notes <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken packaging during morning prep, or weekly count"
              className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
              required
            />
          </div>

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
              {loading ? "Recording..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
