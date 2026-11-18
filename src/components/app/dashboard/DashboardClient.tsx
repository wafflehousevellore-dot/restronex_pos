"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Utensils,
  ShoppingBag,
  Globe,
  Store,
  Calendar,
  AlertTriangle,
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  PackageSearch,
  ExternalLink,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { SummaryCard } from "@/components/ui/summary-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  RevenueTrendChart,
  OrderVolumeChart,
  AovTrendChart,
  OutletComparisonBarChart,
  TrendPoint,
} from "./DashboardCharts";
import { cn } from "@/lib/utils";

export interface DashboardClientProps {
  userName: string;
  businessName: string;
  businessType: string;
  outlets: { id: string; name: string }[];
  selectedOutletId: string; // 'all' or specific id
  selectedRange: string;
  startDate?: string;
  endDate?: string;
  kpis: {
    revenuePaise: number;
    revenueDeltaPct: number | null;
    ordersCount: number;
    ordersDeltaPct: number | null;
    aovPaise: number;
    aovDeltaPct: number | null;
    dineInPaise: number;
    dineInCount: number;
    takeawayPaise: number;
    takeawayCount: number;
    onlinePaise: number;
    onlineCount: number;
    swiggyPaise: number;
    swiggyCount: number;
    zomatoPaise: number;
    zomatoCount: number;
  };
  trendData: TrendPoint[];
  channelBreakdown: {
    channel: string;
    label: string;
    revenuePaise: number;
    orderCount: number;
    percentage: number;
    color: string;
  }[];
  topSellingProducts: {
    id: string;
    name: string;
    imageUrl?: string | null;
    categoryName: string;
    quantitySold: number;
    revenuePaise: number;
    outletName?: string;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    source: string;
    channel?: string | null;
    customerName: string;
    customerPhone?: string | null;
    outletName: string;
    timeFormatted: string;
    totalPaise: number;
    isPaid: boolean;
    status: string;
  }[];
  operations: {
    pendingOrdersCount: number;
    preparingOrdersCount: number;
    readyOrdersCount: number;
    cancelledOrdersCount: number;
    activeKdsTickets: number;
    urgentKdsTickets: number;
    lowStockCount: number;
    outOfStockCount: number;
    criticalStockItems: {
      id: string;
      name: string;
      currentStock: number;
      lowStockThreshold: number;
      unit: string;
    }[];
  };
  outletComparison?: {
    outletId: string;
    name: string;
    revenuePaise: number;
    orders: number;
    aovPaise: number;
    sharePct: number;
    isBestPerforming?: boolean;
  }[];
  periodLabel: string;
}

