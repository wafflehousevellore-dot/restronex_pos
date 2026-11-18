"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { 
  X, 
  Clock, 
  Users, 
  Utensils, 
  Printer, 
  ArrowRightLeft, 
  Receipt, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

interface TableOrderDrawerProps {
  table: any | null;
  onClose: () => void;
  onOpenShiftModal: (table: any) => void;
  onCloseTable: (tableId: string) => Promise<void>;
  onPrintThermal: (type: "BILL" | "KOT", table: any) => void;
}

export function TableOrderDrawer({
  table,
  onClose,
  onOpenShiftModal,
  onCloseTable,
  onPrintThermal,
}: TableOrderDrawerProps) {
  const [closing, setClosing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!table) return null;

  const order = table.activeOrder;
  const items = order?.items || [];
  const totalAmountPaise = table.orderTotalPaise || order?.totalAmountPaise || 0;
  
  // Elapsed time calculation
  const getElapsedMinutes = (dateStr?: string | Date) => {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60)));
  };

  const elapsedMins = getElapsedMinutes(order?.createdAt);

  const handleClearTable = async () => {
    setClosing(true);
    try {
      await onCloseTable(table.id);
      onClose();
    } finally {
      setClosing(false);
      setConfirmClear(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5EBE7] bg-[#F4F6F5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-[#172B25]">{table.number}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#16845B] text-white">
                {table.area || "Main Hall"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 text-[#718078] hover:text-[#172B25] transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-[#718078]">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{table.capacity || 4} Seats</span>
            </span>
            {table.waiterName && (
              <span className="font-semibold text-[#172B25]">
                Waiter: {table.waiterName}
              </span>
            )}
            {order && (
              <span className="flex items-center gap-1 text-blue-600 font-semibold">
                <Clock className="h-3.5 w-3.5" />
                <span>{elapsedMins} mins dining</span>
              </span>
            )}
          </div>
        </div>

        {/* Middle: Order Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {order ? (
            <>
              {/* Order Meta Card */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-[#E5EBE7] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#172B25]">
                    Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                  </div>
                  <div className="text-[11px] text-[#718078]">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {order.customerName && ` • ${order.customerName}`}
                  </div>
                </div>
                <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  {order.status || "OPEN"}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#718078]">
                  Running Order Items ({items.length})
                </h4>

                {items.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#718078]">
                    No items placed yet on this table.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item: any, idx: number) => (
                      <div
                        key={item.id || idx}
                        className="bg-white rounded-xl p-3 border border-[#E5EBE7] flex items-start justify-between shadow-2xs"
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[#16845B]">
                              {item.quantity}x
                            </span>
                            <span className="text-xs font-bold text-[#172B25]">
                              {item.name || item.product?.name || "Dish"}
                            </span>
                          </div>

                          {/* Addons / Modifiers */}
                          {item.addons && item.addons.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.addons.map((a: any, aIdx: number) => (
                                <span
                                  key={aIdx}
                                  className="text-[10px] bg-gray-100 text-[#718078] px-1.5 py-0.5 rounded"
                                >
                                  +{a.optionNameSnapshot || a.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.notes && (
                            <div className="text-[10px] text-amber-700 italic mt-0.5">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-[#172B25]">
                            {formatINR(item.pricePaise * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Calculation */}
              <div className="bg-[#F4F6F5] rounded-2xl p-3.5 space-y-2 border border-[#E5EBE7]">
                <div className="flex justify-between text-xs text-[#718078]">
                  <span>Subtotal</span>
                  <span>{formatINR(totalAmountPaise)}</span>
                </div>
                <div className="border-t border-[#E5EBE7] pt-2 flex justify-between items-baseline">
                  <span className="text-xs font-black uppercase text-[#172B25]">Total Due</span>
                  <span className="text-lg font-black text-[#16845B]">{formatINR(totalAmountPaise)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <Utensils className="h-10 w-10 text-[#718078] opacity-30 mx-auto" />
              <div className="text-sm font-bold text-[#172B25]">Table is Currently Available</div>
              <p className="text-xs text-[#718078] max-w-xs mx-auto">
                No active running order on Table {table.number}. Click below to take an order in the POS terminal.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5EBE7] bg-white space-y-2.5">
          {confirmClear ? (
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-2">
              <div className="text-xs font-bold text-amber-900">
                Are you sure you want to release Table {table.number}?
              </div>
              <div className="text-[11px] text-amber-800">
                This will reset the table status to Available and clear the current order.
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClearTable}
                  disabled={closing}
                  className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {closing ? "Releasing..." : "Confirm Release"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Primary: Open POS */}
              <Link
                href={`/app/pos?tableId=${table.id}${order ? `&orderId=${order.id}` : ""}`}
                className="w-full py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Utensils className="h-4 w-4" />
                <span>{order ? "Add Items / Open in POS" : "Take New Order in POS"}</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>

              {/* Secondary operations for occupied tables */}
              {order && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onPrintThermal("BILL", table)}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Print Bill Receipt"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Print Bill</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPrintThermal("KOT", table)}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Print Kitchen Order Ticket"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print KOT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenShiftModal(table)}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Shift to Another Table"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
                    <span>Shift Table</span>
                  </button>
                </div>
              )}

              {/* Release Table button */}
              {order && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="w-full py-1.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Clear & Release Table
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
