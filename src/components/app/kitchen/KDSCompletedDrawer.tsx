"use client";

import React, { useState } from "react";
import { KitchenTicketRecord } from "./KDSTicketCard";
import {
  X,
  History,
  RotateCcw,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  Utensils,
} from "lucide-react";

interface KDSCompletedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  completedTickets: KitchenTicketRecord[];
  onRecallTicket: (ticketId: string) => Promise<void>;
  onReprintKot: (ticket: KitchenTicketRecord) => Promise<void>;
}

export function KDSCompletedDrawer({
  isOpen,
  onClose,
  completedTickets,
  onRecallTicket,
  onReprintKot,
}: KDSCompletedDrawerProps) {
  const [search, setSearch] = useState("");
  const [recallingId, setRecallingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = completedTickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchOrder = t.order.orderNumber.toLowerCase().includes(q);
    const matchTable = t.order.table?.number.toLowerCase().includes(q);
    return matchOrder || matchTable;
  });

  const handleRecall = async (ticketId: string) => {
    setRecallingId(ticketId);
    try {
      await onRecallTicket(ticketId);
    } finally {
      setRecallingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-900 text-white h-full shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-sm text-white">Completed Tickets Today</h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {completedTickets.length} tickets bumped
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Order # or Table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
              <p className="font-semibold text-slate-400">No completed tickets found</p>
            </div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2 hover:border-slate-600 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-white">
                      {t.order.orderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Completed: {new Date(t.updatedAt).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    BUMPED
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 divide-y divide-slate-700/50">
                  {t.order.items?.map((it) => (
                    <div key={it.id} className="py-1 flex justify-between">
                      <span>
                        {it.quantity}× {it.name}
                      </span>
                      {it.variantName && (
                        <span className="text-slate-400 font-mono">{it.variantName}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-700 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onReprintKot(t)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
                  >
                    <Printer className="w-3 h-3 text-slate-400" />
                    Reprint KOT
                  </button>

                  <button
                    type="button"
                    disabled={recallingId === t.id}
                    onClick={() => handleRecall(t.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {recallingId === t.id ? "Recalling..." : "Recall to KDS"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
