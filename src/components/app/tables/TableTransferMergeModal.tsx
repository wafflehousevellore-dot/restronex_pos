"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { 
  X, 
  ArrowRightLeft, 
  GitMerge, 
  AlertCircle, 
  Check, 
  Utensils 
} from "lucide-react";

interface TableTransferMergeModalProps {
  sourceTable: any | null;
  allTables: any[];
  onClose: () => void;
  onExecute: (mode: "MOVE" | "MERGE", targetTableId: string) => Promise<boolean>;
}

export function TableTransferMergeModal({
  sourceTable,
  allTables,
  onClose,
  onExecute,
}: TableTransferMergeModalProps) {
  const [mode, setMode] = useState<"MOVE" | "MERGE">("MOVE");
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sourceTable) return null;

  // Filter valid target tables:
  // For MOVE: prefer AVAILABLE or CLEANING tables (not sourceTable itself)
  // For MERGE: other OCCUPIED or AVAILABLE tables
  const availableTargetTables = allTables.filter((t) => t.id !== sourceTable.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) {
      setError("Please select a destination table.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ok = await onExecute(mode, targetTableId);
      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Operation failed.");
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
            <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
              {mode === "MOVE" ? <ArrowRightLeft className="h-5 w-5" /> : <GitMerge className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">
                {mode === "MOVE" ? "Shift Table Order" : "Merge Tables"}
              </h3>
              <p className="text-xs text-[#718078]">
                From Table {sourceTable.number} ({sourceTable.area || "Main Hall"})
              </p>
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

        {/* Mode Selector */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode("MOVE");
                setTargetTableId("");
              }}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "MOVE"
                  ? "bg-white text-[#172B25] shadow-xs"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Shift Order</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("MERGE");
                setTargetTableId("");
              }}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "MERGE"
                  ? "bg-white text-[#172B25] shadow-xs"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span>Merge with Table</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Table Summary */}
          <div className="bg-[#F4F6F5] p-3 rounded-2xl border border-[#E5EBE7] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#718078] uppercase">Current Table</span>
              <div className="text-sm font-bold text-[#172B25]">Table {sourceTable.number}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-[#718078] uppercase">Current Bill</span>
              <div className="text-sm font-black text-[#16845B]">
                {formatINR(sourceTable.orderTotalPaise || sourceTable.activeOrder?.totalAmountPaise || 0)}
              </div>
            </div>
          </div>

          {/* Destination Table Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#172B25]">
              Select Destination Table <span className="text-red-500">*</span>
            </label>
            <select
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              required
            >
              <option value="">-- Choose destination table --</option>
              {availableTargetTables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.number} ({t.area || "Main Hall"} • {t.capacity} seats) - [{t.status}]
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#718078]">
              {mode === "MOVE"
                ? "All active items and running bill will be moved to the selected destination table."
                : "Active items will be merged into the destination table's bill, and this table will be freed up."}
            </p>
          </div>

          {/* Action Buttons */}
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
              disabled={loading || !targetTableId}
              className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>Executing...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{mode === "MOVE" ? "Confirm Shift" : "Confirm Merge"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
