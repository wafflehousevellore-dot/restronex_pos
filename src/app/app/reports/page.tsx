"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import {
  BarChart3,
  Calendar,
  Printer,
  Receipt,
  RefreshCw,
  X,
  Building2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [dayEnds, setDayEnds] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [loading, setLoading] = useState(false);

  // Close Day-End Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingDate, setClosingDate] = useState(new Date().toISOString().slice(0, 10));
  const [openingFloatRupees, setOpeningFloatRupees] = useState("0");
  const [countedCashRupees, setCountedCashRupees] = useState("");
  const [submittingClose, setSubmittingClose] = useState(false);
  const [activeZReport, setActiveZReport] = useState<any | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/reports").then((r) => r.json()).catch(() => null),
      apiFetch("/api/day-end").then((r) => r.json()).catch(() => []),
      apiFetch("/api/outlets").then((r) => r.json()).catch(() => []),
    ])
      .then(([rep, de, o]) => {
        if (rep) setData(rep);
        if (Array.isArray(de)) setDayEnds(de);
        if (Array.isArray(o)) {
          setOutlets(o);
          if (o.length > 0 && !selectedOutlet) setSelectedOutlet(o[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedOutlet]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleFinalizeDayEnd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOutlet) return alert("Please select an outlet");

    setSubmittingClose(true);
    try {
      const res = await apiFetch("/api/day-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutlet,
          date: closingDate,
          openingFloatPaise: Math.round(parseFloat(openingFloatRupees || "0") * 100),
          countedCashPaise: countedCashRupees
            ? Math.round(parseFloat(countedCashRupees) * 100)
            : undefined,
        }),
      });

      const j = await res.json();
      if (res.ok && j.zReport) {
        setActiveZReport(j.zReport);
        setIsCloseModalOpen(false);
        loadData();
      } else {
        alert(j.error || "Failed to finalize Day-End closing");
      }
    } catch {
      alert("Error finalizing Day-End closing");
    } finally {
      setSubmittingClose(false);
    }
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-sm text-[#718078] bg-white border border-[#E5EBE7] rounded-3xl shadow-xs">
        Loading reports & analytics data…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Reports & Analytics</h1>
          <p className="text-sm text-[#718078]">
            Real database aggregations • Strict paise arithmetic • Financial night audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCloseModalOpen(true)}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Receipt className="h-4 w-4" /> Close Shift & Print Z-Report
          </Button>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-full border-[#E5EBE7] bg-white text-xs font-semibold hover:bg-[#F8FAF9] p-2.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Gross Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{formatINR(data.kpis?.totalSalesPaise || 0)}</div>
            <div className="text-xs text-[#718078] mt-1">{data.definitions?.grossSales || "Gross sales"}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Net Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#16845B]">{formatINR(data.kpis?.netSalesPaise || 0)}</div>
            <div className="text-xs text-[#718078] mt-1">{data.definitions?.netSales || "Net sales"}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Billed Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{data.kpis?.totalOrders ?? data.kpis?.orderCount ?? 0}</div>
            <div className="text-xs text-[#718078] mt-1">Average bill: {formatINR(data.kpis?.avgOrderPaise || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Total Taxes (GST)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{formatINR(data.kpis?.totalTaxPaise || 0)}</div>
            <div className="text-xs text-[#718078] mt-1">CGST + SGST collected</div>
          </CardContent>
        </Card>
      </div>

      {/* Tender Breakdown & Top Items */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Sales by Payment Tender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.salesByMethod && data.salesByMethod.length > 0 ? (
              data.salesByMethod.map((m: any) => (
                <div key={m.method} className="flex justify-between items-center text-sm border-b border-[#E5EBE7] pb-2.5">
                  <span className="font-bold text-[#172B25] flex items-center gap-2">
                    {m.method === "CASH" ? <Banknote className="h-4 w-4 text-emerald-600" /> : m.method === "UPI" ? <QrCode className="h-4 w-4 text-indigo-600" /> : <CreditCard className="h-4 w-4 text-blue-600" />}
                    {m.method}
                  </span>
                  <span className="font-black text-[#16845B]">{formatINR(m.revenue || 0)}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-[#718078] py-4 text-center">No settled payments yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Top Selling Menu Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topItems && data.topItems.length > 0 ? (
              data.topItems.map((it: any) => (
                <div key={it.name} className="flex justify-between items-center text-sm border-b border-[#E5EBE7] pb-2.5">
                  <span className="text-[#172B25] font-medium">{it.name} • {it.qty} sold</span>
                  <span className="font-black text-[#16845B]">{formatINR(it.revenue || 0)}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-[#718078] py-4 text-center">No items sold yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Day-End Audit & Historical Z-Reports */}
      <Card className="bg-white border-[#E5EBE7] shadow-sm">
        <CardHeader className="border-b border-[#E5EBE7] pb-3">
          <CardTitle className="text-[#172B25] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#16845B]" />
              Historical Day-End Closures & Z-Reports
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-[#E5EBE7]">
          {dayEnds.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#718078]">
              No day-ends closed yet. Click <b>Close Shift & Print Z-Report</b> to generate your first audit.
            </div>
          ) : (
            dayEnds.map((d: any) => (
              <div key={d.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-[#F8FAF9]/50 transition">
                <div>
                  <div className="font-extrabold text-[#172B25] flex items-center gap-2">
                    <span>{d.date}</span>
                    <span className="text-xs font-semibold text-[#718078]">
                      • {d.outlet?.name || "Main Outlet"}
                    </span>
                  </div>
                  <div className="text-xs text-[#718078] mt-0.5">
                    {d.orders} orders • Closed {new Date(d.closedAt).toLocaleTimeString()}
                  </div>
                </div>

                <div className="text-right flex items-center gap-4 self-end sm:self-center">
                  <div>
                    <div className="font-black text-base text-[#16845B]">{formatINR(d.salesPaise)}</div>
                    <div className="text-[11px] text-[#718078]">Expenses: {formatINR(d.expensePaise)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Day-End Close Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25] flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#16845B]" />
                Day-End Shift Register Closing
              </h3>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFinalizeDayEnd} className="space-y-3.5">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Outlet *</Label>
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 text-xs text-[#172B25] font-semibold focus:border-[#16845B] focus:outline-none"
                >
                  {outlets.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Audit Date *</Label>
                <Input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  required
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Opening Cash Float in Drawer (₹)</Label>
                <Input
                  type="number"
                  step="any"
                  value={openingFloatRupees}
                  onChange={(e) => setOpeningFloatRupees(e.target.value)}
                  placeholder="e.g. 2000"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
                <span className="text-[10px] text-[#718078] mt-1 block">
                  Petty cash placed in the register at the beginning of the shift.
                </span>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Physical Cash Counted in Drawer (₹)</Label>
                <Input
                  type="number"
                  step="any"
                  value={countedCashRupees}
                  onChange={(e) => setCountedCashRupees(e.target.value)}
                  placeholder="e.g. 14500 (leave blank to auto-match expected)"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-bold"
                />
                <span className="text-[10px] text-[#718078] mt-1 block">
                  Leave blank to auto-match expected POS cash sales.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="flex-1 rounded-full border-[#E5EBE7] text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingClose}
                  className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submittingClose ? "Auditing..." : "Finalize & Print Z-Report"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Z-Report Print Modal */}
      {activeZReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25]">Thermal Z-Report Preview</h3>
              <button
                onClick={() => setActiveZReport(null)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Printable Z-Report Format (80mm width standard) */}
            <div
              id="z-report-printable"
              className="p-4 rounded-xl border border-dashed border-[#16845B] bg-[#F8FAF9] font-mono text-[11px] space-y-2 text-[#172B25]"
            >
              <div className="text-center pb-2 border-b border-black/10">
                <div className="font-bold text-xs uppercase tracking-wider">{activeZReport.tenantName}</div>
                <div className="text-[10px] text-[#718078]">{activeZReport.outletName}</div>
                <div className="font-bold text-xs mt-1 text-[#16845B]">*** DAILY Z-REPORT ***</div>
                <div className="text-[10px] text-[#718078]">Audit Date: {activeZReport.date}</div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>Total Orders:</span>
                  <span className="font-bold">{activeZReport.ordersCount}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Gross Sales:</span>
                  <span>{formatINR(activeZReport.totalSalesPaise)}</span>
                </div>
                <div className="flex justify-between text-[#718078]">
                  <span>GST Collected:</span>
                  <span>{formatINR(activeZReport.totalTaxPaise)}</span>
                </div>
              </div>

              <div className="border-t border-black/10 pt-1 space-y-1">
                <div className="font-bold text-[10px] uppercase text-[#718078]">Payment Tenders:</div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>{formatINR(activeZReport.cashSalesPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>UPI Sales:</span>
                  <span>{formatINR(activeZReport.upiSalesPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card Sales:</span>
                  <span>{formatINR(activeZReport.cardSalesPaise)}</span>
                </div>
              </div>

              <div className="border-t border-black/10 pt-1 space-y-1">
                <div className="font-bold text-[10px] uppercase text-[#718078]">Cash Drawer Reconciliation:</div>
                <div className="flex justify-between text-[#718078]">
                  <span>Opening Float:</span>
                  <span>{formatINR(activeZReport.openingFloatPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Cash:</span>
                  <span className="font-bold">{formatINR(activeZReport.expectedCashPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Counted Cash:</span>
                  <span className="font-bold">{formatINR(activeZReport.countedCashPaise)}</span>
                </div>
                <div
                  className={`flex justify-between font-bold pt-1 border-t border-dashed ${
                    activeZReport.cashVariancePaise < 0 ? "text-red-600" : "text-[#16845B]"
                  }`}
                >
                  <span>Variance:</span>
                  <span>
                    {activeZReport.cashVariancePaise >= 0 ? "+" : ""}
                    {formatINR(activeZReport.cashVariancePaise)}
                  </span>
                </div>
              </div>

              <div className="text-center text-[9px] text-[#718078] pt-2 border-t border-black/10">
                Shift closed at {new Date(activeZReport.closedAt).toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => window.print()}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2 text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print Thermal Z-Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
