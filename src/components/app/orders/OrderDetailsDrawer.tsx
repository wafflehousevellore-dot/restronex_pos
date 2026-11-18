"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { OrderRecord } from "./OrderTable";
import {
  X,
  Clock,
  Printer,
  FileText,
  MessageSquare,
  Utensils,
  Smartphone,
  Globe,
  Receipt,
  User,
  Phone,
  MapPin,
  Check,
  Play,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface OrderDetailsDrawerProps {
  order: OrderRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, nextStatus: string) => Promise<void>;
  onRequestCancel: (order: OrderRecord) => void;
  onReprintBill: (order: OrderRecord) => Promise<void>;
  onPrintKot: (order: OrderRecord) => Promise<void>;
  onSendWhatsApp: (order: OrderRecord) => Promise<void>;
}

export function OrderDetailsDrawer({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onRequestCancel,
  onReprintBill,
  onPrintKot,
  onSendWhatsApp,
}: OrderDetailsDrawerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleStatusClick = async (nextStatus: string) => {
    setIsUpdating(true);
    setActiveAction(nextStatus);
    try {
      await onUpdateStatus(order.id, nextStatus);
    } finally {
      setIsUpdating(false);
      setActiveAction(null);
    }
  };

  const isAggregator = Boolean(
    order.channel === "SWIGGY" ||
    order.channel === "ZOMATO" ||
    order.aggregatorOrderId
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-slate-900">
                {order.orderNumber}
              </span>
              {order.aggregatorReference?.displayOrderId && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {order.aggregatorReference.provider} #{order.aggregatorReference.displayOrderId}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                {order.type}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>{order.outlet?.name || "Main Outlet"}</span>
              <span>•</span>
              <span>
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Context-Aware Status Action Bar */}
        <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-slate-800 text-white tracking-wider">
              {order.status}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {(order.status === "OPEN" || order.status === "PLACED") && (
              <>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusClick("ACCEPTED")}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept Order
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onRequestCancel(order)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Reject
                </button>
              </>
            )}

            {order.status === "ACCEPTED" && (
              <>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusClick("PREPARING")}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Preparing
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onRequestCancel(order)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
                >
                  Cancel
                </button>
              </>
            )}

            {order.status === "PREPARING" && (
              <>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusClick("READY")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Food Ready
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onRequestCancel(order)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
                >
                  Cancel
                </button>
              </>
            )}

            {(order.status === "READY" || order.status === "SERVED") && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusClick("BILLED")}
                className="px-3 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white text-xs font-bold shadow-xs transition flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Complete / Settle Bill
              </button>
            )}

            {order.status === "CANCELLED" && (
              <span className="text-xs text-rose-600 font-semibold italic">
                Cancelled: {order.cancelReason || "No reason specified"}
              </span>
            )}
          </div>
        </div>

        {/* 3. Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Aggregator & Rider Details if external */}
          {order.aggregatorReference && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5" />
                  {order.aggregatorReference.provider} Delivery Details
                </span>
                <span className="text-[11px] font-mono font-semibold text-amber-800">
                  ID: {order.aggregatorReference.providerOrderId}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1 border-t border-amber-200/60">
                <div>
                  <span className="text-[10px] text-slate-500 block">Rider Name:</span>
                  <span className="font-semibold">{order.aggregatorReference.riderName || "Searching for rider..."}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Rider Status:</span>
                  <span className="font-semibold text-amber-900">{order.aggregatorReference.riderStatus || "PENDING"}</span>
                </div>
                {order.aggregatorReference.riderPhone && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 block">Rider Phone:</span>
                    <a href={`tel:${order.aggregatorReference.riderPhone}`} className="font-semibold text-blue-600 underline">
                      {order.aggregatorReference.riderPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer & Location */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Customer & Dining
            </span>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block">Name</span>
                <span className="font-semibold">{order.customerName || "Walk-in Guest"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Phone</span>
                <span className="font-semibold font-mono">{order.customerPhone || "—"}</span>
              </div>
              {order.table && (
                <div>
                  <span className="text-[10px] text-slate-400 block">Table</span>
                  <span className="font-semibold text-indigo-700">
                    Table {order.table.number} {order.table.area ? `(${order.table.area})` : ""}
                  </span>
                </div>
              )}
              {order.notes && (
                <div className="col-span-2 mt-1 p-2 bg-amber-50 rounded-lg border border-amber-100 text-amber-900">
                  <span className="font-bold block text-[10px]">Order Note / Instructions:</span>
                  <span>{order.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ordered Items List */}
          <div className="space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Ordered Items ({order.items?.length || 0})
            </span>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {order.items?.map((item) => {
                return (
                  <div key={item.id} className="p-3 flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">
                          {item.quantity}× {item.name}
                        </span>
                        {item.variantName && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.variantName}
                          </span>
                        )}
                      </div>

                      {/* Add-ons & Modifiers */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="text-[11px] text-slate-500 pl-4 border-l-2 border-slate-200 space-y-0.5 mt-1">
                          {item.addons.map((a) => (
                            <div key={a.id} className="flex items-center justify-between">
                              <span>+ {a.optionNameSnapshot}</span>
                              <span className="font-medium text-slate-700">
                                {formatINR(a.pricePaiseSnapshot)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Special cooking notes */}
                      {item.notes && (
                        <p className="text-[10px] text-amber-700 italic mt-0.5">
                          Note: "{item.notes}"
                        </p>
                      )}
                    </div>

                    <div className="text-right whitespace-nowrap pl-2">
                      <span className="font-bold text-slate-900">
                        {formatINR(item.totalPaise)}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {formatINR(item.unitPricePaise)} each
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bill Breakdown & Taxes */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Bill Breakdown
            </span>

            <div className="space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{formatINR(order.subtotalPaise)}</span>
              </div>

              {order.discountPaise > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-medium">- {formatINR(order.discountPaise)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Taxes & GST (CGST + SGST)</span>
                <span className="font-medium text-slate-900">{formatINR(order.taxPaise)}</span>
              </div>

              {(order.serviceChargePaise || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span>Service / Packaging Charge</span>
                  <span className="font-medium text-slate-900">
                    {formatINR(order.serviceChargePaise || 0)}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-black text-slate-900">
                <span>Grand Total</span>
                <span className="text-base text-[#16845B]">{formatINR(order.totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Payment Info
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  order.isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {order.isPaid ? "PAID" : "UNPAID"}
              </span>
            </div>

            {order.payments && order.payments.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {order.payments.map((p) => (
                  <div key={p.id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{p.method}</span>
                      {p.reference && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Ref: {p.reference}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatINR(p.amountPaise)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">No payment records logged yet.</p>
            )}
          </div>

          {/* Audit Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Audit Timeline
              </span>
              <div className="relative pl-4 border-l-2 border-slate-200 space-y-3 my-2">
                {order.timeline.map((event) => {
                  let meta: any = {};
                  try {
                    meta = event.metadataJson ? JSON.parse(event.metadataJson) : {};
                  } catch {}

                  return (
                    <div key={event.id} className="relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{event.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(event.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {meta.from && meta.to && (
                        <p className="text-[10px] text-slate-500">
                          Transitioned: {meta.from} → {meta.to}
                        </p>
                      )}
                      {meta.cancelReason && (
                        <p className="text-[10px] text-rose-600 italic">
                          Reason: {meta.cancelReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer Actions (Reprint, KOT, PDF, WhatsApp) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onReprintBill(order)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
              title="Print Customer Bill"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Reprint Bill
            </button>

            <button
              type="button"
              onClick={() => onPrintKot(order)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
              title="Print Kitchen Order Ticket"
            >
              <Utensils className="w-3.5 h-3.5 text-slate-500" />
              Print KOT
            </button>

            <a
              href={`/api/invoices/${encodeURIComponent(order.orderNumber)}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Invoice PDF
            </a>
          </div>

          {order.customerPhone && (
            <button
              type="button"
              onClick={() => onSendWhatsApp(order)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-2xs transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Bill
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
