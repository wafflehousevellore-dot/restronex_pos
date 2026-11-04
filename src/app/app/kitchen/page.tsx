"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ChefHat, Volume2, VolumeX, RefreshCw, Printer, X } from "lucide-react";

function playKitchenChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function getElapsed(createdAt: string): { label: string; isUrgent: boolean; isWarning: boolean } {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  return {
    label: mins === 0 ? "Just now" : `${mins}m ago`,
    isWarning: mins >= 10 && mins < 15,
    isUrgent: mins >= 15,
  };
}

export default function KitchenPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [stationFilter, setStationFilter] = useState("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [kotModalTicket, setKotModalTicket] = useState<any | null>(null);
  const knownTicketIds = useRef<Set<string>>(new Set());

  async function load() {
    try {
      const j = await apiFetch("/api/kds").then((r) => r.json()).catch(() => []);
      if (Array.isArray(j)) {
        if (knownTicketIds.current.size > 0 && soundEnabled) {
          const hasNew = j.some((t: any) => !knownTicketIds.current.has(t.id));
          if (hasNew) playKitchenChime();
        }
        knownTicketIds.current = new Set(j.map((t: any) => t.id));
        setTickets(j);
      }
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [soundEnabled]);

  async function update(id: string, status: string) {
    setLoading(true);
    try {
      await apiFetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id, status }),
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  // Multi-dimensional filtering (Status & Station)
  const filtered = tickets.filter((t) => {
    const matchesStatus = filter === "ALL" || t.status === filter;
    const matchesStation = stationFilter === "ALL" || (t.station || "MAIN").toUpperCase() === stationFilter;
    return matchesStatus && matchesStation;
  });

  const cols: Record<string, any[]> = { RECEIVED: [], PREPARING: [], READY: [], COMPLETED: [] };
  filtered.forEach((t) => cols[t.status]?.push(t));

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20 grid place-items-center">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Kitchen Display System (KDS)</h1>
            <p className="text-sm text-[#718078]">
              Real-time ticket bump workflow • Table numbers • Station routing • Auto KOT sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold border transition flex items-center gap-1.5 shadow-2xs ${
              soundEnabled
                ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                : "bg-white border-[#E5EBE7] text-[#718078]"
            }`}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {soundEnabled ? "Chime ON" : "Muted"}
          </button>

          <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#16845B] animate-pulse" />
            LIVE (4s)
          </span>
        </div>
      </div>

      {/* Filter Bars */}
      <div className="space-y-2">
        {/* Status Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {["ALL", "RECEIVED", "PREPARING", "READY", "COMPLETED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold border transition ${
                  filter === s
                    ? "bg-[#16845B] text-white border-[#16845B] shadow-xs"
                    : "bg-white border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Station Filters */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E5EBE7] p-1 rounded-full text-xs font-bold shadow-2xs">
            <span className="text-[10px] text-[#718078] uppercase px-2">Station:</span>
            {["ALL", "MAIN", "BEVERAGE", "DESSERT", "BAR"].map((st) => (
              <button
                key={st}
                onClick={() => setStationFilter(st)}
                className={`px-3 py-1 rounded-full transition ${
                  stationFilter === st
                    ? "bg-[#172B25] text-white"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-[#718078] bg-white border-[#E5EBE7] rounded-3xl shadow-sm">
          <ChefHat className="h-8 w-8 mx-auto text-[#718078]/40 mb-2" />
          No active tickets matching filter. Place an order from POS or Table QR to generate live tickets.
        </Card>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          {Object.entries(cols).map(([status, list]) => (
            <div key={status} className="rounded-3xl border border-[#E5EBE7] bg-white p-4 shadow-xs flex flex-col">
              <div className="text-xs font-black tracking-wider text-[#718078] uppercase flex justify-between items-center pb-3 border-b border-[#E5EBE7]">
                <span>{status}</span>
                <span className="rounded-full bg-[#F8FAF9] border border-[#E5EBE7] px-2.5 py-0.5 text-[#172B25] font-black">
                  {(list as any[]).length}
                </span>
              </div>

              <div className="mt-3.5 space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                {(list as any[]).map((t) => {
                  const elapsed = getElapsed(t.createdAt);
                  const isDineIn = t.order?.type === "DINE_IN" || t.order?.type === "QR";
                  const tableNumber = t.order?.table?.number;

                  return (
                    <div
                      key={t.id}
                      className={`rounded-2xl border p-4 transition shadow-xs space-y-2.5 ${
                        status === "RECEIVED"
                          ? "bg-[#E8F5EE]/40 border-[#16845B]/30"
                          : status === "PREPARING"
                          ? "bg-amber-50/70 border-amber-200"
                          : status === "READY"
                          ? "bg-emerald-50/70 border-emerald-200"
                          : "bg-[#F8FAF9] border-[#E5EBE7]"
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-black text-[#172B25]">
                            {t.order?.orderNumber || t.orderId.slice(0, 8)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-2 py-0.5 rounded-md text-[11px]">
                              {tableNumber ? `Table ${tableNumber}` : t.order?.type || "Dine-in"}
                            </span>
                            {t.order?.customerName && (
                              <span className="text-[11px] text-[#718078] truncate max-w-[100px]">
                                • {t.order.customerName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] rounded-full bg-white border border-[#E5EBE7] px-2 py-0.5 text-[#718078] font-bold uppercase">
                              {t.station || "MAIN"}
                            </span>
                            <button
                              onClick={() => setKotModalTicket(t)}
                              title="Print Thermal KOT Ticket"
                              className="p-1 rounded-md text-[#718078] hover:text-[#172B25] hover:bg-white border border-transparent hover:border-[#E5EBE7] transition"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div
                            className={`flex items-center gap-1 text-[10px] font-bold mt-1 justify-end ${
                              elapsed.isUrgent
                                ? "text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded animate-pulse"
                                : elapsed.isWarning
                                ? "text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"
                                : "text-[#718078]"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {elapsed.label}
                          </div>
                        </div>
                      </div>

                      {/* Customer Notes */}
                      {t.order?.notes && (
                        <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium">
                          ⚠️ <b>Note:</b> {t.order.notes}
                        </div>
                      )}

                      {/* Items List */}
                      <ul className="space-y-1.5 text-xs border-t border-[#E5EBE7] pt-2">
                        {t.order?.items?.map((it: any) => (
                          <li key={it.id} className="flex justify-between text-[#172B25]">
                            <span className="font-bold">
                              {it.quantity}× <span className="font-semibold">{it.name}</span>
                            </span>
                            <span className="text-[11px] text-[#718078]">
                              {it.kotStatus || "KOT"}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Action Bump Buttons */}
                      <div className="pt-1">
                        {t.status === "RECEIVED" && (
                          <button
                            onClick={() => update(t.id, "PREPARING")}
                            disabled={loading}
                            className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                          >
                            Start Preparing →
                          </button>
                        )}
                        {t.status === "PREPARING" && (
                          <button
                            onClick={() => update(t.id, "READY")}
                            disabled={loading}
                            className="w-full rounded-full bg-amber-600 hover:bg-amber-700 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                          >
                            Mark Ready (Bell Waiter) 🔔
                          </button>
                        )}
                        {t.status === "READY" && (
                          <button
                            onClick={() => update(t.id, "COMPLETED")}
                            disabled={loading}
                            className="w-full rounded-full bg-[#172B25] hover:bg-black py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                          >
                            Bump / Served ✓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thermal KOT Modal */}
      {kotModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25] flex items-center gap-2">
                <Printer className="h-4 w-4 text-[#16845B]" />
                Kitchen Order Ticket (KOT)
              </h3>
              <button
                onClick={() => setKotModalTicket(null)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center hover:text-[#172B25]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Printable KOT Ticket */}
            <div id="kot-printable" className="p-4 bg-[#F8FAF9] rounded-2xl border border-[#E5EBE7] font-mono text-xs space-y-2 text-black">
              <div className="text-center border-b border-dashed border-gray-400 pb-2">
                <div className="font-black text-sm uppercase">KITCHEN ORDER TICKET (KOT)</div>
                <div className="text-[11px] text-gray-600">Station: {kotModalTicket.station || "MAIN KITCHEN"}</div>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span><b>Order:</b> {kotModalTicket.order?.orderNumber || kotModalTicket.orderId.slice(0, 8)}</span>
                <span><b>Table:</b> {kotModalTicket.order?.table?.number ? `Table ${kotModalTicket.order.table.number}` : "Takeaway"}</span>
              </div>
              <div className="text-[10px] text-gray-500">
                Time: {new Date(kotModalTicket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>

              {kotModalTicket.order?.notes && (
                <div className="p-1.5 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 font-sans">
                  <b>Special Note:</b> {kotModalTicket.order.notes}
                </div>
              )}

              <div className="border-t border-b border-dashed border-gray-400 py-2 space-y-1 my-2">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>ITEM</span>
                  <span>QTY</span>
                </div>
                {kotModalTicket.order?.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between text-xs">
                    <span className="font-semibold">{it.name}</span>
                    <span className="font-bold">×{it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="text-center text-[10px] text-gray-500 pt-1">
                KDS Ticket ID: {kotModalTicket.id.slice(0, 10)}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setKotModalTicket(null)}
                className="flex-1 rounded-full border border-[#E5EBE7] bg-white py-2.5 text-xs font-bold text-[#718078] hover:bg-[#F8FAF9]"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print KOT (80mm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardContent className="pt-3.5 pb-3.5 text-xs text-[#718078] flex flex-wrap justify-between items-center gap-2">
          <div>
            <b>KDS Auto-Routing:</b> Main Kitchen • Beverage Bar • Dessert Station. Live sync across waiter POS & kitchen screens.
          </div>
          <div className="text-[11px] text-[#16845B] font-bold">
            Zero third-party fees • WebSocket & Polling fallback enabled
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