export function DashboardClient({
  userName,
  businessName,
  businessType,
  outlets,
  selectedOutletId,
  selectedRange,
  startDate: initialStartDate = "",
  endDate: initialEndDate = "",
  kpis,
  trendData,
  channelBreakdown,
  topSellingProducts,
  recentOrders,
  operations,
  outletComparison,
  periodLabel,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeChartTab, setActiveChartTab] = React.useState<"revenue" | "orders" | "aov">("revenue");
  const [customStart, setCustomStart] = React.useState(initialStartDate);
  const [customEnd, setCustomEnd] = React.useState(initialEndDate);
  const [showCustomRange, setShowCustomRange] = React.useState(selectedRange === "custom");
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Time-of-day greeting
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const updateFilters = (newParams: Record<string, string | undefined>) => {
    setIsUpdating(true);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");

    Object.entries(newParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });

    router.push(`/app/dashboard?${params.toString()}`);
    setIsUpdating(false);
  };

  const handleOutletChange = (outletId: string) => {
    updateFilters({ outletId });
  };

  const handleRangeChange = (range: string) => {
    if (range === "custom") {
      setShowCustomRange(true);
      return;
    }
    setShowCustomRange(false);
    updateFilters({ range, from: undefined, to: undefined });
  };

  const handleApplyCustomDates = () => {
    if (customStart && customEnd) {
      updateFilters({ range: "custom", from: customStart, to: customEnd });
    }
  };

  // Top products table columns
  const productColumns: ColumnDef<any>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#F0F4F2] border border-[#E5EBE7] flex items-center justify-center text-xs font-bold text-[#16845B] overflow-hidden shrink-0">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              item.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[#172B25] truncate">{item.name}</div>
            <div className="text-xs text-[#718078] truncate">{item.categoryName}</div>
          </div>
        </div>
      ),
    },
    {
      key: "quantitySold",
      header: "Quantity Sold",
      sortable: true,
      align: "center",
      render: (item) => (
        <span className="font-bold text-[#172B25] bg-[#F8FAF9] border border-[#E5EBE7] px-2.5 py-1 rounded-lg text-xs">
          {item.quantitySold} units
        </span>
      ),
    },
    {
      key: "revenuePaise",
      header: "Total Revenue",
      sortable: true,
      align: "right",
      render: (item) => (
        <span className="font-black text-[#16845B]">{formatINR(item.revenuePaise)}</span>
      ),
    },
    {
      key: "outletName",
      header: "Outlet",
      render: (item) => (
        <span className="text-xs text-[#718078] truncate">{item.outletName || "All Outlets"}</span>
      ),
    },
  ];

  // Recent orders table columns
  const orderColumns: ColumnDef<any>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      sortable: true,
      render: (item) => (
        <Link
          href={`/app/orders?search=${encodeURIComponent(item.orderNumber)}`}
          className="font-bold text-[#16845B] hover:underline flex items-center gap-1 group"
        >
          <span>{item.orderNumber}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ),
    },
    {
      key: "source",
      header: "Channel",
      render: (item) => {
        const channel = (item.channel || item.source || "").toUpperCase();
        let variant: any = "neutral";
        if (channel.includes("SWIGGY")) variant = "warning";
        else if (channel.includes("ZOMATO")) variant = "destructive";
        else if (channel.includes("DINE")) variant = "success";
        else if (channel.includes("QR")) variant = "info";

        return <StatusBadge status={channel} variant={variant} size="sm" />;
      },
    },
    {
      key: "customerName",
      header: "Customer",
      render: (item) => (
        <div>
          <div className="font-semibold text-xs text-[#172B25] truncate">{item.customerName || "Walk-in Customer"}</div>
          {item.customerPhone && <div className="text-[11px] text-[#718078]">{item.customerPhone}</div>}
        </div>
      ),
    },
    {
      key: "outletName",
      header: "Outlet",
      render: (item) => <span className="text-xs text-[#718078]">{item.outletName}</span>,
    },
    {
      key: "timeFormatted",
      header: "Time",
      render: (item) => <span className="text-xs text-[#718078]">{item.timeFormatted}</span>,
    },
    {
      key: "totalPaise",
      header: "Amount",
      sortable: true,
      align: "right",
      render: (item) => (
        <span className={cn("font-bold text-sm", item.status === "CANCELLED" ? "line-through text-[#718078]" : "text-[#16845B]")}>
          {formatINR(item.totalPaise)}
        </span>
      ),
    },
    {
      key: "isPaid",
      header: "Payment",
      align: "center",
      render: (item) => (
        <StatusBadge
          status={item.isPaid ? "PAID" : "UNPAID"}
          variant={item.isPaid ? "success" : "warning"}
          size="sm"
        />
      ),
    },
    {
      key: "status",
      header: "Order Status",
      align: "center",
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3 py-1 text-xs font-bold text-[#16845B]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>RestroNex Owner Operations</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#172B25] tracking-tight">
            {greeting}, {userName}!
          </h1>

          <p className="text-xs sm:text-sm text-[#718078]">
            <span className="font-semibold text-[#172B25]">{businessName}</span> • {businessType} • Real-time operational overview ({periodLabel})
          </p>
        </div>

        {/* Global Controls: Outlet Switcher & Date Range */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Outlet Selector Dropdown */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-1.5 shadow-2xs">
            <Store className="h-4 w-4 text-[#16845B] ml-2 shrink-0" />
            <select
              value={selectedOutletId}
              onChange={(e) => handleOutletChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#172B25] focus:outline-none pr-3 py-1 cursor-pointer"
            >
              <option value="all">🏢 All Outlets (Consolidated)</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  📍 {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Presets */}
          <div className="flex items-center gap-1 rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-1.5 shadow-2xs">
            <Calendar className="h-4 w-4 text-[#718078] ml-2 shrink-0 hidden sm:block" />
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "this_month", label: "This Month" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleRangeChange(p.id)}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-semibold transition-all",
                  selectedRange === p.id
                    ? "bg-[#16845B] text-white shadow-xs"
                    : "text-[#718078] hover:text-[#172B25] hover:bg-white"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="p-2.5 rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-white text-[#718078] hover:text-[#172B25] transition shadow-2xs"
            title="Refresh Dashboard Data"
          >
            <RotateCcw className={cn("h-4 w-4", isUpdating && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers Drawer / Expandable Bar */}
      {showCustomRange && (
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs flex flex-wrap items-center gap-3 animate-in fade-in">
          <span className="text-xs font-bold text-[#172B25]">Custom Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-xl border border-[#E5EBE7] px-3 py-1.5 text-xs text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
            <span className="text-xs text-[#718078]">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-xl border border-[#E5EBE7] px-3 py-1.5 text-xs text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustomDates}
            className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-4 py-1.5 shadow-xs transition"
          >
            Apply Dates
          </button>
        </div>
      )}

      {/* 8 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <SummaryCard
          title="Period Revenue"
          value={formatINR(kpis.revenuePaise)}
          change={
            kpis.revenueDeltaPct !== null
              ? { value: kpis.revenueDeltaPct, label: "vs prior period" }
              : undefined
          }
          icon={DollarSign}
          iconBg="bg-[#E8F5EE] text-[#16845B]"
          action={
            <Link
              href="/app/reports"
              className="text-xs font-bold text-[#16845B] hover:underline flex items-center justify-between"
            >
              <span>View Financial Reports</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        {/* Total Orders */}
        <SummaryCard
          title="Total Orders"
          value={`${kpis.ordersCount} orders`}
          change={
            kpis.ordersDeltaPct !== null
              ? { value: kpis.ordersDeltaPct, label: "order volume" }
              : undefined
          }
          icon={ShoppingCart}
          iconBg="bg-blue-50 text-blue-600"
          action={
            <Link
              href="/app/orders"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-between"
            >
              <span>Browse All Orders</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        {/* Average Order Value (AOV) */}
        <SummaryCard
          title="Average Order Value"
          value={formatINR(kpis.aovPaise)}
          change={
            kpis.aovDeltaPct !== null
              ? { value: kpis.aovDeltaPct, label: "avg bill size" }
              : undefined
          }
          icon={TrendingUp}
          iconBg="bg-purple-50 text-purple-600"
          subtitle={`${kpis.ordersCount > 0 ? "Paise-accurate" : "No orders"}`}
        />

        {/* Dine-In Sales */}
        <SummaryCard
          title="Dine-In Sales"
          value={formatINR(kpis.dineInPaise)}
          subtitle={`${kpis.dineInCount} dine-in tickets`}
          icon={Utensils}
          iconBg="bg-emerald-50 text-emerald-700"
          action={
            <Link
              href="/app/tables"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center justify-between"
            >
              <span>Manage Floor & Tables</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        {/* Takeaway Sales */}
        <SummaryCard
          title="Takeaway Sales"
          value={formatINR(kpis.takeawayPaise)}
          subtitle={`${kpis.takeawayCount} counter pickups`}
          icon={ShoppingBag}
          iconBg="bg-amber-50 text-amber-700"
        />

        {/* Online & QR Direct */}
        <SummaryCard
          title="Direct Online & QR"
          value={formatINR(kpis.onlinePaise)}
          subtitle={`${kpis.onlineCount} contactless orders`}
          icon={Globe}
          iconBg="bg-teal-50 text-teal-700"
          action={
            <Link
              href="/app/settings/integrations"
              className="text-xs font-bold text-teal-700 hover:underline flex items-center justify-between"
            >
              <span>QR & WhatsApp Settings</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        {/* Swiggy Sales */}
        <SummaryCard
          title="Swiggy Delivery"
          value={formatINR(kpis.swiggyPaise)}
          subtitle={`${kpis.swiggyCount} Swiggy orders`}
          icon={Store}
          iconBg="bg-orange-50 text-orange-600"
          action={
            <Link
              href="/app/integrations/online"
              className="text-xs font-bold text-orange-600 hover:underline flex items-center justify-between"
            >
              <span>Swiggy Channel Health</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        {/* Zomato Sales */}
        <SummaryCard
          title="Zomato Delivery"
          value={formatINR(kpis.zomatoPaise)}
          subtitle={`${kpis.zomatoCount} Zomato orders`}
          icon={Store}
          iconBg="bg-red-50 text-red-600"
          action={
            <Link
              href="/app/integrations/online"
              className="text-xs font-bold text-red-600 hover:underline flex items-center justify-between"
            >
              <span>Zomato Channel Health</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
      </div>

      {/* Analytics Charts & Channel Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Visualizer (2 Cols) */}
        <Card className="lg:col-span-2 bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-3">
            <div>
              <CardTitle className="text-base text-[#172B25]">Operational Trends</CardTitle>
              <CardDescription className="text-xs text-[#718078]">
                Hourly / daily pacing across selected period ({periodLabel})
              </CardDescription>
            </div>

            {/* Chart Metric Selector */}
            <div className="flex items-center gap-1 bg-[#F8FAF9] border border-[#E5EBE7] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveChartTab("revenue")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition",
                  activeChartTab === "revenue"
                    ? "bg-[#16845B] text-white shadow-2xs"
                    : "text-[#718078] hover:text-[#172B25]"
                )}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("orders")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition",
                  activeChartTab === "orders"
                    ? "bg-[#16845B] text-white shadow-2xs"
                    : "text-[#718078] hover:text-[#172B25]"
                )}
              >
                Order Volume
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("aov")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition",
                  activeChartTab === "aov"
                    ? "bg-[#16845B] text-white shadow-2xs"
                    : "text-[#718078] hover:text-[#172B25]"
                )}
              >
                AOV
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {activeChartTab === "revenue" && <RevenueTrendChart data={trendData} />}
            {activeChartTab === "orders" && <OrderVolumeChart data={trendData} />}
            {activeChartTab === "aov" && <AovTrendChart data={trendData} />}
          </CardContent>
        </Card>

        {/* Channel Breakdown (1 Col - Distinct, Zero Double Counting) */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#172B25]">Sales by Channel</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Non-overlapping order channel distribution
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {channelBreakdown.length === 0 || kpis.ordersCount === 0 ? (
              <div className="py-12 text-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                No sales recorded for this period.
              </div>
            ) : (
              <div className="space-y-3.5">
                {channelBreakdown.map((item) => (
                  <div key={item.channel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#172B25] flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", item.color)} />
                        <span>{item.label}</span>
                      </span>
                      <span className="font-bold text-[#172B25]">
                        {formatINR(item.revenuePaise)}{" "}
                        <span className="text-[#718078] font-normal text-[11px]">
                          ({item.orderCount} orders)
                        </span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-[#F0F4F2] overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500", item.color)}
                        style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#E5EBE7]/60 text-[11px] text-[#718078] flex items-center justify-between">
              <span>Total Non-Cancelled Orders</span>
              <span className="font-bold text-[#172B25]">{kpis.ordersCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Overview & Live Kitchen / Stock Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending & Kitchen Status */}
        <Link href="/app/kitchen" className="block group">
          <Card className="h-full bg-white border-[#E5EBE7] group-hover:border-[#16845B]/40 shadow-xs transition">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Live Kitchen Tickets
                </span>
                <ChefHat className="h-4 w-4 text-[#16845B]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#172B25]">
                {operations.activeKdsTickets} active
              </div>
              <div
                className={cn(
                  "text-xs font-semibold mt-1",
                  operations.urgentKdsTickets > 0 ? "text-amber-700" : "text-[#16845B]"
                )}
              >
                {operations.urgentKdsTickets > 0
                  ? `⚠️ ${operations.urgentKdsTickets} tickets waiting >15m`
                  : "✓ Kitchen running within SLA"}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Order Fulfillment Pipeline */}
        <Link href="/app/orders" className="block group">
          <Card className="h-full bg-white border-[#E5EBE7] group-hover:border-[#16845B]/40 shadow-xs transition">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Live Pipeline
                </span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#172B25]">
                {operations.preparingOrdersCount + operations.pendingOrdersCount} orders
              </div>
              <div className="text-xs text-[#718078] mt-1">
                {operations.pendingOrdersCount} open • {operations.preparingOrdersCount} cooking • {operations.readyOrdersCount} ready
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Inventory Stock Health */}
        <Link href="/app/inventory" className="block group">
          <Card
            className={cn(
              "h-full border shadow-xs transition group-hover:border-[#16845B]/40",
              operations.lowStockCount > 0 || operations.outOfStockCount > 0
                ? "bg-red-50/40 border-red-200"
                : "bg-white border-[#E5EBE7]"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Stock Alerts
                </span>
                <PackageSearch className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#172B25]">
                {operations.lowStockCount + operations.outOfStockCount} items
              </div>
              <div className="text-xs font-semibold text-red-700 mt-1">
                {operations.outOfStockCount > 0
                  ? `🚨 ${operations.outOfStockCount} out of stock • ${operations.lowStockCount} low`
                  : operations.lowStockCount > 0
                  ? `⚠️ ${operations.lowStockCount} items below threshold`
                  : "✓ All ingredient levels healthy"}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Cancellation Rate */}
        <Link href="/app/orders?status=CANCELLED" className="block group">
          <Card className="h-full bg-white border-[#E5EBE7] group-hover:border-[#16845B]/40 shadow-xs transition">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Cancelled Orders
                </span>
                <XCircle className="h-4 w-4 text-[#718078]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#172B25]">
                {operations.cancelledOrdersCount} cancelled
              </div>
              <div className="text-xs text-[#718078] mt-1">
                {kpis.ordersCount > 0
                  ? `${((operations.cancelledOrdersCount / (kpis.ordersCount + operations.cancelledOrdersCount)) * 100).toFixed(1)}% cancellation rate`
                  : "Zero cancellations"}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Multi-Outlet Comparison (When > 1 Outlet Exists) */}
      {outletComparison && outletComparison.length > 1 && (
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-2">
            <div>
              <CardTitle className="text-base text-[#172B25]">Outlet Performance Comparison</CardTitle>
              <CardDescription className="text-xs text-[#718078]">
                Multi-outlet consolidated benchmark across all authorised locations
              </CardDescription>
            </div>
            <Link
              href="/app/outlets"
              className="text-xs font-bold text-[#16845B] hover:underline flex items-center gap-1"
            >
              <span>Manage Outlets</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>

          <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <div className="lg:col-span-2">
              <OutletComparisonBarChart
                data={outletComparison.map((o) => ({
                  name: o.name,
                  revenuePaise: o.revenuePaise,
                  orders: o.orders,
                }))}
              />
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                Location Summary
              </div>
              {outletComparison.map((item) => (
                <div
                  key={item.outletId}
                  className={cn(
                    "rounded-2xl border p-3 flex items-center justify-between transition",
                    item.isBestPerforming
                      ? "bg-[#E8F5EE]/40 border-[#16845B]/30"
                      : "bg-[#F8FAF9] border-[#E5EBE7]"
                  )}
                >
                  <div>
                    <div className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.isBestPerforming && (
                        <span className="rounded-full bg-[#16845B] text-white text-[9px] font-bold px-1.5 py-0.2">
                          Best
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#718078]">
                      {item.orders} orders • AOV {formatINR(item.aovPaise)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-[#16845B]">
                      {formatINR(item.revenuePaise)}
                    </div>
                    <div className="text-[10px] text-[#718078]">{item.sharePct}% share</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top-Selling Products Grid */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-2">
          <div>
            <CardTitle className="text-base text-[#172B25]">Top-Selling Menu Items</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Highest grossing products across all channels in {periodLabel}
            </CardDescription>
          </div>
          <Link
            href="/app/menu"
            className="text-xs font-bold text-[#16845B] hover:underline flex items-center gap-1"
          >
            <span>Universal Menu Catalog</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <DataTable
            data={topSellingProducts}
            columns={productColumns}
            pageSize={5}
            pageSizeOptions={[5, 10, 25]}
            searchPlaceholder="Search menu item or category..."
            exportFileName={`top-products-${selectedRange}`}
            emptyTitle="No product sales recorded"
            emptyDescription="Menu item sales will automatically rank here once POS or online orders are billed."
          />
        </CardContent>
      </Card>

      {/* Recent Orders Stream */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-2">
          <div>
            <CardTitle className="text-base text-[#172B25]">Live Order Feed</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Most recent restaurant tickets across POS, QR, Delivery & Online
            </CardDescription>
          </div>
          <Link
            href="/app/orders"
            className="text-xs font-bold text-[#16845B] hover:underline flex items-center gap-1"
          >
            <span>Full Order Management</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <DataTable
            data={recentOrders}
            columns={orderColumns}
            pageSize={5}
            pageSizeOptions={[5, 10, 25]}
            searchPlaceholder="Search order number or customer..."
            exportFileName={`recent-orders-${selectedRange}`}
            emptyTitle="No recent orders"
            emptyDescription="Orders placed on the POS, QR menu, Swiggy or Zomato will appear here instantly."
          />
        </CardContent>
      </Card>
    </div>
  );
}
