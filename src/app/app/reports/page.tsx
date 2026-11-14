"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import type { TenantInsightsReport } from "@/lib/reports-analytics";
import {
  SalesTrendChart,
  HourlyTrafficChart,
} from "@/components/app/ReportsCharts";
import {
  Printer,
  Receipt,
  RefreshCw,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Globe,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Package,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface OutletOption {
  id: string;
  name: string;
}

interface DayEndRow {
  id: string;
  outletId: string;
  outlet?: { id: string; name: string } | null;
  date: string;
  salesPaise: number;
  expensePaise: number;
  orders: number;
  closedAt: string;
}

interface ZReportData {
  reportType: string;
  date: string;
  timeZone?: string;
  closedAt: string;
  outletName: string;
  tenantName: string;
  ordersCount: number;
  cancelledOrdersCount?: number;
  totalSalesPaise: number;
  netSalesPaise?: number;
  refundedPaise?: number;
  totalTaxPaise: number;
  totalDiscountPaise: number;
  cashSalesPaise: number;
  upiSalesPaise: number;
  cardSalesPaise: number;
  onlineSalesPaise?: number;
  otherSalesPaise?: number;
  totalExpensePaise: number;
  openingFloatPaise: number;
  countedCashPaise: number;
  expectedCashPaise: number;
  cashVariancePaise: number;
}

function getLocalDateInput(timeZone = "Asia/Kolkata"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  // Prevent CSV spreadsheet formula injection
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function paiseToRupeesString(paise: number): string {
  return (paise / 100).toFixed(2);
}

const PERIOD_OPTIONS = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 Days" },
  { days: 30, label: "30 Days" },
  { days: 90, label: "90 Days" },
];

export default function Reports() {
  const [data, setData] = useState<TenantInsightsReport | null>(null);
  const [dayEnds, setDayEnds] = useState<DayEndRow[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [filterOutletId, setFilterOutletId] = useState("ALL");
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [loading, setLoading] = useState(false);

  // Close Day-End Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingDate, setClosingDate] = useState(() => getLocalDateInput());
  const [dateTouched, setDateTouched] = useState(false);
  const [openingFloatRupees, setOpeningFloatRupees] = useState("0");
  const [countedCashRupees, setCountedCashRupees] = useState("");
  const [submittingClose, setSubmittingClose] = useState(false);
  const [activeZReport, setActiveZReport] = useState<ZReportData | null>(null);

  const loadData = useCallback(
    (forceRefresh = false) => {
      setLoading(true);
      const reportParams = new URLSearchParams({
        days: String(periodDays),
      });
      if (filterOutletId && filterOutletId !== "ALL") {
        reportParams.set("outletId", filterOutletId);
      }
      if (forceRefresh) {
        reportParams.set("refresh", "1");
      }

      const dayEndParams = new URLSearchParams();
      if (filterOutletId && filterOutletId !== "ALL") {
        dayEndParams.set("outletId", filterOutletId);
      }

      Promise.all([
        apiFetch(`/api/reports?${reportParams.toString()}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        apiFetch(`/api/day-end?${dayEndParams.toString()}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        apiFetch("/api/outlets")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ])
        .then(([rep, de, o]) => {
          if (rep && !rep.error) {
            setData(rep as TenantInsightsReport);
            if (!dateTouched && rep.timeZone) {
              setClosingDate(getLocalDateInput(rep.timeZone));
            }
          }
          if (Array.isArray(de)) setDayEnds(de as DayEndRow[]);
          if (Array.isArray(o)) {
            const typedOutlets = o as OutletOption[];
            setOutlets(typedOutlets);
            if (filterOutletId !== "ALL") {
              setSelectedOutlet(filterOutletId);
            } else if (typedOutlets.length > 0 && !selectedOutlet) {
              setSelectedOutlet(typedOutlets[0].id);
            }
          }
        })
        .finally(() => setLoading(false));
    },
    [periodDays, filterOutletId, dateTouched, selectedOutlet]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  async function handleFinalizeDayEnd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOutlet) return alert("Please select an outlet");
    setSubmittingClose(true);

    try {
      const openingFloatPaise = Math.round(parseFloat(openingFloatRupees || "0") * 100);
      const countedCashPaise = countedCashRupees
        ? Math.round(parseFloat(countedCashRupees) * 100)
        : undefined;

      const res = await apiFetch("/api/day-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutlet,
          date: closingDate,
          openingFloatPaise,
          countedCashPaise,
        }),
      });
      const j = await res.json();
      if (res.ok && j.zReport) {
        setActiveZReport(j.zReport as ZReportData);
        setIsCloseModalOpen(false);
        loadData(true);
      } else {
        alert(j.error || "Failed to close day-end");
      }
    } catch {
      alert("Network error during day-end closing");
    } finally {
      setSubmittingClose(false);
    }
  }

  function handleExportCsv() {
    if (!data) return;
    const rows: string[][] = [
      ["RestroNex Sales & GST Insights Export"],
      ["Generated At", data.generatedAt],
      ["Time Zone", data.timeZone],
      ["Window Days", String(data.periodDays)],
      [
        "Outlet Filter",
        filterOutletId === "ALL"
          ? "All Outlets"
          : outlets.find((o) => o.id === filterOutletId)?.name || filterOutletId,
      ],
      [],
      ["SUMMARY METRICS", "VALUE"],
      ["Gross Sales (INR)", paiseToRupeesString(data.grossSalesPaise)],
      ["Processed Refunds (INR)", paiseToRupeesString(data.refundedPaise)],
      ["Net Collected Revenue (INR)", paiseToRupeesString(data.netSalesPaise)],
      ["Net Taxable Sales Ex-GST (INR)", paiseToRupeesString(data.netSalesBeforeTaxPaise)],
      ["GST / Tax Collected (INR)", paiseToRupeesString(data.taxPaise)],
      ["Discounts Granted (INR)", paiseToRupeesString(data.discountPaise)],
      ["Service Charge (INR)", paiseToRupeesString(data.serviceChargePaise)],
      ["Operating Expenses (INR)", paiseToRupeesString(data.expensesTotalPaise)],
      ["Net After Expenses (INR)", paiseToRupeesString(data.netAfterExpensesPaise)],
      ["Active Orders Count", String(data.ordersCount)],
      ["Cancelled Orders Count", String(data.cancelledOrdersCount)],
      ["Average Order Value (INR)", paiseToRupeesString(data.avgOrderPaise)],
      [],
      ["DAILY SALES BREAKDOWN", "Orders", "Gross Sales (INR)", "GST Tax (INR)"],
      ...data.salesByDay.map((d) => [
        d.date,
        String(d.orders),
        paiseToRupeesString(d.salesPaise),
        paiseToRupeesString(d.taxPaise),
      ]),
      [],
      ["TENDER MIX", "Count", "Net Amount (INR)", "Share (%)"],
      ...data.payments.map((p) => [
        p.method,
        String(p.count),
        paiseToRupeesString(p.amountPaise),
        String(p.sharePct),
      ]),
      [],
      ["TOP SELLING ITEMS", "Category", "Qty Sold", "Revenue (INR)", "Est. Recipe COGS (INR)"],
      ...data.topItems.map((it) => [
        it.name,
        it.category,
        String(it.quantity),
        paiseToRupeesString(it.revenuePaise),
        paiseToRupeesString(it.estimatedCogsPaise),
      ]),
    ];

    const csv = rows
      .map((line) => line.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `restronex-insights-${data.periodDays}d-${getLocalDateInput(data.timeZone)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const tenderBadge = (method: string) => {
    if (method === "CASH") return { icon: Banknote, label: "Cash", color: "bg-emerald-600" };
    if (method === "UPI") return { icon: QrCode, label: "UPI / QR", color: "bg-teal-600" };
    if (method === "CARD") return { icon: CreditCard, label: "Card POS", color: "bg-blue-600" };
    if (method === "RAZORPAY_ONLINE")
      return { icon: Globe, label: "Online Gateway", color: "bg-indigo-600" };
    return { icon: Receipt, label: method, color: "bg-slate-600" };
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172B25] tracking-tight">
            Business Insights & Audit Reports
          </h1>
          <p className="text-xs text-[#718078] mt-1">
            Timezone-accurate revenue, GST, tender reconciliation, recipe COGS & inventory intelligence
            {data?.timeZone ? ` (${data.timeZone})` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Switcher */}
          <div className="inline-flex rounded-full border border-[#E5EBE7] bg-white p-0.5 shadow-2xs">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setPeriodDays(opt.days)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  periodDays === opt.days
                    ? "bg-[#16845B] text-white"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Outlet Filter */}
          {outlets.length > 0 && (
            <select
              aria-label="Filter by outlet"
              value={filterOutletId}
              onChange={(e) => {
                const val = e.target.value;
                setFilterOutletId(val);
                if (val !== "ALL") setSelectedOutlet(val);
              }}
              className="rounded-full border border-[#E5EBE7] bg-white px-3.5 py-2 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Outlets ({outlets.length})</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => loadData(true)}
            disabled={loading}
            className="rounded-full border-[#E5EBE7] text-[#172B25] hover:bg-[#F8FAF9] text-xs font-bold gap-1.5 h-9 px-3.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!data}
            className="rounded-full border-[#E5EBE7] text-[#172B25] hover:bg-[#F8FAF9] text-xs font-bold gap-1.5 h-9 px-3.5 shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#16845B]" />
            Export CSV
          </Button>

          <Button
            type="button"
            onClick={() => {
              if (filterOutletId !== "ALL") setSelectedOutlet(filterOutletId);
              setIsCloseModalOpen(true);
            }}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold gap-1.5 h-9 px-4 shadow-xs cursor-pointer"
          >
            <Receipt className="h-3.5 w-3.5" />
            Close Shift & Z-Report
          </Button>
        </div>
      </div>

      {/* Actionable Insights Banner */}
      {data && data.insights.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.insights.slice(0, 6).map((ins) => {
            const style =
              ins.severity === "critical"
                ? "bg-red-50 border-red-200 text-red-900"
                : ins.severity === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-950"
                : ins.severity === "positive"
                ? "bg-[#E8F5EE] border-[#16845B]/25 text-[#172B25]"
                : "bg-white border-[#E5EBE7] text-[#172B25]";
            return (
              <div
                key={ins.id}
                className={`rounded-2xl border p-3.5 flex items-start gap-3 shadow-2xs ${style}`}
              >
                <div className="mt-0.5 shrink-0">
                  {ins.severity === "critical" || ins.severity === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : ins.severity === "positive" ? (
                    <TrendingUp className="h-4 w-4 text-[#16845B]" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-[#16845B]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold truncate">{ins.title}</span>
                    {ins.metricLabel && (
                      <span className="shrink-0 rounded-full bg-white/80 border border-black/10 px-2 py-0.5 text-[10px] font-black">
                        {ins.metricLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-85 mt-1 leading-relaxed">
                    {ins.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] uppercase tracking-wider text-[#718078] font-bold">
              Gross Sales ({periodDays}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">
              {formatINR(data?.grossSalesPaise || 0)}
            </div>
            <div className="text-[11px] mt-1 flex items-center gap-1 font-semibold">
              {data?.salesGrowthPct != null ? (
                <span
                  className={`inline-flex items-center gap-0.5 ${
                    data.salesGrowthPct >= 0 ? "text-[#16845B]" : "text-red-600"
                  }`}
                >
                  {data.salesGrowthPct >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {data.salesGrowthPct >= 0 ? "+" : ""}
                  {data.salesGrowthPct}% vs prior {periodDays}d
                </span>
              ) : (
                <span className="text-[#718078]">No prior window baseline</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] uppercase tracking-wider text-[#718078] font-bold">
              Net Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#16845B]">
              {formatINR(data?.netSalesPaise || 0)}
            </div>
            <div className="text-[11px] text-[#718078] mt-1">
              {data?.refundedPaise
                ? `After ${formatINR(data.refundedPaise)} refunds`
                : "Excludes cancelled orders"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] uppercase tracking-wider text-[#718078] font-bold">
              Orders & AOV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">
              {data?.ordersCount || 0}
            </div>
            <div className="text-[11px] text-[#718078] mt-1">
              AOV {formatINR(data?.avgOrderPaise || 0)} •{" "}
              <span className="text-[#16845B] font-semibold">
                {data?.cancelledOrdersCount || 0} voided
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] uppercase tracking-wider text-[#718078] font-bold">
              GST & Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">
              {formatINR(data?.taxPaise || 0)}
            </div>
            <div className="text-[11px] text-[#718078] mt-1">
              Disc: {formatINR(data?.discountPaise || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] uppercase tracking-wider text-[#718078] font-bold">
              Net After Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${
                (data?.netAfterExpensesPaise || 0) < 0 ? "text-red-600" : "text-[#172B25]"
              }`}
            >
              {formatINR(data?.netAfterExpensesPaise || 0)}
            </div>
            <div className="text-[11px] text-[#718078] mt-1">
              Exp: {formatINR(data?.expensesTotalPaise || 0)}
              {(data?.foodCostCoveragePct || 0) > 0
                ? ` • COGS: ${formatINR(data?.estimatedFoodCostPaise || 0)}`
                : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] uppercase tracking-wider text-[#718078] font-bold">
              Stock & CRM Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${
                (data?.lowStockCount || 0) > 0 ? "text-amber-600" : "text-[#16845B]"
              }`}
            >
              {data?.lowStockCount || 0} low stock
            </div>
            <div className="text-[11px] text-[#718078] mt-1">
              {data?.customersCount || 0} CRM ({data?.repeatCustomersCount || 0} repeat)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-[#172B25]">Daily Revenue Trend</CardTitle>
              <p className="text-xs text-[#718078] mt-0.5">
                Active non-cancelled orders aggregated in {data?.timeZone || "Asia/Kolkata"}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={data?.salesByDay || []} />
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-[#172B25]">Hourly Rush Distribution</CardTitle>
              <p className="text-xs text-[#718078] mt-0.5">
                Order volume by local hour of day ({data?.timeZone || "Asia/Kolkata"})
              </p>
            </div>
            <Clock className="h-4 w-4 text-[#16845B]" />
          </CardHeader>
          <CardContent>
            <HourlyTrafficChart
              data={data?.hourlyBreakdown || []}
              timeZone={data?.timeZone || "Asia/Kolkata"}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tender Mix + Channel/Outlet + Automation Health */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tender Mix */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#172B25]">Payment Tender Mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.payments || data.payments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                No settled payments in this window.
              </div>
            ) : (
              data.payments.map((p) => {
                const badge = tenderBadge(p.method);
                const Icon = badge.icon;
                return (
                  <div key={p.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-[#172B25]">
                        <Icon className="h-3.5 w-3.5 text-[#16845B]" />
                        <span>{badge.label}</span>
                        <span className="text-[#718078] font-normal">({p.count})</span>
                      </div>
                      <div className="font-black text-[#172B25]">
                        {formatINR(p.amountPaise)}{" "}
                        <span className="text-[10px] font-semibold text-[#718078]">
                          ({p.sharePct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[#F2F6F4] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${badge.color}`}
                        style={{ width: `${Math.min(100, Math.max(2, p.sharePct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Channels, Service Modes & Outlets */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#172B25]">
              Channels, Service Modes & Outlets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078] mb-2">
                Service Modes
              </div>
              {!data?.serviceModeBreakdown || data.serviceModeBreakdown.length === 0 ? (
                <div className="text-xs text-[#718078]">No service mode data yet.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {data.serviceModeBreakdown.map((m) => (
                    <div
                      key={m.mode}
                      className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2"
                    >
                      <div className="text-[10px] font-bold text-[#718078]">{m.mode}</div>
                      <div className="text-sm font-black text-[#172B25]">
                        {formatINR(m.salesPaise)}
                      </div>
                      <div className="text-[10px] text-[#16845B] font-semibold">
                        {m.orders} orders
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data?.outletBreakdown && data.outletBreakdown.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078] mb-2">
                  By Outlet
                </div>
                <div className="space-y-1.5">
                  {data.outletBreakdown.map((o) => (
                    <div
                      key={o.outletId}
                      className="flex items-center justify-between text-xs rounded-xl bg-[#F8FAF9] px-3 py-2 border border-[#E5EBE7]"
                    >
                      <span className="font-bold text-[#172B25] truncate">
                        {o.outletName} ({o.orders})
                      </span>
                      <span className="font-black text-[#16845B]">
                        {formatINR(o.salesPaise)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Automation & Operations Health */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#172B25]">
              Automation & Operations Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3.5 py-2.5">
              <div>
                <div className="font-bold text-[#172B25]">Kitchen Display (KDS)</div>
                <div className="text-[11px] text-[#718078]">
                  {(data?.operations.urgentKdsTickets || 0) > 0
                    ? `${data?.operations.urgentKdsTickets} ticket(s) waiting >15m`
                    : "No overdue tickets"}
                </div>
              </div>
              <Link
                href="/app/kitchen"
                className="font-black text-[#16845B] hover:underline"
              >
                {data?.operations.activeKdsTickets || 0} active →
              </Link>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3.5 py-2.5">
              <div>
                <div className="font-bold text-[#172B25]">WhatsApp Invoice Delivery</div>
                <div className="text-[11px] text-[#718078]">
                  {data?.operations.whatsappConnectedOutlets || 0} connected •{" "}
                  {data?.operations.whatsappSentCount || 0} delivered
                </div>
              </div>
              <span
                className={`font-black ${
                  (data?.operations.whatsappFailedCount || 0) > 0
                    ? "text-amber-600"
                    : "text-[#16845B]"
                }`}
              >
                {(data?.operations.whatsappFailedCount || 0) > 0
                  ? `${data?.operations.whatsappFailedCount} failed`
                  : "Healthy"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3.5 py-2.5">
              <div>
                <div className="font-bold text-[#172B25]">Thermal Bill Printing</div>
                <div className="text-[11px] text-[#718078]">
                  {data?.operations.printersConfigured || 0} printers •{" "}
                  {data?.operations.printSuccessCount || 0} printed
                </div>
              </div>
              <span
                className={`font-black ${
                  (data?.operations.printFailedCount || 0) > 0
                    ? "text-amber-600"
                    : "text-[#16845B]"
                }`}
              >
                {(data?.operations.printFailedCount || 0) > 0
                  ? `${data?.operations.printFailedCount} failed`
                  : "Ready"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3.5 py-2.5">
              <div>
                <div className="font-bold text-[#172B25]">Inventory Valuation</div>
                <div className="text-[11px] text-[#718078]">
                  On-hand cost valuation across catalog
                </div>
              </div>
              <span className="font-black text-[#172B25]">
                {formatINR(data?.inventoryValuePaise || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Items & Low Stock Watchlist */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-[#172B25]">
                Top Selling Menu Items & Category Mix
              </CardTitle>
              <p className="text-xs text-[#718078] mt-0.5">
                Full-period SQL aggregation (uncapped) with recipe COGS where linked
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {!data?.topItems || data.topItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                No menu item sales recorded in this period yet.
              </div>
            ) : (
              <div className="space-y-2">
                {data.topItems.slice(0, 8).map((item, idx) => (
                  <div
                    key={`${item.menuItemId || item.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#172B25] truncate">
                        {idx + 1}. {item.name}
                      </div>
                      <div className="text-[11px] text-[#718078]">
                        {item.category} • {item.quantity} units
                        {item.estimatedCogsPaise > 0
                          ? ` • Est. COGS ${formatINR(item.estimatedCogsPaise)}`
                          : ""}
                      </div>
                    </div>
                    <div className="font-black text-[#16845B] shrink-0 ml-3">
                      {formatINR(item.revenuePaise)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
                <Package className="h-4 w-4 text-[#16845B]" />
                Low-Stock Reorder Watchlist
              </CardTitle>
              <p className="text-xs text-[#718078] mt-0.5">
                Evaluated against each item&apos;s individual reorder threshold
              </p>
            </div>
            <Link
              href="/app/inventory"
              className="text-xs font-bold text-[#16845B] hover:underline"
            >
              Manage Stock →
            </Link>
          </CardHeader>
          <CardContent>
            {!data?.lowStockItems || data.lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#16845B] font-semibold border border-dashed border-[#E5EBE7] rounded-xl bg-[#E8F5EE]/40 flex flex-col items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5" />
                Every inventory item is safely above its reorder threshold.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {data.lowStockItems.map((item) => {
                  const out = item.currentStock <= 0;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${
                        out
                          ? "border-red-200 bg-red-50/70"
                          : "border-amber-200 bg-amber-50/60"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[#172B25]">{item.name}</div>
                        <div className="text-[11px] text-[#718078]">
                          Reorder threshold: {item.lowStockThreshold} {item.unit}
                        </div>
                      </div>
                      <div
                        className={`font-black ${
                          out ? "text-red-700" : "text-amber-700"
                        }`}
                      >
                        {item.currentStock} {item.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Day-Ends */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="border-b border-[#E5EBE7] pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-[#172B25]">
              Daily Shift Closings (Day-End Audit History)
            </CardTitle>
            <p className="text-xs text-[#718078] mt-0.5">
              Immutable shift reconciliation records closed in {data?.timeZone || "Asia/Kolkata"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-[#E5EBE7]">
          {dayEnds.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#718078]">
              No day-ends closed yet. Click <b>Close Shift & Z-Report</b> to generate your first audit.
            </div>
          ) : (
            dayEnds.map((d) => (
              <div
                key={d.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-[#F8FAF9]/50 transition"
              >
                <div>
                  <div className="font-bold text-[#172B25] flex items-center gap-2">
                    <span>Audit Date: {d.date}</span>
                    {d.outlet?.name && (
                      <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-[10px] font-bold text-[#16845B]">
                        {d.outlet.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#718078] mt-0.5">
                    {d.orders} active orders • Expenses {formatINR(d.expensePaise)} • Closed{" "}
                    {new Date(d.closedAt).toLocaleString("en-IN", {
                      timeZone: data?.timeZone || "Asia/Kolkata",
                    })}
                  </div>
                </div>
                <div className="text-base font-black text-[#16845B]">
                  {formatINR(d.salesPaise)}
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
                type="button"
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
                  {outlets.map((o) => (
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
                  onChange={(e) => {
                    setDateTouched(true);
                    setClosingDate(e.target.value);
                  }}
                  required
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">
                  Opening Cash Float in Drawer (₹)
                </Label>
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
                <Label className="text-xs font-bold text-[#172B25]">
                  Physical Cash Counted in Drawer (₹)
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={countedCashRupees}
                  onChange={(e) => setCountedCashRupees(e.target.value)}
                  placeholder="e.g. 14500 (leave blank to auto-match expected)"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-bold"
                />
                <span className="text-[10px] text-[#718078] mt-1 block">
                  Online Razorpay & UPI tenders never inflate physical cash drawer expectations.
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

      {/* Printable Z-Report Modal */}
      {activeZReport && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#E5EBE7] print:shadow-none print:border-none">
            <div className="flex justify-between items-center pb-3 border-b border-[#E5EBE7] print:hidden">
              <span className="text-xs font-extrabold text-[#16845B] uppercase tracking-wider">
                Z-Report Audited
              </span>
              <button
                type="button"
                onClick={() => setActiveZReport(null)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 font-mono text-xs text-[#172B25] space-y-2.5">
              <div className="text-center border-b border-dashed border-[#E5EBE7] pb-2">
                <div className="font-bold text-sm uppercase tracking-wider">
                  {activeZReport.tenantName}
                </div>
                <div className="text-[11px] text-[#718078]">{activeZReport.outletName}</div>
                <div className="text-[11px] text-[#718078]">
                  Audit Date: {activeZReport.date}{" "}
                  {activeZReport.timeZone ? `(${activeZReport.timeZone})` : ""}
                </div>
              </div>

              <div className="space-y-1 border-b border-dashed border-[#E5EBE7] pb-2">
                <div className="flex justify-between">
                  <span>Active Orders:</span>
                  <span className="font-bold">{activeZReport.ordersCount}</span>
                </div>
                {(activeZReport.cancelledOrdersCount || 0) > 0 && (
                  <div className="flex justify-between text-[#718078]">
                    <span>Cancelled (Excluded):</span>
                    <span>{activeZReport.cancelledOrdersCount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Gross Billed Sales:</span>
                  <span className="font-bold">
                    {formatINR(activeZReport.totalSalesPaise)}
                  </span>
                </div>
                {(activeZReport.refundedPaise || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Refunds Processed:</span>
                    <span>-{formatINR(activeZReport.refundedPaise || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes Collected (GST):</span>
                  <span>{formatINR(activeZReport.totalTaxPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discounts Granted:</span>
                  <span>{formatINR(activeZReport.totalDiscountPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expenses Logged:</span>
                  <span>{formatINR(activeZReport.totalExpensePaise)}</span>
                </div>
              </div>

              <div className="space-y-1 border-b border-dashed border-[#E5EBE7] pb-2">
                <div className="text-[10px] font-bold uppercase text-[#718078]">
                  Tender Split
                </div>
                <div className="flex justify-between">
                  <span>Cash Collected:</span>
                  <span>{formatINR(activeZReport.cashSalesPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>UPI / QR:</span>
                  <span>{formatINR(activeZReport.upiSalesPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card POS:</span>
                  <span>{formatINR(activeZReport.cardSalesPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Online / Razorpay:</span>
                  <span>{formatINR(activeZReport.onlineSalesPaise || 0)}</span>
                </div>
              </div>

              <div className="space-y-1 border-b border-dashed border-[#E5EBE7] pb-2">
                <div className="text-[10px] font-bold uppercase text-[#718078]">
                  Cash Drawer Reconciliation
                </div>
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>{formatINR(activeZReport.openingFloatPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-bold">
                    {formatINR(activeZReport.expectedCashPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Counted Cash:</span>
                  <span className="font-bold">
                    {formatINR(activeZReport.countedCashPaise)}
                  </span>
                </div>
                <div
                  className={`flex justify-between font-bold ${
                    activeZReport.cashVariancePaise < 0
                      ? "text-red-600"
                      : "text-[#16845B]"
                  }`}
                >
                  <span>Cash Variance:</span>
                  <span>
                    {activeZReport.cashVariancePaise >= 0 ? "+" : ""}
                    {formatINR(activeZReport.cashVariancePaise)}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-center text-[#718078]">
                Shift closed at {new Date(activeZReport.closedAt).toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2 pt-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 rounded-full border-[#E5EBE7] text-xs font-bold gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </Button>
              <Button
                type="button"
                onClick={() => setActiveZReport(null)}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
