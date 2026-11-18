"use client";

import React, { useState } from "react";
import {
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Utensils,
  Bike,
  Smartphone,
  Globe,
  Receipt,
  Flame,
  Zap,
} from "lucide-react";

export interface KitchenTicketItem {
  id: string;
  name: string;
  quantity: number;
  variantName?: string | null;
  notes?: string | null;
  addons?: Array<{
    id: string;
    optionNameSnapshot: string;
    groupNameSnapshot: string;
  }>;
}

export interface KitchenTicketRecord {
  id: string;
  orderId: string;
  tenantId: string;
  outletId: string;
  station: string;
  status: "RECEIVED" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED";
  priority: number;
  reprintCount: number;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    type: string;
    serviceMode?: string;
    customerName?: string | null;
    notes?: string | null;
    channel?: string | null;
    aggregatorOrderId?: string | null;
    table?: { id: string; number: string; area?: string | null } | null;
    items: KitchenTicketItem[];
  };
}

interface KDSTicketCardProps {
  ticket: KitchenTicketRecord;
  cardIndex: number;
  onUpdateStatus: (ticketId: string, nextStatus: string) => Promise<void>;
  onReprintKot: (ticket: KitchenTicketRecord) => Promise<void>;
  onTogglePriority: (ticket: KitchenTicketRecord) => Promise<void>;
}

