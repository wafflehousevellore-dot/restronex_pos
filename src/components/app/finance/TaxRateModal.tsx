"use client";

import React, { useState } from "react";
import { X, Percent, Check } from "lucide-react";

interface TaxRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaxRateModal({ isOpen, onClose, onSuccess }: TaxRateModalProps) {
  const [name, setName] = useState("");
  const [ratePct, setRatePct] = useState("5.0");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Tax rate name is required (e.g. GST 5% or Beverages 12%).");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const rateBps = Math.round(parseFloat(ratePct || "0") * 100);

    try {
      const res = await fetch("/api/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          rateBps,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save tax rate.");
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-[#16845B]" />
            <h2 className="text-base font-bold text-[#172B25]">Configure Tax Rate</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              Tax Rate Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Standard Restaurant GST (5%)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-[#172B25] outline-none focus:border-[#16845B]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              Tax Percentage (%) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="5.0"
              value={ratePct}
              onChange={(e) => setRatePct(e.target.value)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-mono text-xs text-[#172B25] outline-none focus:border-[#16845B]"
            />
            <span className="text-[10px] text-[#718078]">
              Standard restaurant rate is 5% (split as 2.5% CGST + 2.5% SGST)
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? "Saving..." : "Save Tax Rate"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
