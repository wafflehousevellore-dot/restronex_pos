"use client";

import * as React from "react";
import { X, Plus, Minus, Check, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/money";
import { MenuItem, POSCartAddon } from "../POSClient";
import { cn } from "@/lib/utils";

export interface POSCustomiseModalProps {
  open: boolean;
  onClose: () => void;
  product: MenuItem | null;
  editingCartItemId?: string | null;
  initialQuantity?: number;
  initialSelections?: Record<string, string[]>;
  initialNotes?: string;
  onConfirm: (payload: {
    quantity: number;
    selectedAddons: POSCartAddon[];
    notes?: string;
  }) => void;
}

export function POSCustomiseModal({
  open,
  onClose,
  product,
  editingCartItemId,
  initialQuantity = 1,
  initialSelections = {},
  initialNotes = "",
  onConfirm,
}: POSCustomiseModalProps) {
  const [quantity, setQuantity] = React.useState(initialQuantity);
  const [selections, setSelections] = React.useState<Record<string, string[]>>(initialSelections);
  const [notes, setNotes] = React.useState(initialNotes);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setQuantity(initialQuantity || 1);
      setSelections(initialSelections || {});
      setNotes(initialNotes || "");
      setValidationError(null);
    }
  }, [open, initialQuantity, initialSelections, initialNotes]);

  if (!open || !product) return null;

  const addonLinks = product.addonLinks || [];

  // Toggle selection within a group
  const handleToggleOption = (groupId: string, optionId: string, selectionType: string, maxSelections?: number | null) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      if (selectionType === "SINGLE") {
        return { ...prev, [groupId]: [optionId] };
      }

      // MULTIPLE selection
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }

      if (maxSelections && current.length >= maxSelections) {
        return prev; // Reached max
      }

      return { ...prev, [groupId]: [...current, optionId] };
    });
    setValidationError(null);
  };

  // Calculate total price
  let addonsUnitPricePaise = 0;
  const flatSelectedAddons: POSCartAddon[] = [];

  addonLinks.forEach((link) => {
    const group = link.addonGroup;
    if (!group) return;
    const selectedIds = selections[group.id] || [];

    group.options.forEach((opt) => {
      if (selectedIds.includes(opt.id)) {
        addonsUnitPricePaise += opt.pricePaise;
        flatSelectedAddons.push({
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          name: opt.name,
          pricePaise: opt.pricePaise,
        });
      }
    });
  });

  const effectiveUnitPricePaise = product.pricePaise + addonsUnitPricePaise;
  const lineTotalPaise = effectiveUnitPricePaise * quantity;

  // Validation
  const handleValidateAndSubmit = () => {
    for (const link of addonLinks) {
      const group = link.addonGroup;
      if (!group) continue;
      const count = (selections[group.id] || []).length;

      if (group.isRequired && count < group.minSelections) {
        setValidationError(`Please select at least ${group.minSelections} option for "${group.name}".`);
        return;
      }
    }

    onConfirm({
      quantity,
      selectedAddons: flatSelectedAddons,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-lg rounded-3xl border border-[#E5EBE7] bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5EBE7] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-sm font-black text-[#16845B] shrink-0 overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                product.name.slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#172B25] truncate">{product.name}</h2>
              <div className="text-xs text-[#718078]">
                Base: <span className="font-bold text-[#172B25]">{formatINR(product.pricePaise)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Groups Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
          {validationError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {addonLinks.map((link) => {
            const group = link.addonGroup;
            if (!group) return null;
            const selectedIds = selections[group.id] || [];
            const isSingle = group.selectionType === "SINGLE";

            return (
              <div key={group.id} className="rounded-2xl border border-[#E5EBE7] p-3.5 bg-[#F8FAF9]/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-[#172B25]">
                    {group.name}
                    {group.isRequired ? (
                      <span className="ml-1.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 border border-red-200">
                        Required ({isSingle ? "Choose 1" : `Min ${group.minSelections}`})
                      </span>
                    ) : (
                      <span className="ml-1.5 text-[10px] text-[#718078] font-normal">
                        Optional {group.maxSelections ? `(Max ${group.maxSelections})` : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#718078]">
                    {selectedIds.length} selected
                  </span>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedIds.includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleToggleOption(group.id, opt.id, group.selectionType, group.maxSelections)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-left transition select-none cursor-pointer",
                          isSelected
                            ? "bg-[#E8F5EE] border-[#16845B] text-[#16845B] font-bold shadow-2xs"
                            : "bg-white border-[#E5EBE7] text-[#172B25] hover:bg-[#F8FAF9]"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <div
                            className={cn(
                              "h-4 w-4 flex items-center justify-center border transition shrink-0",
                              isSingle ? "rounded-full" : "rounded-md",
                              isSelected
                                ? "bg-[#16845B] border-[#16845B] text-white"
                                : "border-[#A0ACA5] bg-white"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="text-xs truncate">{opt.name}</span>
                        </div>

                        <span className="text-xs shrink-0 font-semibold">
                          {opt.pricePaise > 0 ? `+${formatINR(opt.pricePaise)}` : "Free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Cooking Instructions / Line Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#172B25] uppercase tracking-wider">
              Cooking Instructions / Line Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Less spicy, Extra crispy, No onion..."
              className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs text-[#172B25] placeholder-[#A0ACA5] focus:outline-none focus:border-[#16845B]"
            />
          </div>
        </div>

        {/* Footer with Quantity & Price Total */}
        <div className="p-4 sm:p-5 border-t border-[#E5EBE7] bg-[#F8FAF9] flex items-center justify-between gap-3 shrink-0">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-white border border-[#E5EBE7] rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-lg bg-[#F8FAF9] hover:bg-[#E5EBE7] flex items-center justify-center text-[#172B25] transition"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="font-bold text-sm w-7 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-8 w-8 rounded-lg bg-[#F8FAF9] hover:bg-[#E5EBE7] flex items-center justify-center text-[#172B25] transition"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleValidateAndSubmit}
            className="flex-1 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 px-4 text-xs font-bold shadow-xs hover:shadow-sm transition flex items-center justify-between"
          >
            <span>{editingCartItemId ? "Update Order Item" : "Add to Current Order"}</span>
            <span className="font-black text-sm">{formatINR(lineTotalPaise)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
