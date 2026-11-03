"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Printer, Bluetooth, Wifi, Usb, Plus, RefreshCw, Trash2, Cpu, Play } from "lucide-react";

export default function PrintersSettingsPage() {
  const [printers, setPrinters] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Main Billing Printer",
    type: "BLUETOOTH_THERMAL",
    paperWidth: "80mm",
    connectionString: "00:11:22:33:44:55",
    station: "BILLING",
    outletId: "",
    isDefaultBilling: true,
    isDefaultKOT: false,
  });

  async function loadData() {
    try {
      const [pList, jList, oList] = await Promise.all([
        apiFetch("/api/printers").then((r) => r.json()).catch(() => []),
        apiFetch("/api/print-jobs").then((r) => r.json()).catch(() => []),
        apiFetch("/api/outlets").then((r) => r.json()).catch(() => []),
      ]);
      if (Array.isArray(pList)) setPrinters(pList);
      if (Array.isArray(jList)) setJobs(jList);
      if (Array.isArray(oList)) setOutlets(oList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddPrinter(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsAdding(false);
        loadData();
      }
    } catch {}
  }

  async function triggerTestPrint(printerId: string) {
    setTestResult("Sending ESC/POS diagnostic slip…");
    try {
      const res = await apiFetch("/api/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerId, jobType: "TEST" }),
      });
      const j = await res.json();
      setTestResult(j.message || "Test print sent successfully!");
      loadData();
    } catch {
      setTestResult("Test print failed. Verify printer power and connectivity.");
    }
  }

  async function deletePrinter(id: string) {
    if (!confirm("Remove printer configuration?")) return;
    await apiFetch(`/api/printers?printerId=${id}`, { method: "DELETE" });
    loadData();
  }

  // Web Bluetooth Browser Pairing
  async function pairBluetoothDevice() {
    if (typeof navigator !== "undefined" && "bluetooth" in navigator) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
        });
        setForm((prev) => ({
          ...prev,
          name: device.name || "Bluetooth Thermal Printer",
          connectionString: device.id || "BT-DEVICE-PAIRED",
          type: "BLUETOOTH_THERMAL",
        }));
      } catch {
        alert("Bluetooth pairing canceled or not supported on this browser.");
      }
    } else {
      alert("Web Bluetooth is supported on Chrome for Android/Mac. For standard Android apps, connection string uses Bluetooth SPP.");
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Devices & Thermal Printers</h1>
          <p className="text-sm text-[#718078]">
            ESC/POS hardware • Bluetooth mobile printers • Network LAN kitchen stations • USB billing counters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Printer
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-3.5 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/30 text-xs font-bold text-[#16845B] flex justify-between items-center">
          <span>{testResult}</span>
          <button onClick={() => setTestResult(null)}>×</button>
        </div>
      )}

      {/* Add Printer Form */}
      {isAdding && (
        <Card className="bg-white border-[#E5EBE7] shadow-sm animate-in fade-in">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-base font-bold text-[#172B25]">Configure New Printer Device</CardTitle>
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
                    className="bg-white border-[#E5EBE7]"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#718078]">Connection Protocol</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  >
                    <option value="BLUETOOTH_THERMAL">Bluetooth Thermal (ESC/POS)</option>
                    <option value="NETWORK_LAN">Ethernet / Wi-Fi LAN (Port 9100)</option>
                    <option value="USB_THERMAL">USB Direct Thermal</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#718078]">Paper Roll Width</Label>
                  <select
                    value={form.paperWidth}
                    onChange={(e) => setForm({ ...form, paperWidth: e.target.value })}
                    className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  >
                    <option value="80mm">80mm (Standard Full Width - 48 chars)</option>
                    <option value="58mm">58mm (Compact Mobile - 32 chars)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-semibold text-[#718078]">Connection Address / IP</Label>
                    {form.type === "BLUETOOTH_THERMAL" && (
                      <button
                        type="button"
                        onClick={pairBluetoothDevice}
                        className="text-[11px] text-[#16845B] font-bold underline flex items-center gap-1"
                      >
                        <Bluetooth className="h-3 w-3" /> Pair via Web Bluetooth
                      </button>
                    )}
                  </div>
                  <Input
                    value={form.connectionString}
                    onChange={(e) => setForm({ ...form, connectionString: e.target.value })}
                    placeholder={
                      form.type === "NETWORK_LAN"
                        ? "192.168.1.200:9100"
                        : "Bluetooth MAC / Device UUID"
                    }
                    className="bg-white border-[#E5EBE7]"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#718078]">Default Station Routing</Label>
                  <select
                    value={form.station}
                    onChange={(e) => setForm({ ...form, station: e.target.value })}
                    className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  >
                    <option value="BILLING">Main Billing Counter (Customer Bills)</option>
                    <option value="MAIN">Main Kitchen Station (Hot Food KOTs)</option>
                    <option value="BAR">Bar & Beverages Station</option>
                    <option value="DESSERT">Bakery & Dessert Station</option>
                  </select>
                </div>

                {outlets.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-[#718078]">Target Outlet</Label>
                    <select
                      value={form.outletId}
                      onChange={(e) => setForm({ ...form, outletId: e.target.value })}
                      className="w-full h-10 rounded-xl border border-[#E5EBE7] bg-white px-3 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                    >
                      <option value="">All / Primary Outlet</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 py-2.5 text-xs font-bold shadow-xs transition"
                >
                  Save Printer
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-full border border-[#E5EBE7] bg-white px-5 py-2.5 text-xs font-bold text-[#718078]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Printer List */}
      {loading ? (
        <div className="py-12 text-center text-sm font-semibold text-[#718078]">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#16845B]" />
          Scanning for paired ESC/POS thermal printers…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((p) => {
          const isBT = p.type === "BLUETOOTH_THERMAL";
          const isLAN = p.type === "NETWORK_LAN";
          return (
            <Card key={p.id} className="bg-white border-[#E5EBE7] shadow-xs flex flex-col justify-between">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-[#E8F5EE] text-[#16845B]">
                      {isBT ? <Bluetooth className="h-5 w-5" /> : isLAN ? <Wifi className="h-5 w-5" /> : <Usb className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#172B25]">{p.name}</h3>
                      <p className="text-[11px] text-[#718078]">
                        {p.paperWidth} • {p.station}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/30 px-2.5 py-0.5 text-[10px] font-black uppercase">
                    {p.status}
                  </span>
                </div>

                <div className="text-xs text-[#718078] bg-[#F8FAF9] p-2.5 rounded-xl border border-[#E5EBE7] space-y-1">
                  <div className="flex justify-between">
                    <span>Protocol:</span>
                    <b className="text-[#172B25] font-mono">{p.type}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Address:</span>
                    <b className="text-[#172B25] font-mono truncate max-w-[150px]">{p.connectionString || "Default System"}</b>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => triggerTestPrint(p.id)}
                    className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2 text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Test Print
                  </button>
                  <button
                    onClick={() => deletePrinter(p.id)}
                    className="p-2 rounded-full border border-[#E5EBE7] text-red-600 hover:bg-red-50 transition"
                    title="Delete printer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {printers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-[#E5EBE7] space-y-3">
            <Printer className="h-10 w-10 text-[#718078] mx-auto" />
            <p className="text-sm text-[#718078]">No thermal printers configured yet.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="rounded-full bg-[#16845B] text-white px-5 py-2 text-xs font-bold"
            >
              Add First Thermal Printer
            </button>
          </div>
        )}
      </div>
      )}

      {/* Print Job Queue */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#16845B]" /> Real-Time Print Queue & Dispatch History
            </CardTitle>
            <span className="text-xs text-[#718078]">{jobs.length} recorded jobs</span>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] text-[#718078] font-semibold">
                  <th className="py-2.5">Time</th>
                  <th>Job Type</th>
                  <th>Printer</th>
                  <th>Status</th>
                  <th>Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]/60">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-[#F8FAF9]">
                    <td className="py-2.5 font-mono text-[#718078]">
                      {new Date(j.createdAt).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className="font-extrabold text-[#172B25]">{j.jobType}</span>
                    </td>
                    <td className="text-[#718078]">{j.printer?.name || "Auto-routed"}</td>
                    <td>
                      <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/30 px-2 py-0.5 font-bold text-[#16845B]">
                        {j.status}
                      </span>
                    </td>
                    <td className="text-[#718078]">{j.attempts}</td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#718078]">
                      No active print queue jobs.
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
