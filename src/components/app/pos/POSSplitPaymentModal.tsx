"use client";

import * as React from "react";
import { X, Banknote, QrCode, CreditCard, Check, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface SplitPaymentResult {
  cashPaise: number;
  upiPaise: number;
  cardPaise: number;
}

export interface POSSplitPaymentModalProps {
  open: boolean;
  onClose: () => void;
  totalPaise: number;
  onConfirmSplit: (split: SplitPaymentResult) => void;
}

export function POSSplitPaymentModal({
  open,
  onClose,
  totalPaise,
  onConfirmSplit,
}: POSSplitPaymentModalProps) {
  const [cashAmount, setCashAmount] = React.useState<number>(0);
  const [upiAmount, setUpiAmount] = React.useState<number>(0);
  const [cardAmount, setCardAmount] = React.useState<number>(0);

  React.useEffect(() => {
    if (open) {
      // Default: 50% Cash, 50% UPI
      const halfRupees = Math.floor(totalPaise / 200);
      setCashAmount(halfRupees);
      setUpiAmount(Math.round((totalPaise - halfRupees * 100) / 100));
      setCardAmount(0);
    }
  }, [open, totalPaise]);

  if (!open) return null;

  const totalPaidPaise = (cashAmount + upiAmount + cardAmount) * 100;
  const remainingPaise = totalPaise - totalPaidPaise;
  const isExact = remainingPaise === 0;

  const handleFillRemaining = (method: "cash" | "upi" | "card") => {
    const currentOthers =
      method === "cash"
        ? (upiAmount + cardAmount) * 100
        : method === "upi"
        ? (cashAmount + cardAmount) * 100
        : (cashAmount + upiAmount) * 100;

    const remainingForMethod = Math.max(0, Math.round((totalPaise - currentOthers) / 100));

    if (method === "cash") setCashAmount(remainingForMethod);
    else if (method === "upi") setUpiAmount(remainingForMethod);
    else if (method === "card") setCardAmount(remainingForMethod);
  };

  const handleConfirm = () => {
    if (!isExact) return;
    onConfirmSplit({
      cashPaise: cashAmount * 100,
      upiPaise: upiAmount * 100,
      cardPaise: cardAmount * 100,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-md rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-2xl flex flex-col space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7]">
          <div>
            <h2 className="text-base font-bold text-[#172B25]">Split Bill Payment</h2>
            <div className="text-xs text-[#718078]">
              Total Payable: <span className="font-bold text-[#16845B]">{formatINR(totalPaise)}</span>
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

        {/* Inputs */}
        <div className="space-y-3.5">
          {/* Cash */}
          <div className="rounded-2xl border border-[#E5EBE7] p-3.5 bg-[#F8FAF9]/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-600" />
                <span>Cash Portion (₹)</span>
              </span>
              <button
                type="button"
                onClick={() => handleFillRemaining("cash")}
                className="text-[11px] font-bold text-[#16845B] hover:underline"
              >
                Fill Remaining
              </button>
            </div>
            <input
              type="number"
              min="0"
              value={cashAmount || ""}
              onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 font-bold text-base text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          {/* UPI */}
          <div className="rounded-2xl border border-[#E5EBE7] p-3.5 bg-[#F8FAF9]/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-purple-600" />
                <span>UPI / QR Portion (₹)</span>
              </span>
              <button
                type="button"
                onClick={() => handleFillRemaining("upi")}
                className="text-[11px] font-bold text-[#16845B] hover:underline"
              >
                Fill Remaining
              </button>
            </div>
            <input
              type="number"
              min="0"
              value={upiAmount || ""}
              onChange={(e) => setUpiAmount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 font-bold text-base text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-[#E5EBE7] p-3.5 bg-[#F8FAF9]/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span>Card Swipe Portion (₹)</span>
              </span>
              <button
                type="button"
                onClick={() => handleFillRemaining("card")}
                className="text-[11px] font-bold text-[#16845B] hover:underline"
              >
                Fill Remaining
              </button>
            </div>
            <input
              type="number"
              min="0"
              value={cardAmount || ""}
              onChange={(e) => setCardAmount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 font-bold text-base text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>
        </div>

        {/* Balance Remaining Bar */}
        <div
          className={cn(
            "p-3 rounded-2xl border flex items-center justify-between text-xs font-bold",
            isExact
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : remainingPaise > 0
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-red-50 border-red-200 text-red-700"
          )}
        >
          <span>{isExact ? "✓ Split Exact" : remainingPaise > 0 ? "Remaining Balance" : "Overpaid Amount"}</span>
          <span className="text-sm font-black">{formatINR(Math.abs(remainingPaise))}</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5EBE7]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isExact}
            onClick={handleConfirm}
            className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2 text-xs font-bold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Split & Pay
          </button>
        </div>
      </div>
    </div>
  );
}
