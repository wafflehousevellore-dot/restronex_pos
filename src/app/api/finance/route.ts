import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { getTimeZoneDayBoundsUtc, getTimeZoneRangeBoundsUtc } from "@/lib/timezone";

export interface FinanceSummaryData {
  timeZone: string;
  startDate: string;
  endDate: string;
  selectedOutletId: string | null;
  outlets: Array<{ id: string; name: string; city: string }>;

  // Headline Financial KPIs
  grossSalesPaise: number;
  netSalesPaise: number;
  subtotalPaise: number;
  totalTaxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  discountPaise: number;
  serviceChargePaise: number;
  refundedPaise: number;
  cancelledPaise: number;
  cancelledOrdersCount: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  avgOrderValuePaise: number;
  complimentaryOrdersCount: number;

  // Comparison with Previous Period
  previousGrossSalesPaise: number;
  previousNetSalesPaise: number;
  previousOrdersCount: number;
  salesGrowthPct: number | null;

  // Tender / Payment Method Breakdown
  paymentMethods: Array<{
    method: string;
    label: string;
    amountPaise: number;
    count: number;
    sharePct: number;
  }>;

  // Outlet-wise Financial Breakdown
  outletBreakdown: Array<{
    outletId: string;
    outletName: string;
    city: string;
    ordersCount: number;
    grossSalesPaise: number;
    netSalesPaise: number;
    taxPaise: number;
    discountPaise: number;
    refundedPaise: number;
    avgOrderPaise: number;
  }>;

  // Day-by-Day Financial Trend
  dailyTrends: Array<{
    date: string;
    label: string;
    grossSalesPaise: number;
    netSalesPaise: number;
    taxPaise: number;
    discountPaise: number;
    ordersCount: number;
  }>;

  // Channel Breakdown (Dine-in, Takeaway, Delivery, Aggregators)
  channels: Array<{
    channel: string;
    ordersCount: number;
    salesPaise: number;
    sharePct: number;
  }>;
}

