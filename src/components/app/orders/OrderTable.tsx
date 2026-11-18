"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import {
  Clock,
  Printer,
  ChevronRight,
  ExternalLink,
  Utensils,
  Smartphone,
  Globe,
  Receipt,
  User,
  MapPin,
  Check,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";

export interface OrderRecord {
  id: string;
  orderNumber: string;
  tenantId: string;
  outletId: string;
  type: string;
  status: string;
  serviceMode?: string;
  tableId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotalPaise: number;
  taxPaise: number;
  discountPaise: number;
  serviceChargePaise?: number;
  totalPaise: number;
  notes?: string | null;
  kotStatus?: string;
  isPaid: boolean;
  paidAt?: string | null;
  billClosedAt?: string | null;
  aggregatorOrderId?: string | null;
  aggregatorStatus?: string | null;
  channel?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPricePaise: number;
    totalPaise: number;
    variantName?: string | null;
    modifiersJson?: string | null;
    notes?: string | null;
    addons?: Array<{
      id: string;
      groupNameSnapshot: string;
      optionNameSnapshot: string;
      pricePaiseSnapshot: number;
    }>;
  }>;
  payments?: Array<{
    id: string;
    method: string;
    amountPaise: number;
    status: string;
    reference?: string | null;
  }>;
  table?: {
    id: string;
    number: string;
    area?: string | null;
  } | null;
  outlet?: {
    id: string;
    name: string;
    city?: string | null;
  } | null;
  aggregatorReference?: {
    provider: string;
    providerOrderId: string;
    displayOrderId?: string | null;
    riderName?: string | null;
    riderPhone?: string | null;
    riderStatus?: string | null;
    orderStatus?: string;
  } | null;
  timeline?: Array<{
    id: string;
    action: string;
    userId?: string | null;
    metadataJson?: string | null;
    createdAt: string;
  }>;
}

interface OrderTableProps {
  orders: OrderRecord[];
  onSelectOrder: (order: OrderRecord) => void;
  onQuickStatusChange: (orderId: string, nextStatus: string) => void;
  onQuickPrint: (order: OrderRecord) => void;
  isLoading: boolean;
}

