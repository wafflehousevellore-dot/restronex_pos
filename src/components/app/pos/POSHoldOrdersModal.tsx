"use client";

import * as React from "react";
import { X, Play, Trash2, Clock, Inbox, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/money";
import { POSCartItem } from "../POSClient";
import { cn } from "@/lib/utils";

export interface HeldOrder {
  id: string;
  label: string;
  cart: POSCartItem[];
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  heldAt: string;
  totalPaise: number;
}

export interface POSHoldOrdersModalProps {
  open: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResumeOrder: (order: HeldOrder) => void;
  onDeleteOrder: (orderId: string) => void;
}

export function POSHoldOrdersModal({
  open,
  onClose,
  heldOrders,
  onResumeOrder,
  onDeleteOrder,
}: POSHoldOrdersModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-xl rounded-3xl border border-[#E5EBE7] bg-white shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E5EBE7] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B25]">Held Orders Queue</h2>
              <div className="text-xs text-[#718078]">
                {heldOrders.length} order{heldOrders.length === 1 ? "" : "s"} parked
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

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
          {heldOrders.length === 0 ? (
            <div className="py-12 text-center text-[#718078] flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-[#F0F4F2] flex items-center justify-center text-[#718078] mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-[#172B25]">No held orders</div>
              <div className="text-xs mt-1 max-w-xs">
                Click &quot;Hold Order&quot; in the cart to park a customer&apos;s bill and resume it at any time.
              </div>
            </div>
          ) : (
            heldOrders.map((ho) => {
              const itemCount = ho.cart.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={ho.id}
                  className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9]/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#16845B]/40 transition shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#172B25]">{ho.label}</span>
                      <span className="rounded-full bg-[#E8F5EE] text-[#16845B] text-[10px] font-bold px-2 py-0.5 border border-[#16845B]/20">
                        {ho.orderType.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-xs text-[#718078]">
                      {itemCount} items ({ho.cart.map((i) => i.name).slice(0, 3).join(", ")}
                      {ho.cart.length > 3 ? "..." : ""})
                    </div>

                    <div className="text-[11px] text-[#A0ACA5] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Held at {ho.heldAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5EBE7]">
                    <div className="font-black text-base text-[#16845B]">
                      {formatINR(ho.totalPaise)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDeleteOrder(ho.id)}
                        className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition"
                        title="Discard held order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onResumeOrder(ho);
                          onClose();
                        }}
                        className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white px-3.5 py-2 text-xs font-bold shadow-xs transition flex items-center gap-1"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
