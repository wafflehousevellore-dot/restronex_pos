"use client";

import * as React from "react";
import { X, Printer, Search, FileText, CheckCircle2, RotateCcw } from "lucide-react";
import { formatINR } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export interface RecentPOSOrder {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  createdAt: string;
  orderType: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  totalPaise: number;
  isPaid: boolean;
  status: string;
  items: { name: string; quantity: number }[];
}

export interface POSRecentOrdersDrawerProps {
  open: boolean;
  onClose: () => void;
  orders: RecentPOSOrder[];
  onReprintBill: (order: RecentPOSOrder) => void;
  onReprintKOT: (order: RecentPOSOrder) => void;
  onRefresh?: () => void;
}

export function POSRecentOrdersDrawer({
  open,
  onClose,
  orders,
  onReprintBill,
  onReprintKOT,
  onRefresh,
}: POSRecentOrdersDrawerProps) {
  const [search, setSearch] = React.useState("");

  if (!open) return null;

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customerPhone && o.customerPhone.includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.tableName && o.tableName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#E5EBE7] animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="h-[68px] px-5 border-b border-[#E5EBE7] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#16845B]" />
              <div>
                <h2 className="text-base font-bold text-[#172B25]">Recent Orders</h2>
                <div className="text-xs text-[#718078]">Today&apos;s cashier activity</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="p-1.5 rounded-xl border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
                  title="Refresh orders"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3.5 border-b border-[#E5EBE7] bg-[#F8FAF9]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order #, phone or table..."
                className="w-full h-9 rounded-xl border border-[#E5EBE7] bg-white pl-8 pr-3 text-xs text-[#172B25] placeholder-[#A0ACA5] focus:outline-none focus:border-[#16845B]"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#718078]">
                No recent orders found matching &quot;{search}&quot;.
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-[#E5EBE7] bg-white p-3.5 space-y-2 hover:border-[#16845B]/40 shadow-2xs transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#172B25]">{o.orderNumber}</span>
                    <span className="font-black text-sm text-[#16845B]">
                      {formatINR(o.totalPaise)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#718078]">
                    <span>{o.orderType.replace("_", " ")}</span>
                    {o.tableName && <span>• Table {o.tableName}</span>}
                    <span>• {o.createdAt}</span>
                  </div>

                  {o.items && o.items.length > 0 && (
                    <div className="text-[11px] text-[#718078] truncate bg-[#F8FAF9] p-1.5 rounded-lg border border-[#E5EBE7]">
                      {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={o.status} size="sm" />
                      <StatusBadge
                        status={o.isPaid ? "PAID" : "UNPAID"}
                        variant={o.isPaid ? "success" : "warning"}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onReprintKOT(o)}
                        className="rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-white text-[#172B25] px-2 py-1 text-[11px] font-bold transition flex items-center gap-1"
                      >
                        <Printer className="h-3 w-3 text-[#718078]" />
                        <span>KOT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onReprintBill(o)}
                        className="rounded-lg bg-[#16845B] hover:bg-[#116B49] text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition flex items-center gap-1"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Bill</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