export function OrderTable({
  orders,
  onSelectOrder,
  onQuickStatusChange,
  onQuickPrint,
  isLoading,
}: OrderTableProps) {
  const [sortField, setSortField] = useState<"createdAt" | "totalPaise" | "status">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const handleSort = (field: "createdAt" | "totalPaise" | "status") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortField === "createdAt") {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? diff : -diff;
    }
    if (sortField === "totalPaise") {
      return sortOrder === "asc" ? a.totalPaise - b.totalPaise : b.totalPaise - a.totalPaise;
    }
    if (sortField === "status") {
      return sortOrder === "asc"
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Helper for source icon & badge
  const getSourceBadge = (order: OrderRecord) => {
    const raw = (order.channel || order.type || "").toUpperCase();
    if (raw.includes("SWIGGY") || order.aggregatorOrderId?.startsWith("SWG")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <Utensils className="w-2.5 h-2.5" />
          Swiggy {order.aggregatorReference?.displayOrderId ? `#${order.aggregatorReference.displayOrderId}` : ""}
        </span>
      );
    }
    if (raw.includes("ZOMATO") || order.aggregatorOrderId?.startsWith("ZOM")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <Utensils className="w-2.5 h-2.5" />
          Zomato {order.aggregatorReference?.displayOrderId ? `#${order.aggregatorReference.displayOrderId}` : ""}
        </span>
      );
    }
    if (raw.includes("QR") || order.type === "QR") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <Smartphone className="w-2.5 h-2.5" />
          QR Table {order.table?.number || ""}
        </span>
      );
    }
    if (raw.includes("ONLINE") || raw.includes("WEBSITE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <Globe className="w-2.5 h-2.5" />
          Website
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Receipt className="w-2.5 h-2.5" />
        POS {order.type === "DINE_IN" ? "• Dine In" : order.type === "TAKEAWAY" ? "• Takeaway" : "• Delivery"}
      </span>
    );
  };

  // Helper for status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
      case "PLACED":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            New Order
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3" />
            Accepted
          </span>
        );
      case "PREPARING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Utensils className="w-3 h-3" />
            Preparing
          </span>
        );
      case "READY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        );
      case "SERVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            Served
          </span>
        );
      case "BILLED":
      case "PAID":
      case "CLOSED":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Completed
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  // Format relative time
  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours === 1) return "1 hr ago";
    if (hours < 24) return `${hours} hrs ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Order Info</th>
              <th className="py-2.5 px-3">Customer / Table</th>
              <th className="py-2.5 px-3">Outlet</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-slate-800"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-1">
                  <span>Placed At</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3">Items Summary</th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-800"
                onClick={() => handleSort("totalPaise")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Amount</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3">Payment</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-slate-800"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={9} className="py-3 px-3">
                    <div className="h-4 bg-slate-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No orders found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try adjusting your filters or check back for new orders.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const totalItemsCount = order.items?.reduce((s, it) => s + it.quantity, 0) || 0;
                const itemsPreview = order.items
                  ?.map((it) => `${it.quantity}× ${it.name}`)
                  .slice(0, 3)
                  .join(", ");
                const hasMoreItems = (order.items?.length || 0) > 3;

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="hover:bg-slate-50/80 cursor-pointer transition group"
                  >
                    {/* 1. Order Info */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-bold text-slate-900 group-hover:text-[#16845B] transition">
                          {order.orderNumber}
                        </span>
                        {getSourceBadge(order)}
                      </div>
                    </td>

                    {/* 2. Customer / Table */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                          {order.customerName || "Walk-in Guest"}
                        </span>
                        {order.customerPhone && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {order.customerPhone}
                          </span>
                        )}
                        {order.table && (
                          <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            Table {order.table.number}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Outlet */}
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {order.outlet?.name || "Main Outlet"}
                    </td>

                    {/* 4. Placed At */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {getRelativeTime(order.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* 5. Items Summary */}
                    <td className="py-3 px-3 max-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 truncate" title={itemsPreview}>
                          {itemsPreview || "No items"}
                          {hasMoreItems && (
                            <span className="text-[10px] text-slate-400 ml-1 font-semibold">
                              +{order.items!.length - 3} more
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </td>

                    {/* 6. Amount */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="text-sm font-black text-slate-900">
                        {formatINR(order.totalPaise)}
                      </span>
                    </td>

                    {/* 7. Payment */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-0.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {order.isPaid ? "PAID" : "UNPAID"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {order.payments?.[0]?.method || "CASH"}
                        </span>
                      </div>
                    </td>

                    {/* 8. Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>

                    {/* 9. Actions */}
                    <td
                      className="py-3 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Context-aware quick progression button */}
                        {(order.status === "OPEN" || order.status === "PLACED") && (
                          <button
                            type="button"
                            onClick={() => onQuickStatusChange(order.id, "ACCEPTED")}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition"
                            title="Accept Order"
                          >
                            Accept
                          </button>
                        )}
                        {order.status === "ACCEPTED" && (
                          <button
                            type="button"
                            onClick={() => onQuickStatusChange(order.id, "PREPARING")}
                            className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition flex items-center gap-1"
                            title="Start Cooking"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            Cook
                          </button>
                        )}
                        {order.status === "PREPARING" && (
                          <button
                            type="button"
                            onClick={() => onQuickStatusChange(order.id, "READY")}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1"
                            title="Mark Food Ready"
                          >
                            <Check className="w-2.5 h-2.5" />
                            Ready
                          </button>
                        )}

                        {/* Print Bill / KOT Quick Icon */}
                        <button
                          type="button"
                          onClick={() => onQuickPrint(order)}
                          className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                          title="Print Bill / Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* View Arrow */}
                        <button
                          type="button"
                          onClick={() => onSelectOrder(order)}
                          className="p-1 rounded text-slate-400 group-hover:text-slate-700 transition"
                          title="View order details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedOrders.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sortedOrders.length)} of {sortedOrders.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
