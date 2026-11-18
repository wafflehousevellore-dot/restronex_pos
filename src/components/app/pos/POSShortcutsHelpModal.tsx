"use client";

import * as React from "react";
import { X, Keyboard } from "lucide-react";

export interface POSShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function POSShortcutsHelpModal({ open, onClose }: POSShortcutsHelpModalProps) {
  if (!open) return null;

  const shortcuts = [
    { key: "F1 or /", desc: "Focus Product Search input" },
    { key: "F2", desc: "Cycle Order Type (Dine-in / Takeaway / Delivery)" },
    { key: "F4", desc: "Hold Current Bill to queue" },
    { key: "F8", desc: "Open Discount & Coupon dialog" },
    { key: "F9", desc: "Quick Cash Checkout" },
    { key: "F10", desc: "Quick UPI QR Checkout" },
    { key: "Esc", desc: "Close any open dialog or clear search" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-md rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7]">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#E8F5EE] text-[#16845B] flex items-center justify-center">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B25]">POS Keyboard Shortcuts</h2>
              <div className="text-xs text-[#718078]">Fast cashier operations</div>
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

        <div className="divide-y divide-[#E5EBE7]">
          {shortcuts.map((s) => (
            <div key={s.key} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-[#718078] font-medium">{s.desc}</span>
              <kbd className="font-mono text-xs font-bold bg-[#F8FAF9] border border-[#E5EBE7] px-2 py-1 rounded-lg text-[#172B25]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-[11px] text-[#A0ACA5]">
          Shortcuts are active when not typing inside text inputs.
        </div>
      </div>
    </div>
  );
}