export function KDSTicketCard({
  ticket,
  cardIndex,
  onUpdateStatus,
  onReprintKot,
  onTogglePriority,
}: KDSTicketCardProps) {
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  // Compute elapsed time and target warning
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000)
  );
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 1000) % 60
  );

  const targetMinutes = 15; // Standard kitchen prep threshold
  const isDelayed = elapsedMinutes >= targetMinutes && ticket.status !== "COMPLETED";
  const isWarning = elapsedMinutes >= 10 && elapsedMinutes < targetMinutes;

  const toggleItemCompleted = (itemId: string) => {
    setCompletedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleStatusProgression = async () => {
    let nextStatus = "ACCEPTED";
    if (ticket.status === "RECEIVED") nextStatus = "ACCEPTED";
    else if (ticket.status === "ACCEPTED") nextStatus = "PREPARING";
    else if (ticket.status === "PREPARING") nextStatus = "READY";
    else if (ticket.status === "READY") nextStatus = "COMPLETED";

    setIsUpdating(true);
    try {
      await onUpdateStatus(ticket.id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  // Channel badge
  const getSourceBadge = () => {
    const raw = (ticket.order.channel || ticket.order.type || "").toUpperCase();
    if (raw.includes("SWIGGY") || ticket.order.aggregatorOrderId?.startsWith("SWG")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-500 text-white flex items-center gap-1 shadow-2xs">
          <Utensils className="w-2.5 h-2.5" />
          SWIGGY
        </span>
      );
    }
    if (raw.includes("ZOMATO") || ticket.order.aggregatorOrderId?.startsWith("ZOM")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
          <Utensils className="w-2.5 h-2.5" />
          ZOMATO
        </span>
      );
    }
    if (raw.includes("QR") || ticket.order.type === "QR") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-600 text-white flex items-center gap-1 shadow-2xs">
          <Smartphone className="w-2.5 h-2.5" />
          QR ORDER
        </span>
      );
    }
    if (raw.includes("ONLINE") || raw.includes("WEBSITE")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white flex items-center gap-1 shadow-2xs">
          <Globe className="w-2.5 h-2.5" />
          WEBSITE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-700 text-slate-100 flex items-center gap-1">
        <Receipt className="w-2.5 h-2.5" />
        POS
      </span>
    );
  };

  const isRush = ticket.priority > 0;

  return (
    <div
      className={`bg-white rounded-2xl border-2 flex flex-col justify-between overflow-hidden shadow-sm transition relative select-none ${
        isRush
          ? "border-rose-500 ring-2 ring-rose-500/30"
          : isDelayed
          ? "border-rose-400 bg-rose-50/20"
          : ticket.status === "READY"
          ? "border-emerald-500"
          : "border-slate-300"
      }`}
    >
      {/* 1. Header with Status, Order Number, Table & Timer */}
      <div
        className={`p-3 text-white flex items-start justify-between gap-2 border-b transition ${
          isDelayed
            ? "bg-rose-700 border-rose-800"
            : isWarning
            ? "bg-amber-600 border-amber-700"
            : ticket.status === "READY"
            ? "bg-emerald-700 border-emerald-800"
            : ticket.status === "PREPARING"
            ? "bg-purple-700 border-purple-800"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black tracking-wider font-mono">
              #{cardIndex}
            </span>
            <span className="text-sm font-black tracking-tight">
              {ticket.order.orderNumber}
            </span>
            {getSourceBadge()}
            {isRush && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5" />
                RUSH
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
            {ticket.order.table ? (
              <span className="px-2 py-0.5 rounded bg-black/25 font-bold">
                Table {ticket.order.table.number}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-black/25 font-bold uppercase">
                {ticket.order.type}
              </span>
            )}
            <span className="text-[11px] opacity-80">
              Station: {ticket.station}
            </span>
          </div>
        </div>

        {/* Live Preparation Timer */}
        <div className="text-right shrink-0">
          <div
            className={`flex items-center gap-1 font-mono font-black text-sm px-2 py-0.5 rounded ${
              isDelayed ? "bg-white text-rose-700 animate-pulse" : "bg-black/30 text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {String(elapsedMinutes).padStart(2, "0")}:{String(elapsedSeconds).padStart(2, "0")}
            </span>
          </div>
          <span className="text-[10px] opacity-75 block mt-0.5">
            {isDelayed ? "OVERDUE" : `Target: ${targetMinutes}m`}
          </span>
        </div>
      </div>

      {/* 2. Items List */}
      <div className="p-3.5 space-y-2 flex-1 overflow-y-auto max-h-[340px]">
        {ticket.order.items?.map((item) => {
          const isDone = completedItemIds.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => toggleItemCompleted(item.id)}
              className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                isDone
                  ? "bg-slate-100/80 border-slate-200 opacity-60 line-through text-slate-400"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900"
              }`}
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggleItemCompleted(item.id)}
                className="accent-[#16845B] w-4 h-4 rounded mt-0.5 cursor-pointer shrink-0"
              />

              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {item.quantity}×
                    </span>
                    <span className="font-black text-sm text-slate-900 tracking-tight">
                      {item.name}
                    </span>
                    {item.variantName && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                        {item.variantName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Modifiers & Addons */}
                {item.addons && item.addons.length > 0 && (
                  <div className="text-[11px] font-semibold text-slate-600 pl-4 border-l-2 border-slate-300 space-y-0.5 mt-1">
                    {item.addons.map((a) => (
                      <p key={a.id} className="text-[#16845B]">
                        + {a.optionNameSnapshot}
                      </p>
                    ))}
                  </div>
                )}

                {/* Item-level special note */}
                {item.notes && (
                  <p className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                    Special: {item.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Global Order Special Instructions */}
        {ticket.order.notes && (
          <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-amber-950 font-bold text-xs">
            <span className="block text-[10px] uppercase tracking-wider text-amber-800">
              Kitchen Instructions:
            </span>
            <p>{ticket.order.notes}</p>
          </div>
        )}
      </div>

      {/* 3. Ticket Actions Footer */}
      <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {/* Reprint KOT */}
          <button
            type="button"
            onClick={() => onReprintKot(ticket)}
            className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
            title={`Reprint KOT (Reprinted ${ticket.reprintCount} times)`}
          >
            <Printer className="w-4 h-4 text-slate-600" />
          </button>

          {/* Toggle Rush Priority */}
          <button
            type="button"
            onClick={() => onTogglePriority(ticket)}
            className={`p-2 rounded-lg border transition ${
              isRush
                ? "bg-rose-600 border-rose-600 text-white"
                : "bg-white border-slate-300 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            }`}
            title="Toggle Rush Priority"
          >
            <Flame className="w-4 h-4" />
          </button>
        </div>

        {/* Big Bump / Status Action Button */}
        <button
          type="button"
          disabled={isUpdating}
          onClick={handleStatusProgression}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
            ticket.status === "RECEIVED"
              ? "bg-blue-600 hover:bg-blue-700"
              : ticket.status === "ACCEPTED"
              ? "bg-purple-600 hover:bg-purple-700"
              : ticket.status === "PREPARING"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          {ticket.status === "RECEIVED" && (
            <>
              <Check className="w-4 h-4" />
              Accept KOT
            </>
          )}
          {ticket.status === "ACCEPTED" && (
            <>
              <Play className="w-4 h-4 fill-current" />
              Start Cooking
            </>
          )}
          {ticket.status === "PREPARING" && (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Mark Ready
            </>
          )}
          {ticket.status === "READY" && (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              Bump Ticket
            </>
          )}
        </button>
      </div>
    </div>
  );
}
