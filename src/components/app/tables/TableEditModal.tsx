"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Utensils, 
  Users, 
  Check, 
  AlertCircle, 
  QrCode, 
  Layers 
} from "lucide-react";

interface TableEditModalProps {
  table: any | null; // null if creating
  areas: string[];
  outlets: any[];
  selectedOutlet: string;
  onClose: () => void;
  onSave: (tableData: {
    id?: string;
    outletId: string;
    number: string;
    area: string;
    capacity: number;
    waiterName?: string;
    qrOrderingEnabled?: boolean;
  }) => Promise<boolean>;
}

export function TableEditModal({
  table,
  areas,
  outlets,
  selectedOutlet,
  onClose,
  onSave,
}: TableEditModalProps) {
  const isEditing = Boolean(table);

  const [number, setNumber] = useState(table?.number || "");
  const [area, setArea] = useState(table?.area || (areas[0] && areas[0] !== "ALL" ? areas[0] : "Main Hall"));
  const [newAreaMode, setNewAreaMode] = useState(false);
  const [customArea, setCustomArea] = useState("");
  const [capacity, setCapacity] = useState(String(table?.capacity || 4));
  const [waiterName, setWaiterName] = useState(table?.waiterName || "");
  const [qrOrderingEnabled, setQrOrderingEnabled] = useState(
    table?.qrOrderingEnabled !== undefined ? table.qrOrderingEnabled : true
  );
  const [outletId, setOutletId] = useState(table?.outletId || selectedOutlet || outlets[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (table) {
      setNumber(table.number || "");
      setArea(table.area || "Main Hall");
      setCapacity(String(table.capacity || 4));
      setWaiterName(table.waiterName || "");
      setQrOrderingEnabled(table.qrOrderingEnabled !== false);
      setOutletId(table.outletId || selectedOutlet);
    }
  }, [table, selectedOutlet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) {
      setError("Table number is required (e.g. T-01, VIP-1)");
      return;
    }

    const finalArea = newAreaMode ? (customArea.trim() || "Main Hall") : area;
    const parsedCapacity = parseInt(capacity, 10);
    if (!parsedCapacity || parsedCapacity <= 0) {
      setError("Please specify a valid seating capacity.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const success = await onSave({
        id: table?.id,
        outletId,
        number: number.trim(),
        area: finalArea,
        capacity: parsedCapacity,
        waiterName: waiterName.trim() || undefined,
        qrOrderingEnabled,
      });

      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save table.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAreas = areas.filter((a) => a !== "ALL");

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
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">
                {isEditing ? `Edit Table ${table?.number}` : "Create New Dining Table"}
              </h3>
              <p className="text-xs text-[#718078]">
                Configure seating capacity, floor area and ordering settings
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Outlets selector (if multiple) */}
          {outlets.length > 1 && !isEditing && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">Restaurant Outlet</label>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} {o.city ? `(${o.city})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Table Number & Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">
                Table Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. T-01, VIP-1"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">
                Seating Capacity <span className="text-red-500">*</span>
              </label>
              <select
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((num) => (
                  <option key={num} value={num}>
                    {num} Guests / Seats
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dining Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#172B25]">Dining Area / Floor</label>
              <button
                type="button"
                onClick={() => setNewAreaMode(!newAreaMode)}
                className="text-[11px] text-[#16845B] hover:underline font-semibold cursor-pointer"
              >
                {newAreaMode ? "Choose Existing Area" : "+ Create New Area"}
              </button>
            </div>

            {newAreaMode ? (
              <input
                type="text"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Rooftop, Garden Patio, Private Dining"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              />
            ) : (
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              >
                {filteredAreas.length > 0 ? (
                  filteredAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Main Hall">Main Hall</option>
                    <option value="AC Dining">AC Dining</option>
                    <option value="Outdoor Patio">Outdoor Patio</option>
                    <option value="Rooftop">Rooftop</option>
                    <option value="Bar">Bar</option>
                  </>
                )}
              </select>
            )}
          </div>

          {/* Waiter / Captain */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">
              Assigned Waiter / Captain (Optional)
            </label>
            <input
              type="text"
              value={waiterName}
              onChange={(e) => setWaiterName(e.target.value)}
              placeholder="e.g. Ramesh, Priya"
              className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          {/* QR Ordering Toggle */}
          <div className="p-3 bg-[#F4F6F5] rounded-2xl border border-[#E5EBE7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[#16845B]" />
              <div>
                <div className="text-xs font-bold text-[#172B25]">Contactless QR Ordering</div>
                <div className="text-[11px] text-[#718078]">
                  Allow customers to scan table QR and view/order menu
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={qrOrderingEnabled}
              onChange={(e) => setQrOrderingEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#16845B] rounded cursor-pointer"
            />
          </div>

          {/* Submit Actions */}
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
              className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditing ? "Update Table" : "Create Table"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
