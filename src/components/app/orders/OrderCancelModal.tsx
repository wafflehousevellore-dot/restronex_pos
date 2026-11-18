"use client";

import React, { useState } from "react";
import { OrderRecord } from "./OrderTable";
import { AlertTriangle, X, Ban } from "lucide-react";

interface OrderCancelModalProps {
  order: OrderRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => Promise<void>;
}

const COMMON_REASONS = [
  "Customer requested cancellation",
  "Item out of stock / ingredient unavailable",
  "Kitchen overloaded / high wait time",
  "Duplicate order created by mistake",
  "Customer unreachable / rejected delivery",
  "Payment failed or declined",
  "Other reason",
];

export function OrderCancelModal({
  order,
  isOpen,
  onClose,
  onConfirmCancel,
}: OrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === "Other reason" ? customReason.trim() : selectedReason;
    if (!finalReason) return;

    setIsSubmitting(true);
    try {
      await onConfirmCancel(order.id, finalReason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-black text-sm">Cancel Order #{order.orderNumber}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-900 space-y-1">
            <span className="font-bold block">Important Notice:</span>
            <p>
              Cancelling this order will mark it as <strong>CANCELLED</strong> in audit history.
              Any recipe inventory deductions will be automatically restored, and assigned dining
              tables will be set back to <strong>AVAILABLE</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-1.5">
              {COMMON_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                    selectedReason === reason
                      ? "border-rose-400 bg-rose-50/50 text-rose-900 font-semibold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-rose-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === "Other reason" && (
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Specify Reason Details <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Explain why this order is being cancelled..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (selectedReason === "Other reason" && !customReason.trim())}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