/**
 * GET /api/finance?tenantId=...&outletId=...&days=...&startDate=...&endDate=...
 * Aggregates complete restaurant financial ledger from database records.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timeZone: true, name: true },
  });
  const timeZone = tenant?.timeZone || "Asia/Kolkata";

  const rawOutletId = req.nextUrl.searchParams.get("outletId")?.trim() || null;
  const outletId = rawOutletId && rawOutletId !== "ALL" ? rawOutletId : null;

  const daysParam = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
  const days = Math.max(1, Math.min(365, Number.isFinite(daysParam) ? daysParam : 30));

  const customStartDate = req.nextUrl.searchParams.get("startDate");
  const customEndDate = req.nextUrl.searchParams.get("endDate");

  const now = new Date();
  let currentBounds: { startUtc: Date; endUtc: Date; startStr: string; endStr: string };

  if (customStartDate && customEndDate) {
    const sBounds = getTimeZoneDayBoundsUtc(customStartDate, timeZone);
    const eBounds = getTimeZoneDayBoundsUtc(customEndDate, timeZone);
    currentBounds = {
      startUtc: sBounds.startOfDay,
      endUtc: eBounds.endOfDay,
      startStr: customStartDate,
      endStr: customEndDate,
    };
  } else {
    const rBounds = getTimeZoneRangeBoundsUtc(days, timeZone, now);
    currentBounds = {
      startUtc: rBounds.startDate,
      endUtc: rBounds.endDate,
      startStr: rBounds.startDate.toISOString().split("T")[0],
      endStr: rBounds.endDate.toISOString().split("T")[0],
    };
  }

  // Previous equivalent period for comparison
  const durationMs = currentBounds.endUtc.getTime() - currentBounds.startUtc.getTime();
  const prevStartUtc = new Date(currentBounds.startUtc.getTime() - durationMs);
  const prevEndUtc = new Date(currentBounds.startUtc.getTime() - 1);

  // Fetch Outlets
  const outlets = await prisma.outlet.findMany({
    where: { tenantId, status: "ACTIVE" },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });

  // Query Current Period Orders
  const currentOrders = await prisma.order.findMany({
    where: {
      tenantId,
      ...(outletId ? { outletId } : {}),
      createdAt: { gte: currentBounds.startUtc, lte: currentBounds.endUtc },
    },
    select: {
      id: true,
      outletId: true,
      status: true,
      serviceMode: true,
      channel: true,
      subtotalPaise: true,
      taxPaise: true,
      discountPaise: true,
      serviceChargePaise: true,
      totalPaise: true,
      createdAt: true,
      payments: {
        where: { status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] } },
        select: {
          method: true,
          amountPaise: true,
          refundedPaise: true,
        },
      },
    },
  });

  // Query Previous Period Orders for Growth Calculation
  const prevOrders = await prisma.order.findMany({
    where: {
      tenantId,
      ...(outletId ? { outletId } : {}),
      status: { not: "CANCELLED" },
      createdAt: { gte: prevStartUtc, lte: prevEndUtc },
    },
    select: { totalPaise: true },
  });

  // Query Processed Refunds in Period
  const refunds = await prisma.paymentRefund.findMany({
    where: {
      tenantId,
      status: "PROCESSED",
      createdAt: { gte: currentBounds.startUtc, lte: currentBounds.endUtc },
    },
    select: { amountPaise: true, orderId: true },
  });

  // Calculate Headline Financials
  let grossSalesPaise = 0;
  let subtotalPaise = 0;
  let totalTaxPaise = 0;
  let discountPaise = 0;
  let serviceChargePaise = 0;
  let cancelledPaise = 0;
  let cancelledOrdersCount = 0;
  let completedOrdersCount = 0;
  let complimentaryOrdersCount = 0;

  // Tender Aggregation Map
  const tenderMap: Record<string, { amountPaise: number; count: number }> = {
    CASH: { amountPaise: 0, count: 0 },
    UPI: { amountPaise: 0, count: 0 },
    CARD: { amountPaise: 0, count: 0 },
    RAZORPAY_ONLINE: { amountPaise: 0, count: 0 },
    SWIGGY: { amountPaise: 0, count: 0 },
    ZOMATO: { amountPaise: 0, count: 0 },
    OTHER: { amountPaise: 0, count: 0 },
  };

  // Channel Aggregation Map
  const channelMap: Record<string, { ordersCount: number; salesPaise: number }> = {};

  // Outlet Aggregation Map
  const outletMap: Record<string, { ordersCount: number; grossSalesPaise: number; taxPaise: number; discountPaise: number }> = {};
  for (const o of outlets) {
    outletMap[o.id] = { ordersCount: 0, grossSalesPaise: 0, taxPaise: 0, discountPaise: 0 };
  }

  // Daily Trends Map (keyed by YYYY-MM-DD)
  const dailyMap: Record<string, { grossSalesPaise: number; taxPaise: number; discountPaise: number; ordersCount: number }> = {};

  for (const order of currentOrders) {
    if (order.status === "CANCELLED") {
      cancelledPaise += order.totalPaise;
      cancelledOrdersCount += 1;
      continue;
    }

    completedOrdersCount += 1;
    grossSalesPaise += order.totalPaise;
    subtotalPaise += order.subtotalPaise;
    totalTaxPaise += order.taxPaise;
    discountPaise += order.discountPaise;
    serviceChargePaise += order.serviceChargePaise;

    if (order.totalPaise === 0 && order.discountPaise > 0) {
      complimentaryOrdersCount += 1;
    }

    // Daily mapping
    const dateKey = order.createdAt.toISOString().split("T")[0];
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { grossSalesPaise: 0, taxPaise: 0, discountPaise: 0, ordersCount: 0 };
    }
    dailyMap[dateKey].grossSalesPaise += order.totalPaise;
    dailyMap[dateKey].taxPaise += order.taxPaise;
    dailyMap[dateKey].discountPaise += order.discountPaise;
    dailyMap[dateKey].ordersCount += 1;

    // Outlet mapping
    if (outletMap[order.outletId]) {
      outletMap[order.outletId].ordersCount += 1;
      outletMap[order.outletId].grossSalesPaise += order.totalPaise;
      outletMap[order.outletId].taxPaise += order.taxPaise;
      outletMap[order.outletId].discountPaise += order.discountPaise;
    }

    // Channel mapping
    const chanKey = (order.channel || order.serviceMode || "DINE_IN").toUpperCase();
    if (!channelMap[chanKey]) {
      channelMap[chanKey] = { ordersCount: 0, salesPaise: 0 };
    }
    channelMap[chanKey].ordersCount += 1;
    channelMap[chanKey].salesPaise += order.totalPaise;

    // Payments / Tenders mapping
    for (const p of order.payments) {
      const netPaise = Math.max(0, p.amountPaise - (p.refundedPaise || 0));
      const mKey = (p.method || "").toUpperCase();
      const targetKey = tenderMap[mKey] ? mKey : "OTHER";
      tenderMap[targetKey].amountPaise += netPaise;
      tenderMap[targetKey].count += 1;
    }
  }

  // Calculate Refunds total
  const refundedPaise = refunds.reduce((sum, r) => sum + r.amountPaise, 0);
  const netSalesPaise = Math.max(0, grossSalesPaise - refundedPaise);
  const avgOrderValuePaise = completedOrdersCount > 0 ? Math.round(grossSalesPaise / completedOrdersCount) : 0;

  // Standard Indian GST Split (CGST 50%, SGST 50%) unless IGST
  const cgstPaise = Math.round(totalTaxPaise / 2);
  const sgstPaise = totalTaxPaise - cgstPaise;
  const igstPaise = 0;

  // Previous period totals & growth
  const previousGrossSalesPaise = prevOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const previousNetSalesPaise = previousGrossSalesPaise;
  const previousOrdersCount = prevOrders.length;
  let salesGrowthPct: number | null = null;
  if (previousGrossSalesPaise > 0) {
    salesGrowthPct = Math.round(((grossSalesPaise - previousGrossSalesPaise) / previousGrossSalesPaise) * 100);
  }

  // Format Payment Tenders list
  const TENDER_LABELS: Record<string, string> = {
    CASH: "Cash in Drawer",
    UPI: "UPI QR / Direct",
    CARD: "Card Terminal (EDC)",
    RAZORPAY_ONLINE: "Payment Gateway",
    SWIGGY: "Swiggy Orders",
    ZOMATO: "Zomato Orders",
    OTHER: "Other Tenders",
  };

  const totalTenderPaise = Object.values(tenderMap).reduce((s, t) => s + t.amountPaise, 0);
  const paymentMethods = Object.entries(tenderMap).map(([key, val]) => ({
    method: key,
    label: TENDER_LABELS[key] || key,
    amountPaise: val.amountPaise,
    count: val.count,
    sharePct: totalTenderPaise > 0 ? Math.round((val.amountPaise / totalTenderPaise) * 100) : 0,
  }));

  // Format Outlet Breakdown
  const outletBreakdown = outlets.map((o) => {
    const stats = outletMap[o.id] || { ordersCount: 0, grossSalesPaise: 0, taxPaise: 0, discountPaise: 0 };
    const avg = stats.ordersCount > 0 ? Math.round(stats.grossSalesPaise / stats.ordersCount) : 0;
    return {
      outletId: o.id,
      outletName: o.name,
      city: o.city,
      ordersCount: stats.ordersCount,
      grossSalesPaise: stats.grossSalesPaise,
      netSalesPaise: stats.grossSalesPaise,
      taxPaise: stats.taxPaise,
      discountPaise: stats.discountPaise,
      refundedPaise: 0,
      avgOrderPaise: avg,
    };
  });

  // Format Daily Trends (sorted chronologically)
  const dailyTrends = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, d]) => {
      const dt = new Date(`${dateStr}T00:00:00Z`);
      const label = dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" });
      return {
        date: dateStr,
        label,
        grossSalesPaise: d.grossSalesPaise,
        netSalesPaise: d.grossSalesPaise,
        taxPaise: d.taxPaise,
        discountPaise: d.discountPaise,
        ordersCount: d.ordersCount,
      };
    });

  // Format Channels
  const totalChanPaise = Object.values(channelMap).reduce((s, c) => s + c.salesPaise, 0);
  const channels = Object.entries(channelMap).map(([chan, c]) => ({
    channel: chan,
    ordersCount: c.ordersCount,
    salesPaise: c.salesPaise,
    sharePct: totalChanPaise > 0 ? Math.round((c.salesPaise / totalChanPaise) * 100) : 0,
  }));

  const response: FinanceSummaryData = {
    timeZone,
    startDate: currentBounds.startStr,
    endDate: currentBounds.endStr,
    selectedOutletId: outletId,
    outlets,
    grossSalesPaise,
    netSalesPaise,
    subtotalPaise,
    totalTaxPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    discountPaise,
    serviceChargePaise,
    refundedPaise,
    cancelledPaise,
    cancelledOrdersCount,
    totalOrdersCount: currentOrders.length,
    completedOrdersCount,
    avgOrderValuePaise,
    complimentaryOrdersCount,
    previousGrossSalesPaise,
    previousNetSalesPaise,
    previousOrdersCount,
    salesGrowthPct,
    paymentMethods,
    outletBreakdown,
    dailyTrends,
    channels,
  };

  return NextResponse.json(response);
}
