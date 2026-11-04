"use client";

import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { QrCode, Plus, ArrowRightLeft, Check, X, Printer, RefreshCw } from "lucide-react";

export default function TablesFloorPlanPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [tenantName, setTenantName] = useState<string>("");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [form, setForm] = useState({ number: "", area: "Main Hall", capacity: "4", waiterName: "" });
  const [qrModalTable, setQrModalTable] = useState<any | null>(null);
  const [moveModalTable, setMoveModalTable] = useState<any | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [oList, tList, mList] = await Promise.all([
        apiFetch("/api/outlets").then((r) => r.json()).catch(() => []),
        apiFetch("/api/tables").then((r) => r.json()).catch(() => []),
        apiFetch("/api/tenants").then((r) => r.json()).catch(() => []),
      ]);
      if (Array.isArray(oList)) {
        setOutlets(oList);
        if (oList.length > 0 && !selectedOutlet) setSelectedOutlet(oList[0].id);
      }
      if (Array.isArray(tList)) setTables(tList);
      if (Array.isArray(mList) && mList.length > 0) {
        const found = mList[0]?.tenant?.name;
        if (found) setTenantName(found);
      }
    } catch {
      setMsg({ type: "error", text: "Failed to load floor tables" });
    }
  }, [selectedOutlet]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    if (!form.number.trim()) return;
    try {
      const res = await apiFetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutlet || (outlets[0]?.id ?? ""),
          number: form.number,
          area: form.area,
          capacity: parseInt(form.capacity, 10) || 4,
          waiterName: form.waiterName || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to create table" });
      } else {
        setMsg({ type: "success", text: `Table ${form.number} created successfully` });
        setForm({ number: "", area: form.area, capacity: "4", waiterName: "" });
        loadData();
      }
    } catch {
      setMsg({ type: "error", text: "Error creating table" });
    }
  }

  async function updateStatus(tableId: string, status: string) {
    await apiFetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, status }),
    });
    loadData();
  }

  async function executeMoveOrder() {
    if (!moveModalTable || !targetTableId) return;
    try {
      const res = await apiFetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MOVE_ORDER",
          tableId: moveModalTable.id,
          targetTableId,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to move order" });
      } else {
        setMsg({ type: "success", text: `Order shifted from Table ${moveModalTable.number} to target table.` });
        setMoveModalTable(null);
        setTargetTableId("");
        loadData();
      }
    } catch {
      setMsg({ type: "error", text: "Move table failed" });
    }
  }

  async function closeTable(tableId: string) {
    await apiFetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLOSE_TABLE", tableId }),
    });
    setMsg({ type: "success", text: "Table closed & marked available" });
    loadData();
  }

  const filteredTables = selectedOutlet
    ? tables.filter((t) => t.outletId === selectedOutlet)
    : tables;

  const byArea = filteredTables.reduce((acc: Record<string, any[]>, t: any) => {
    const a = t.area || "Main Hall";
    (acc[a] = acc[a] || []).push(t);
    return acc;
  }, {});

  const totalOccupied = filteredTables.filter((t) => t.status === "OCCUPIED" || t.status === "BILLING").length;

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Table Floor Plan & QR Codes</h1>
          <p className="text-sm text-[#718078]">
            Visual floor layout • Seating capacity • Live table status • Contactless QR codes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {outlets.length > 1 && (
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B] shadow-xs"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] text-xs font-extrabold">
            <span>{totalOccupied} / {filteredTables.length} Active Tables</span>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] shadow-xs"
            title="Refresh floor status"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            msg.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Quick Add Table */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#16845B]" /> Add Table to Floor Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTable} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-[11px] font-semibold text-[#718078]">Table Number *</Label>
              <Input
                required
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="e.g. T13"
                className="bg-white border-[#E5EBE7] text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-[#718078]">Floor Section</Label>
              <Input
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="Main Hall, Terrace, AC…"
                className="bg-white border-[#E5EBE7] text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-[#718078]">Capacity (Seats)</Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="bg-white border-[#E5EBE7] text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-[#718078]">Default Steward</Label>
              <Input
                value={form.waiterName}
                onChange={(e) => setForm({ ...form, waiterName: e.target.value })}
                placeholder="e.g. Ramesh"
                className="bg-white border-[#E5EBE7] text-sm h-9"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white font-bold h-9 text-xs transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Save Table
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Floor Plan Display Grouped by Area */}
      {(Object.entries(byArea) as [string, any[]][]).map(([areaName, areaTables]) => (
        <Card key={areaName} className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-extrabold text-[#172B25]">{areaName}</CardTitle>
              <span className="text-xs text-[#718078] font-bold">
                {areaTables.filter((t) => t.status === "AVAILABLE").length} available • {areaTables.length} total
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {areaTables.map((t) => {
              const isOccupied = t.status === "OCCUPIED" || t.status === "BILLING";
              const isReserved = t.status === "RESERVED";
              return (
                <div
                  key={t.id}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all shadow-xs ${
                    isOccupied
                      ? "bg-amber-50/70 border-amber-300 text-amber-950"
                      : isReserved
                      ? "bg-blue-50/70 border-blue-200 text-blue-950"
                      : "bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25] hover:border-[#16845B]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black">{t.number}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          isOccupied
                            ? "bg-amber-200 text-amber-900"
                            : isReserved
                            ? "bg-blue-200 text-blue-900"
                            : "bg-[#E8F5EE] text-[#16845B]"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#718078] mt-1">
                      {t.capacity} Seats {t.waiterName ? `• ${t.waiterName}` : ""}
                    </div>

                    {t.orderTotalPaise > 0 && (
                      <div className="text-xs font-black text-[#16845B] mt-1.5">
                        {formatINR(t.orderTotalPaise)}
                      </div>
                    )}
                  </div>

                  {/* Table Control Buttons */}
                  <div className="mt-4 pt-3 border-t border-black/5 flex flex-wrap gap-1.5">
                    {/* QR Code Button */}
                    <button
                      onClick={() => setQrModalTable(t)}
                      className="p-1.5 rounded-lg bg-white border border-[#E5EBE7] text-[#16845B] hover:bg-[#E8F5EE] shadow-2xs"
                      title="View & Print Table QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>

                    {/* Shift / Move Table */}
                    {isOccupied && (
                      <button
                        onClick={() => setMoveModalTable(t)}
                        className="p-1.5 rounded-lg bg-white border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] shadow-2xs"
                        title="Shift Table Order"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Quick Status Toggle */}
                    <button
                      onClick={() =>
                        updateStatus(
                          t.id,
                          t.status === "AVAILABLE"
                            ? "OCCUPIED"
                            : t.status === "OCCUPIED"
                            ? "RESERVED"
                            : "AVAILABLE"
                        )
                      }
                      className="flex-1 py-1 rounded-lg bg-white border border-[#E5EBE7] text-[11px] font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs"
                    >
                      Toggle
                    </button>

                    {isOccupied && (
                      <button
                        onClick={() => closeTable(t.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
                        title="Close Table & Mark Clean"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* QR Code Modal */}
      {qrModalTable && (() => {
        const restaurantDisplayName = (
          qrModalTable.tenant?.name ||
          tenantName ||
          qrModalTable.outlet?.name ||
          "Restaurant"
        ).toUpperCase();

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-[#E5EBE7]">
              <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
                <h3 className="font-extrabold text-base text-[#172B25]">Table {qrModalTable.number} QR Badge</h3>
                <button
                  onClick={() => setQrModalTable(null)}
                  className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Generated QR Badge Design */}
              <div id="qr-badge-printable" className="p-6 rounded-2xl border-2 border-dashed border-[#16845B]/40 bg-[#F8FAF9] space-y-3">
                <div className="text-xs uppercase font-extrabold tracking-widest text-[#16845B] truncate px-1" title={restaurantDisplayName}>
                  {restaurantDisplayName} • TABLE ORDER
                </div>
                <div className="text-2xl font-black text-[#172B25]">TABLE {qrModalTable.number}</div>
                <p className="text-[11px] text-[#718078]">Scan with any camera or UPI app to view menu & order</p>

                <div className="h-44 w-44 mx-auto bg-white border border-[#E5EBE7] rounded-2xl grid place-items-center shadow-xs">
                  {/* SVG QR Code Simulation with live target link */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      `${typeof window !== "undefined" ? window.location.origin : "https://restronex.vercel.app"}/order/table/${qrModalTable.qrToken}`
                    )}`}
                    alt={`QR Code for Table ${qrModalTable.number}`}
                    className="h-36 w-36 object-contain"
                  />
                </div>

                <div className="text-[10px] text-[#718078] font-mono break-all pt-1">
                  Token: {qrModalTable.qrToken}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href={`/order/table/${qrModalTable.qrToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 text-xs font-bold transition shadow-xs"
                >
                  Open Guest Menu →
                </a>
                <button
                  onClick={() => window.print()}
                  className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2.5 text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Move / Shift Order Modal */}
      {moveModalTable && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25]">Shift Table {moveModalTable.number} Order</h3>
              <button
                onClick={() => setMoveModalTable(null)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#718078]">
              Select an available target table to relocate active guest order:
            </p>

            <select
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-2.5 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
            >
              <option value="">Select Destination Table</option>
              {filteredTables
                .filter((t) => t.id !== moveModalTable.id && t.status === "AVAILABLE")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.number} ({t.area} • {t.capacity} Seats)
                  </option>
                ))}
            </select>

            <div className="flex gap-2 pt-2">
              <button
                onClick={executeMoveOrder}
                disabled={!targetTableId}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 text-xs font-bold transition shadow-xs disabled:opacity-40"
              >
                Confirm Move
              </button>
              <button
                onClick={() => setMoveModalTable(null)}
                className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2.5 text-xs font-bold text-[#718078]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
