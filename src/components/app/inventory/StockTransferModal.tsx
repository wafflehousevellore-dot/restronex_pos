"use client";

import React, { useState } from "react";
import { 
  X, 
  ArrowRightLeft, 
  Check, 
  AlertCircle 
} from "lucide-react";

interface StockTransferModalProps {
  outlets: any[];
  currentOutletId: string;
  allItems: any[];
  onClose: () => void;
  onSave: (payload: {
    itemId: string;
    outletId: string;
    targetOutletId: string;
    quantity: number;
    notes: string;
  }) => Promise<boolean>;
}

export function StockTransferModal({
  outlets,
  currentOutletId,
  allItems,
  onClose,
  onSave,
}: StockTransferModalProps) {
  const [sourceOutletId, setSourceOutletId] = useState(
    currentOutletId || outlets[0]?.id || ""
  );
  const [targetOutletId, setTargetOutletId] = useState(
    outlets.find((o) => o.id !== sourceOutletId)?.id || ""
  );
  const [selectedItemId, setSelectedItemId] = useState(allItems[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = allItems.find((i) => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceOutletId || !targetOutletId) {
      setError("Please select both source and destination outlets.");
      return;
    }
    if (sourceOutletId === targetOutletId) {
      setError("Source and destination outlets must be different.");
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("Please specify a valid transfer quantity.");
      return;
    }
    if (selectedItem && selectedItem.currentStock < qty) {
      setError(`Insufficient stock. Available: ${selectedItem.currentStock} ${selectedItem.unit}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ok = await onSave({
        itemId: selectedItemId,
        outletId: sourceOutletId,
        targetOutletId,
        quantity: qty,
        notes: notes.trim(),
      });
      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || "Transfer failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">Inter-Branch Stock Transfer</h3>
              <p className="text-xs text-[#718078]">Transfer raw materials between outlet locations</p>
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

          {/* Outlets Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">From Outlet</label>
              <select
                value={sourceOutletId}
                onChange={(e) => setSourceOutletId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">To Outlet</label>
              <select
                value={targetOutletId}
                onChange={(e) => setTargetOutletId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Material Select */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">Raw Material to Transfer</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
            >
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.currentStock} {item.unit} available)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">Transfer Quantity</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0.1"
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

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">Transfer Reason / Dispatch Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Replenishing weekend stock for rooftop kitchen"
              className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
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
              {loading ? "Processing..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
