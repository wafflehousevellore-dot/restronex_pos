"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  AlertTriangle,
  FolderTree,
  DollarSign,
  X,
  CheckCircle2,
  Percent,
} from "lucide-react";
import { CategoryData } from "./MenuCategorySidebar";

interface BulkOperationsBarProps {
  selectedCount: number;
  categories: CategoryData[];
  onMarkStock: (isSoldOut: boolean) => Promise<void>;
  onMarkActive: (isActive: boolean) => Promise<void>;
  onBulkCategory: (categoryId: string) => Promise<void>;
  onBulkPrice: (pct: number, flatPaise: number) => Promise<void>;
  onClearSelection: () => void;
}

export function BulkOperationsBar({
  selectedCount,
  categories,
  onMarkStock,
  onMarkActive,
  onBulkCategory,
  onBulkPrice,
  onClearSelection,
}: BulkOperationsBarProps) {
  const [selectedCatId, setSelectedCatId] = useState("");
  const [priceAdjustType, setPriceAdjustType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [priceAdjustValue, setPriceAdjustValue] = useState("");
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const handleApplyCategory = async () => {
    if (!selectedCatId) return;
    setIsProcessing(true);
    try {
      await onBulkCategory(selectedCatId);
      setSelectedCatId("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(priceAdjustValue);
    if (isNaN(val)) return;

    setIsProcessing(true);
    try {
      if (priceAdjustType === "PERCENT") {
        await onBulkPrice(val, 0);
      } else {
        await onBulkPrice(0, Math.round(val * 100)); // convert rupees to paise
      }
      setShowPriceModal(false);
      setPriceAdjustValue("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
          <CheckSquare className="w-4 h-4 text-[#16845B]" />
          <span className="text-xs font-bold whitespace-nowrap">
            {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
          </span>
        </div>

        {/* Quick Stock Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onMarkStock(false)}
            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            In-Stock
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onMarkStock(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Out-of-Stock
          </button>
        </div>

        {/* Category Reassign Dropdown */}
        <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-medium focus:outline-none"
          >
            <option value="">Move Category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedCatId && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyCategory}
              className="px-2 py-1 rounded bg-[#16845B] hover:bg-[#13734f] text-white text-xs font-bold transition"
            >
              Apply
            </button>
          )}
        </div>

        {/* Price Adjustment Trigger */}
        <button
          type="button"
          onClick={() => setShowPriceModal(true)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1"
        >
          <DollarSign className="w-3.5 h-3.5" />
          Adjust Prices
        </button>

        {/* Deselect All */}
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
          title="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Price Adjustment Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">
                Adjust Prices for {selectedCount} Products
              </span>
              <button
                type="button"
                onClick={() => setShowPriceModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyPrice} className="p-4 space-y-3 text-xs">
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setPriceAdjustType("PERCENT")}
                  className={`flex-1 py-1 font-bold rounded-md transition ${
                    priceAdjustType === "PERCENT"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceAdjustType("FLAT")}
                  className={`flex-1 py-1 font-bold rounded-md transition ${
                    priceAdjustType === "FLAT"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Flat Rupee (₹)
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {priceAdjustType === "PERCENT"
                    ? "Percentage Adjustment (e.g. +10 or -5)"
                    : "Rupee Adjustment (e.g. +20 or -15)"}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={priceAdjustType === "PERCENT" ? "10 for +10%" : "20 for +₹20"}
                  value={priceAdjustValue}
                  onChange={(e) => setPriceAdjustValue(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white font-bold"
                >
                  {isProcessing ? "Updating..." : "Update Prices"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
