"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import {
  Printer,
  Bluetooth,
  Wifi,
  Usb,
  Plus,
  RefreshCw,
  Trash2,
  Cpu,
  Play,
  Star,
  AlertTriangle,
} from "lucide-react";
import {
  discoverBluetoothPrinter,
  discoverUsbPrinter,
  dispatchClientPrintJob,
  getOrRestoreBleDevice,
} from "@/lib/client-print";

export default function PrinterSettingsPanel({ selectedOutletId }: { selectedOutletId?: string }) {
  const [printers, setPrinters] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [filterOutletId, setFilterOutletId] = useState<string>(selectedOutletId || "");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    name: "Main Billing Printer",
    type: "USB_THERMAL",
    paperWidth: "80mm",
    connectionString: "",
    bridgeUrl: "",
    station: "BILLING",
    outletId: selectedOutletId || "",
    isDefaultBilling: true,
    isDefaultKOT: false,
    autoPrintEnabled: true,
  });

  useEffect(() => {
    if (selectedOutletId !== undefined) {
      setFilterOutletId(selectedOutletId);
      setForm((prev) => ({ ...prev, outletId: selectedOutletId }));
    }
  }, [selectedOutletId]);

  async function loadData(targetOutlet = filterOutletId) {
    setLoading(true);
    try {
      const qs = targetOutlet ? `?outletId=${encodeURIComponent(targetOutlet)}` : "";
      const [pList, jList, oList] = await Promise.all([
        apiFetch(`/api/printers${qs}`).then((r) => r.json()).catch(() => []),
        apiFetch(`/api/print-jobs${qs}`).then((r) => r.json()).catch(() => []),
        apiFetch("/api/outlets").then((r) => r.json()).catch(() => []),
      ]);
      if (Array.isArray(pList)) setPrinters(pList);
      if (Array.isArray(jList)) setJobs(jList);
      if (Array.isArray(oList)) {
        setOutlets(oList);
        if (!form.outletId && oList[0]?.id) {
          setForm((prev) => ({ ...prev, outletId: oList[0].id }));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(filterOutletId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOutletId]);

  async function handleAddPrinter(e: React.FormEvent) {
    e.preventDefault();
    setStatusBanner(null);
    try {
      const res = await apiFetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to add printer");
      setIsAdding(false);
      setStatusBanner({ type: "success", text: `✓ Printer "${form.name}" saved cleanly.` });
      loadData(filterOutletId);
    } catch (err: any) {
      setStatusBanner({ type: "error", text: err.message || "Error saving printer" });
    }
  }

  async function updatePrinter(printerId: string, patch: Record<string, unknown>) {
    try {
      const res = await apiFetch("/api/printers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerId, ...patch }),
      });
      if (res.ok) loadData(filterOutletId);
    } catch {}
  }

  async function triggerTestPrint(printer: any) {
    setStatusBanner({ type: "success", text: `Dispatching ${printer.paperWidth} diagnostic slip to ${printer.name}…` });
    try {
      if (printer.type === "BLUETOOTH_THERMAL") {
        const dev = await getOrRestoreBleDevice();
        if (!dev) {
          const r = await discoverBluetoothPrinter();
          if (!r.ok) {
            return setStatusBanner({ type: "error", text: r.error || "Bluetooth printer pairing required to print." });
          }
        }
      }
      const res = await apiFetch("/api/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerId: printer.id, jobType: "TEST", paperWidth: printer.paperWidth }),
      });
      const j = await res.json();
      if (j.requiresClientDispatch && j.jobId) {
        const clientRes = await dispatchClientPrintJob({
          jobId: j.jobId,
          printerType: printer.type,
          connectionString: printer.connectionString,
          bridgeUrl: printer.bridgeUrl,
          paperWidth: printer.paperWidth === "58mm" ? "58mm" : "80mm",
          escPosBase64: j.escPosBase64,
          textLines: j.textLines,
        });
        setStatusBanner({
          type: clientRes.status === "OFFLINE" || clientRes.status === "FAILED" ? "error" : "success",
          text: `Test print outcome: ${clientRes.status}${clientRes.error ? ` — ${clientRes.error}` : ""}`,
        });
      } else {
        setStatusBanner({
          type: j.status === "OFFLINE" || j.status === "FAILED" ? "error" : "success",
          text: j.message || `Status: ${j.status}`,
        });
      }
      loadData(filterOutletId);
    } catch {
      setStatusBanner({ type: "error", text: "Test print failed. Check printer connection." });
    }
  }

  async function retryPrintJob(job: any) {
    try {
      const res = await apiFetch("/api/print-jobs/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const j = await res.json();
      if (j.requiresClientDispatch && j.jobId) {
        await dispatchClientPrintJob({
          jobId: j.jobId,
          printerType: j.printerType || "OS_PRINT_SERVICE",
          paperWidth: job.paperWidth === "58mm" ? "58mm" : "80mm",
          escPosBase64: j.escPosBase64,
          textLines: j.textLines,
        });
      }
      setStatusBanner({ type: "success", text: `Retry executed — status: ${j.status}` });
      loadData(filterOutletId);
    } catch {
      setStatusBanner({ type: "error", text: "Retry print job failed." });
    }
  }

  async function deletePrinter(id: string) {
    if (!confirm("Remove this printer device configuration?")) return;
    await apiFetch(`/api/printers?printerId=${id}`, { method: "DELETE" });
    loadData(filterOutletId);
  }

  async function handleDiscover() {
    setStatusBanner(null);
    if (form.type === "USB_THERMAL") {
      const r = await discoverUsbPrinter();
      if (!r.ok) return setStatusBanner({ type: "error", text: r.error || "USB discovery failed" });
      setForm((p) => ({ ...p, name: r.name || p.name, connectionString: r.connectionString || p.connectionString }));
    } else if (form.type === "BLUETOOTH_THERMAL") {
      const r = await discoverBluetoothPrinter();
      if (!r.ok) return setStatusBanner({ type: "error", text: r.error || "Bluetooth discovery failed" });
      setForm((p) => ({ ...p, name: r.name || p.name, connectionString: r.connectionString || p.connectionString }));
    }
  }

  return (
    <div className="space-y-5 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {outlets.length > 0 && selectedOutletId === undefined && (
            <select
              value={filterOutletId}
              onChange={(e) => setFilterOutletId(e.target.value)}
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-bold text-[#172B25]"
            >
              <option value="">All Outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  Outlet: {o.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Connect Printer
          </button>
          <button
            type="button"
            onClick={() => loadData(filterOutletId)}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Honest Browser & Hardware Compatibility Architecture Box */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 flex items-start gap-3 text-xs">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[#718078]">
          <div className="font-bold text-[#172B25]">Thermal Hardware Compatibility &amp; Honest Status Architecture</div>
          <p>
            Silent background printing is supported cleanly via <b>Network LAN (Port 9100)</b>, <b>Local Print Bridge Agent</b> (recommended for USB/Serial/OS printers), and <b>Chrome WebUSB</b>. Browser OS print dialogs cannot detect paper-out or hardware state — RestroNex honestly displays <b>PRINT_REQUESTED</b> instead of faking <b>PRINTED</b> whenever hardware feedback is unavailable.
          </p>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex justify-between items-center ${
            statusBanner.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <span>{statusBanner.text}</span>
          <button onClick={() => setStatusBanner(null)}>×</button>
        </div>
      )}

      {isAdding && (
        <Card className="bg-white border-[#E5EBE7] shadow-sm">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-base font-bold text-[#172B25]">Connect Outlet Thermal Printer</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleAddPrinter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-[#718078]">Printer Name *</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Counter Thermal 80mm"
                    className="bg-white border-[#E5EBE7] mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#718078]">Connection Method</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1 w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs font-bold text-[#172B25]"
                  >
                    <option value="USB_THERMAL">USB Thermal (WebUSB)</option>
                    <option value="NETWORK_LAN">Network / LAN (Port 9100)</option>
                    <option value="BLUETOOTH_THERMAL">Supported Bluetooth (BLE)</option>
                    <option value="LOCAL_BRIDGE">Local Print Bridge Agent</option>
                    <option value="OS_PRINT_SERVICE">OS Print Service / Kiosk</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#718078]">Paper Width</Label>
                  <select
                    value={form.paperWidth}
                    onChange={(e) => setForm({ ...form, paperWidth: e.target.value })}
                    className="mt-1 w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs font-bold text-[#172B25]"
                  >
                    <option value="80mm">80mm (48 cols — Standard)</option>
                    <option value="58mm">58mm (32 cols — Compact)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-[#718078]">Address / Device ID</Label>
                    {(form.type === "USB_THERMAL" || form.type === "BLUETOOTH_THERMAL") && (
                      <button
                        type="button"
                        onClick={handleDiscover}
                        className="text-[11px] text-[#16845B] font-bold underline cursor-pointer"
                      >
                        Discover Device
                      </button>
                    )}
                  </div>
                  <Input
                    value={form.connectionString}
                    onChange={(e) => setForm({ ...form, connectionString: e.target.value })}
                    placeholder={form.type === "NETWORK_LAN" ? "192.168.1.200:9100" : "Device ID / MAC / Queue"}
                    className="bg-white border-[#E5EBE7] font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#718078] mb-1 block">Bridge URL (Optional)</Label>
                  <Input
                    value={form.bridgeUrl}
                    onChange={(e) => setForm({ ...form, bridgeUrl: e.target.value })}
                    placeholder="http://127.0.0.1:9111"
                    className="bg-white border-[#E5EBE7] font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#718078] mb-1 block">Target Outlet</Label>
                  <select
                    value={form.outletId}
                    onChange={(e) => setForm({ ...form, outletId: e.target.value })}
                    className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs font-bold text-[#172B25]"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={form.isDefaultBilling}
                    onChange={(e) => setForm({ ...form, isDefaultBilling: e.target.checked })}
                    className="h-4 w-4 rounded text-[#16845B]"
                  />
                  <span>Default Outlet Billing Printer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={form.autoPrintEnabled}
                    onChange={(e) => setForm({ ...form, autoPrintEnabled: e.target.checked })}
                    className="h-4 w-4 rounded text-[#16845B]"
                  />
                  <span>Automatic Printing ON</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 py-2 text-xs font-bold cursor-pointer"
                >
                  Save Printer
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-full border border-[#E5EBE7] bg-white px-5 py-2 text-xs font-bold text-[#718078]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((p) => {
          const isBT = p.type === "BLUETOOTH_THERMAL";
          const isLAN = p.type === "NETWORK_LAN";
          return (
            <Card key={p.id} className="bg-white border-[#E5EBE7] shadow-xs flex flex-col justify-between">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-[#E8F5EE] text-[#16845B]">
                      {isBT ? <Bluetooth className="h-5 w-5" /> : isLAN ? <Wifi className="h-5 w-5" /> : <Usb className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#172B25] flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.isDefaultBilling && (
                          <Star className="h-3.5 w-3.5 fill-[#16845B] text-[#16845B]" />
                        )}
                      </h3>
                      <p className="text-[11px] text-[#718078]">
                        {p.outlet?.name || "Outlet"} • {p.paperWidth}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      p.status === "CONNECTED"
                        ? "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/30"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="text-xs text-[#718078] bg-[#F8FAF9] p-2.5 rounded-xl border border-[#E5EBE7] space-y-1.5">
                  <div className="flex justify-between">
                    <span>Protocol:</span>
                    <b className="text-[#172B25] font-mono">{p.type}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Paper Width:</span>
                    <select
                      value={p.paperWidth}
                      onChange={(e) => updatePrinter(p.id, { paperWidth: e.target.value })}
                      className="font-bold text-[#172B25] bg-transparent text-right cursor-pointer"
                    >
                      <option value="80mm">80mm</option>
                      <option value="58mm">58mm</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Auto-Print:</span>
                    <button
                      type="button"
                      onClick={() => updatePrinter(p.id, { autoPrintEnabled: !p.autoPrintEnabled })}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                        p.autoPrintEnabled ? "bg-[#16845B] text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {p.autoPrintEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => triggerTestPrint(p)}
                    className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2 text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Test Print
                  </button>
                  {!p.isDefaultBilling && (
                    <button
                      type="button"
                      onClick={() => updatePrinter(p.id, { isDefaultBilling: true })}
                      className="rounded-full border border-[#E5EBE7] px-3 py-2 text-[11px] font-bold text-[#172B25] hover:bg-[#F8FAF9] cursor-pointer"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePrinter(p.id)}
                    className="p-2 rounded-full border border-[#E5EBE7] text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {printers.length === 0 && !loading && (
          <div className="col-span-full text-center py-10 bg-white rounded-2xl border border-dashed border-[#E5EBE7] space-y-2">
            <Printer className="h-8 w-8 text-[#718078] mx-auto" />
            <p className="text-sm text-[#718078]">No printers configured for this outlet yet.</p>
          </div>
        )}
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#16845B]" /> Print History &amp; Retry Queue
            </CardTitle>
            <span className="text-xs text-[#718078]">{jobs.length} recent jobs</span>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] text-[#718078] font-semibold">
                  <th className="py-2.5">Time</th>
                  <th>Order</th>
                  <th>Printer</th>
                  <th>Width</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]/60">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-[#F8FAF9]">
                    <td className="py-2.5 font-mono text-[#718078]">
                      {new Date(j.createdAt).toLocaleTimeString("en-IN")}
                    </td>
                    <td className="font-mono text-[#172B25]">{j.order?.orderNumber || j.jobType}</td>
                    <td className="text-[#718078]">{j.printer?.name || "Unassigned"}</td>
                    <td className="font-mono">{j.paperWidth || "80mm"}</td>
                    <td>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-bold text-[10px] ${
                          j.status === "PRINTED"
                            ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                            : j.status === "PRINT_REQUESTED" || j.status === "QUEUED" || j.status === "PRINTING"
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}
                      >
                        {j.status}
                      </span>
                      {j.lastError && (
                        <div className="text-[10px] text-red-600 mt-0.5 max-w-[200px] truncate">{j.lastError}</div>
                      )}
                    </td>
                    <td>
                      {(j.status === "OFFLINE" || j.status === "FAILED" || j.status === "QUEUED") && (
                        <button
                          type="button"
                          onClick={() => retryPrintJob(j)}
                          className="text-[#16845B] hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          Retry Print →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#718078]">
                      No print jobs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

