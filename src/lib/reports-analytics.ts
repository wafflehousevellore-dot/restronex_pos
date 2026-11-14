import { prisma } from "@/lib/db";
import {
  getTimeZoneDateString,
  getTimeZoneHour,
  getTimeZoneRangeBoundsUtc,
  normalizeTimeZone,
} from "@/lib/timezone";

export interface ReportInsightItem {
  id: string;
  severity: "positive" | "info" | "warning" | "critical";
  title: string;
  description: string;
  metricLabel?: string;
}

export interface TenantInsightsReport {
  generatedAt: string;
  timeZone: string;
  periodDays: number;
  selectedOutletId: string | null;
  outlets: Array<{ id: string; name: string; status: string }>;
  // Backward-compatible headline metrics + enriched financial metrics
  grossSalesPaise: number;
  netSalesPaise: number;
  netSalesBeforeTaxPaise: number;
  taxPaise: number;
  discountPaise: number;
  serviceChargePaise: number;
  refundedPaise: number;
  cancelledPaise: number;
  cancelledOrdersCount: number;
  ordersCount: number;
  avgOrderPaise: number;
  previousPeriodSalesPaise: number;
  previousPeriodOrdersCount: number;
  salesGrowthPct: number | null;
  expensesTotalPaise: number;
  netAfterExpensesPaise: number;
  estimatedFoodCostPaise: number;
  foodCostCoveragePct: number;
  expenseBreakdown: Array<{ category: string; amountPaise: number; count: number }>;
  customersCount: number;
  repeatCustomersCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValuePaise: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    lowStockThreshold: number;
    costPerUnitPaise: number;
  }>;
  payments: Array<{
    method: string;
    amountPaise: number;
    count: number;
    sharePct: number;
  }>;
  topItems: Array<{
    menuItemId: string | null;
    name: string;
    category: string;
    quantity: number;
    revenuePaise: number;
    estimatedCogsPaise: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    quantity: number;
    revenuePaise: number;
    sharePct: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    orders: number;
    salesPaise: number;
  }>;
  serviceModeBreakdown: Array<{
    mode: string;
    orders: number;
    salesPaise: number;
  }>;
  outletBreakdown: Array<{
    outletId: string;
    outletName: string;
    orders: number;
    salesPaise: number;
  }>;
  salesByDay: Array<{
    date: string;
    label: string;
    salesPaise: number;
    orders: number;
    taxPaise: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    label: string;
    orders: number;
    salesPaise: number;
  }>;
  operations: {
    activeKdsTickets: number;
    urgentKdsTickets: number;
    whatsappConnectedOutlets: number;
    whatsappSentCount: number;
    whatsappFailedCount: number;
    printersConfigured: number;
    printSuccessCount: number;
    printFailedCount: number;
  };
  recentDayEnds: Array<{
    id: string;
    outletId: string;
    outletName: string;
    date: string;
    salesPaise: number;
    expensePaise: number;
    orders: number;
    closedAt: string;
  }>;
  insights: ReportInsightItem[];
}

function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${String(h).padStart(2, "0")}:00`;
}

export async function computeTenantInsightsReport(params: {
  tenantId: string;
  outletId?: string | null;
  days?: number;
  now?: Date;
}): Promise<TenantInsightsReport> {
  const now = params.now ?? new Date();
  const days = Math.max(1, Math.min(90, Math.floor(params.days ?? 30)));

  const [tenant, outlets] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: { id: true, name: true, timeZone: true },
    }),
    prisma.outlet.findMany({
      where: { tenantId: params.tenantId },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const timeZone = normalizeTimeZone(tenant?.timeZone);
  const validOutlet =
    params.outletId && outlets.some((o) => o.id === params.outletId)
      ? params.outletId
      : null;

  const currentRange = getTimeZoneRangeBoundsUtc(days, timeZone, now);
  const prevRefDate = new Date(currentRange.startDate.getTime() - 1000);
  const prevRange = getTimeZoneRangeBoundsUtc(days, timeZone, prevRefDate);

  const baseOrderWhere: {
    tenantId: string;
    outletId?: string;
    createdAt: { gte: Date; lte: Date };
  } = {
    tenantId: params.tenantId,
    createdAt: { gte: currentRange.startDate, lte: currentRange.endDate },
    ...(validOutlet ? { outletId: validOutlet } : {}),
  };

  const activeOrderWhere = {
    ...baseOrderWhere,
    status: { not: "CANCELLED" as const },
  };

  const prevActiveOrderWhere = {
    tenantId: params.tenantId,
    ...(validOutlet ? { outletId: validOutlet } : {}),
    status: { not: "CANCELLED" as const },
    createdAt: { gte: prevRange.startDate, lte: prevRange.endDate },
  };

  const urgentCutoff = new Date(now.getTime() - 15 * 60 * 1000);

  const [
    activeAgg,
    cancelledAgg,
    prevAgg,
    refundsRaw,
    ordersForSeries,
    payments,
    groupedOrderItems,
    expenseGrouped,
    customersCount,
    repeatCustomersCount,
    inventoryItems,
    waQueueGrouped,
    waOutletsConnected,
    printGrouped,
    printersConfigured,
    activeKdsTickets,
    urgentKdsTickets,
    recentDayEnds,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: activeOrderWhere,
      _sum: {
        subtotalPaise: true,
        taxPaise: true,
        discountPaise: true,
        serviceChargePaise: true,
        totalPaise: true,
      },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { ...baseOrderWhere, status: "CANCELLED" },
      _sum: { totalPaise: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: prevActiveOrderWhere,
      _sum: { totalPaise: true },
      _count: true,
    }),
    prisma.paymentRefund.findMany({
      where: {
        tenantId: params.tenantId,
        status: "PROCESSED",
        createdAt: { gte: currentRange.startDate, lte: currentRange.endDate },
      },
      select: { amountPaise: true, orderId: true },
    }),
    prisma.order.findMany({
      where: activeOrderWhere,
      select: {
        id: true,
        outletId: true,
        type: true,
        serviceMode: true,
        totalPaise: true,
        taxPaise: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        order: { status: { not: "CANCELLED" } },
        createdAt: { gte: currentRange.startDate, lte: currentRange.endDate },
      },
      select: { method: true, amountPaise: true, refundedPaise: true },
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId", "name"],
      where: { order: activeOrderWhere },
      _sum: { quantity: true, totalPaise: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
        createdAt: { gte: currentRange.startDate, lte: currentRange.endDate },
      },
      _sum: { amountPaise: true },
      _count: true,
    }),
    prisma.customer.count({ where: { tenantId: params.tenantId } }),
    prisma.customer.count({
      where: { tenantId: params.tenantId, visitCount: { gte: 2 } },
    }),
    prisma.inventoryItem.findMany({
      where: { tenantId: params.tenantId },
      select: {
        id: true,
        name: true,
        unit: true,
        currentStock: true,
        lowStockThreshold: true,
        costPerUnitPaise: true,
      },
    }),
    prisma.whatsAppMessageQueue.groupBy({
      by: ["status"],
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
        createdAt: { gte: currentRange.startDate, lte: currentRange.endDate },
      },
      _count: true,
    }),
    prisma.outletWhatsAppConfig.count({
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
        status: "CONNECTED",
      },
    }),
    prisma.printJob.groupBy({
      by: ["status"],
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
        createdAt: { gte: currentRange.startDate, lte: currentRange.endDate },
      },
      _count: true,
    }),
    prisma.printerDevice.count({
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
      },
    }),
    prisma.kitchenTicket.count({
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
        status: { in: ["NEW", "PREPARING"] },
      },
    }),
    prisma.kitchenTicket.count({
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
        status: { in: ["NEW", "PREPARING"] },
        createdAt: { lte: urgentCutoff },
      },
    }),
    prisma.dayEndSummary.findMany({
      where: {
        tenantId: params.tenantId,
        ...(validOutlet ? { outletId: validOutlet } : {}),
      },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  const grossSalesPaise = activeAgg._sum.totalPaise || 0;
  const subtotalPaise = activeAgg._sum.subtotalPaise || 0;
  const discountPaise = activeAgg._sum.discountPaise || 0;
  const serviceChargePaise = activeAgg._sum.serviceChargePaise || 0;
  const taxPaise = activeAgg._sum.taxPaise || 0;
  let refundedPaise = 0;
  if (refundsRaw.length > 0) {
    if (validOutlet) {
      const refundOrderIds = Array.from(new Set(refundsRaw.map((r) => r.orderId)));
      const outletOrders = await prisma.order.findMany({
        where: {
          tenantId: params.tenantId,
          outletId: validOutlet,
          id: { in: refundOrderIds },
        },
        select: { id: true },
      });
      const outletOrderSet = new Set(outletOrders.map((o) => o.id));
      refundedPaise = refundsRaw
        .filter((r) => outletOrderSet.has(r.orderId))
        .reduce((sum, r) => sum + r.amountPaise, 0);
    } else {
      refundedPaise = refundsRaw.reduce((sum, r) => sum + r.amountPaise, 0);
    }
  }
  const netSalesBeforeTaxPaise = Math.max(0, subtotalPaise - discountPaise);
  const netSalesPaise = Math.max(0, grossSalesPaise - refundedPaise);
  const ordersCount = activeAgg._count || 0;
  const avgOrderPaise = ordersCount > 0 ? Math.round(grossSalesPaise / ordersCount) : 0;

  const cancelledPaise = cancelledAgg._sum.totalPaise || 0;
  const cancelledOrdersCount = cancelledAgg._count || 0;

  const previousPeriodSalesPaise = prevAgg._sum.totalPaise || 0;
  const previousPeriodOrdersCount = prevAgg._count || 0;
  const salesGrowthPct =
    previousPeriodSalesPaise > 0
      ? Number(
          (
            ((grossSalesPaise - previousPeriodSalesPaise) /
              previousPeriodSalesPaise) *
            100
          ).toFixed(1)
        )
      : null;

  // Tender mix breakdown (uses net amount after partial refunds)
  const paymentBuckets = new Map<string, { amountPaise: number; count: number }>();
  let totalPaymentCollectedPaise = 0;
  for (const p of payments) {
    const netAmount = Math.max(0, p.amountPaise - (p.refundedPaise || 0));
    if (netAmount <= 0) continue;
    const method = (p.method || "OTHER").toUpperCase();
    const prev = paymentBuckets.get(method) || { amountPaise: 0, count: 0 };
    prev.amountPaise += netAmount;
    prev.count += 1;
    paymentBuckets.set(method, prev);
    totalPaymentCollectedPaise += netAmount;
  }

  const paymentsList = Array.from(paymentBuckets.entries())
    .map(([method, v]) => ({
      method,
      amountPaise: v.amountPaise,
      count: v.count,
      sharePct:
        totalPaymentCollectedPaise > 0
          ? Number(((v.amountPaise / totalPaymentCollectedPaise) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  // Daily series (strictly pre-seeded in tenant timezone), Hourly 0..23, Channel, Mode, Outlet
  const dayMap = new Map<
    string,
    { date: string; label: string; salesPaise: number; orders: number; taxPaise: number }
  >();
  for (const key of currentRange.dayKeys) {
    dayMap.set(key, {
      date: key,
      label: formatDayLabel(key),
      salesPaise: 0,
      orders: 0,
      taxPaise: 0,
    });
  }

  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHourLabel(hour),
    orders: 0,
    salesPaise: 0,
  }));

  const channelMap = new Map<string, { orders: number; salesPaise: number }>();
  const serviceModeMap = new Map<string, { orders: number; salesPaise: number }>();
  const outletSalesMap = new Map<string, { orders: number; salesPaise: number }>();
  const outletNameMap = new Map(outlets.map((o) => [o.id, o.name]));

  for (const o of ordersForSeries) {
    const dayKey = getTimeZoneDateString(o.createdAt, timeZone);
    const dayEntry = dayMap.get(dayKey);
    if (dayEntry) {
      dayEntry.salesPaise += o.totalPaise;
      dayEntry.orders += 1;
      dayEntry.taxPaise += o.taxPaise;
    }

    const hour = getTimeZoneHour(o.createdAt, timeZone);
    hourBuckets[hour].orders += 1;
    hourBuckets[hour].salesPaise += o.totalPaise;

    const ch = (o.type || "POS").toUpperCase();
    const chEntry = channelMap.get(ch) || { orders: 0, salesPaise: 0 };
    chEntry.orders += 1;
    chEntry.salesPaise += o.totalPaise;
    channelMap.set(ch, chEntry);

    const sm = (o.serviceMode || "DINE_IN").toUpperCase();
    const smEntry = serviceModeMap.get(sm) || { orders: 0, salesPaise: 0 };
    smEntry.orders += 1;
    smEntry.salesPaise += o.totalPaise;
    serviceModeMap.set(sm, smEntry);

    const olEntry = outletSalesMap.get(o.outletId) || { orders: 0, salesPaise: 0 };
    olEntry.orders += 1;
    olEntry.salesPaise += o.totalPaise;
    outletSalesMap.set(o.outletId, olEntry);
  }

  const salesByDay = Array.from(dayMap.values());

  // Enrich menu items with Category & Recipe COGS
  const soldMenuItemIds = Array.from(
    new Set(
      groupedOrderItems
        .map((row) => row.menuItemId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const menuItemMetadata =
    soldMenuItemIds.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: soldMenuItemIds } },
          select: {
            id: true,
            category: { select: { name: true } },
            recipe: {
              select: {
                yieldQty: true,
                ingredients: {
                  select: {
                    quantity: true,
                    inventoryItem: { select: { costPerUnitPaise: true } },
                  },
                },
              },
            },
          },
        })
      : [];

  const menuMetaMap = new Map<
    string,
    { categoryName: string; unitCogsPaise: number | null }
  >();

  for (const m of menuItemMetadata) {
    let unitCogsPaise: number | null = null;
    if (m.recipe && m.recipe.ingredients.length > 0) {
      const batchCost = m.recipe.ingredients.reduce(
        (sum, ing) => sum + ing.quantity * (ing.inventoryItem?.costPerUnitPaise || 0),
        0
      );
      const yieldQty = m.recipe.yieldQty > 0 ? m.recipe.yieldQty : 1;
      unitCogsPaise = Math.round(batchCost / yieldQty);
    }
    menuMetaMap.set(m.id, {
      categoryName: m.category?.name || "Uncategorized",
      unitCogsPaise,
    });
  }

  let estimatedFoodCostPaise = 0;
  let totalItemRevenuePaise = 0;
  let coveredItemRevenuePaise = 0;
  const catMap = new Map<string, { quantity: number; revenuePaise: number }>();

  const enrichedItems = groupedOrderItems
    .map((row) => {
      const qty = row._sum.quantity || 0;
      const rev = row._sum.totalPaise || 0;
      const meta = row.menuItemId ? menuMetaMap.get(row.menuItemId) : undefined;
      const category = meta?.categoryName || "Custom / Other";
      const itemCogs = meta?.unitCogsPaise != null ? meta.unitCogsPaise * qty : 0;

      totalItemRevenuePaise += rev;
      if (meta?.unitCogsPaise != null) {
        estimatedFoodCostPaise += itemCogs;
        coveredItemRevenuePaise += rev;
      }

      const catEntry = catMap.get(category) || { quantity: 0, revenuePaise: 0 };
      catEntry.quantity += qty;
      catEntry.revenuePaise += rev;
      catMap.set(category, catEntry);

      return {
        menuItemId: row.menuItemId,
        name: row.name,
        category,
        quantity: qty,
        revenuePaise: rev,
        estimatedCogsPaise: itemCogs,
      };
    })
    .sort((a, b) => b.revenuePaise - a.revenuePaise || b.quantity - a.quantity);

  const foodCostCoveragePct =
    totalItemRevenuePaise > 0
      ? Number(((coveredItemRevenuePaise / totalItemRevenuePaise) * 100).toFixed(0))
      : 0;

  const categoryBreakdown = Array.from(catMap.entries())
    .map(([name, v]) => ({
      name,
      quantity: v.quantity,
      revenuePaise: v.revenuePaise,
      sharePct:
        totalItemRevenuePaise > 0
          ? Number(((v.revenuePaise / totalItemRevenuePaise) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.revenuePaise - a.revenuePaise);

  // Expenses
  const expenseBreakdown = expenseGrouped
    .map((e) => ({
      category: e.category || "Other",
      amountPaise: e._sum.amountPaise || 0,
      count: e._count || 0,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);
  const expensesTotalPaise = expenseBreakdown.reduce((s, e) => s + e.amountPaise, 0);
  const netAfterExpensesPaise = netSalesPaise - expensesTotalPaise;

  // Inventory per-item low-stock threshold
  const lowStockAll = inventoryItems.filter(
    (item) => item.currentStock <= item.lowStockThreshold
  );
  const outOfStockCount = inventoryItems.filter((item) => item.currentStock <= 0).length;
  const inventoryValuePaise = inventoryItems.reduce(
    (sum, item) =>
      sum + Math.round(Math.max(0, item.currentStock) * item.costPerUnitPaise),
    0
  );
  const lowStockItems = [...lowStockAll]
    .sort((a, b) => {
      const ratioA = a.lowStockThreshold > 0 ? a.currentStock / a.lowStockThreshold : a.currentStock;
      const ratioB = b.lowStockThreshold > 0 ? b.currentStock / b.lowStockThreshold : b.currentStock;
      return ratioA - ratioB;
    })
    .slice(0, 20);

  // WhatsApp & Print health
  let whatsappSentCount = 0;
  let whatsappFailedCount = 0;
  for (const w of waQueueGrouped) {
    if (["SENT", "DELIVERED", "READ"].includes(w.status)) {
      whatsappSentCount += w._count;
    } else if (w.status === "FAILED") {
      whatsappFailedCount += w._count;
    }
  }

  let printSuccessCount = 0;
  let printFailedCount = 0;
  for (const p of printGrouped) {
    if (["PRINTED", "DISPATCHED"].includes(p.status)) {
      printSuccessCount += p._count;
    } else if (p.status === "FAILED") {
      printFailedCount += p._count;
    }
  }

  // Actionable, grounded insights
  const insights: ReportInsightItem[] = [];

  if (salesGrowthPct !== null) {
    insights.push({
      id: "period-growth",
      severity: salesGrowthPct >= 0 ? "positive" : "warning",
      title:
        salesGrowthPct >= 0
          ? `Revenue up ${salesGrowthPct}% vs previous ${days}d`
          : `Revenue down ${Math.abs(salesGrowthPct)}% vs previous ${days}d`,
      description: `Billed ${ordersCount} non-cancelled orders in this ${days}-day window compared to ${previousPeriodOrdersCount} orders in the preceding ${days} days.`,
      metricLabel: `${salesGrowthPct >= 0 ? "+" : ""}${salesGrowthPct}%`,
    });
  }

  const peakHour = [...hourBuckets].sort(
    (a, b) => b.salesPaise - a.salesPaise || b.orders - a.orders
  )[0];
  if (peakHour && peakHour.orders > 0) {
    insights.push({
      id: "peak-hour",
      severity: "info",
      title: `Peak kitchen rush around ${peakHour.label}`,
      description: `${peakHour.orders} orders (${Math.round(
        (peakHour.orders / Math.max(1, ordersCount)) * 100
      )}% of volume) occurred during the ${peakHour.label} hour (${timeZone}). Schedule prep & counter staff accordingly.`,
      metricLabel: peakHour.label,
    });
  }

  if (enrichedItems.length > 0) {
    const top = enrichedItems[0];
    insights.push({
      id: "top-item",
      severity: "positive",
      title: `Top seller: ${top.name}`,
      description: `Sold ${top.quantity} units across the selected window (${top.category}). Ensure linked ingredients remain stocked above threshold.`,
      metricLabel: `${top.quantity} sold`,
    });
  }

  if (totalPaymentCollectedPaise > 0) {
    const cashAmount =
      paymentsList.find((p) => p.method === "CASH")?.amountPaise || 0;
    const digitalShare = Math.round(
      ((totalPaymentCollectedPaise - cashAmount) / totalPaymentCollectedPaise) * 100
    );
    insights.push({
      id: "digital-share",
      severity: "info",
      title: `${digitalShare}% digital payment adoption`,
      description: `Cash accounted for ${100 - digitalShare}% of collected tenders while UPI, cards, and online checkout captured ${digitalShare}%.`,
      metricLabel: `${digitalShare}% Digital`,
    });
  }

  if (lowStockAll.length > 0) {
    insights.push({
      id: "low-stock",
      severity: outOfStockCount > 0 ? "critical" : "warning",
      title: `${lowStockAll.length} inventory item${lowStockAll.length === 1 ? "" : "s"} below reorder level`,
      description:
        outOfStockCount > 0
          ? `${outOfStockCount} item(s) are completely out of stock (${lowStockItems[0]?.name}). Restock immediately to avoid POS blockers.`
          : `Lowest item: ${lowStockItems[0]?.name} (${lowStockItems[0]?.currentStock} ${lowStockItems[0]?.unit} remaining vs threshold ${lowStockItems[0]?.lowStockThreshold}).`,
      metricLabel: `${lowStockAll.length} Low`,
    });
  }

  if (whatsappFailedCount > 0 || printFailedCount > 0) {
    insights.push({
      id: "ops-failures",
      severity: "warning",
      title: `Automation attention needed`,
      description: `${whatsappFailedCount} failed WhatsApp invoice deliveries and ${printFailedCount} failed print jobs in this period. Check Queue & Printers to retry.`,
      metricLabel: `${whatsappFailedCount + printFailedCount} Failed`,
    });
  }

  if (cancelledOrdersCount > 0) {
    insights.push({
      id: "cancellations",
      severity: cancelledOrdersCount >= 5 ? "warning" : "info",
      title: `${cancelledOrdersCount} cancelled order${cancelledOrdersCount === 1 ? "" : "s"} excluded from sales`,
      description: `Cancelled orders have been excluded from gross sales, AOV, and tax totals for audit accuracy.`,
      metricLabel: `${cancelledOrdersCount} Voided`,
    });
  }

  return {
    generatedAt: now.toISOString(),
    timeZone,
    periodDays: days,
    selectedOutletId: validOutlet,
    outlets,
    grossSalesPaise,
    netSalesPaise,
    netSalesBeforeTaxPaise,
    taxPaise,
    discountPaise,
    serviceChargePaise,
    refundedPaise,
    cancelledPaise,
    cancelledOrdersCount,
    ordersCount,
    avgOrderPaise,
    previousPeriodSalesPaise,
    previousPeriodOrdersCount,
    salesGrowthPct,
    expensesTotalPaise,
    netAfterExpensesPaise,
    estimatedFoodCostPaise,
    foodCostCoveragePct,
    expenseBreakdown,
    customersCount,
    repeatCustomersCount,
    lowStockCount: lowStockAll.length,
    outOfStockCount,
    inventoryValuePaise,
    lowStockItems,
    payments: paymentsList,
    topItems: enrichedItems.slice(0, 15),
    categoryBreakdown,
    channelBreakdown: Array.from(channelMap.entries())
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.salesPaise - a.salesPaise),
    serviceModeBreakdown: Array.from(serviceModeMap.entries())
      .map(([mode, v]) => ({ mode, ...v }))
      .sort((a, b) => b.salesPaise - a.salesPaise),
    outletBreakdown: Array.from(outletSalesMap.entries())
      .map(([outletId, v]) => ({
        outletId,
        outletName: outletNameMap.get(outletId) || "Outlet",
        ...v,
      }))
      .sort((a, b) => b.salesPaise - a.salesPaise),
    salesByDay,
    hourlyBreakdown: hourBuckets,
    operations: {
      activeKdsTickets,
      urgentKdsTickets,
      whatsappConnectedOutlets: waOutletsConnected,
      whatsappSentCount,
      whatsappFailedCount,
      printersConfigured,
      printSuccessCount,
      printFailedCount,
    },
    recentDayEnds: recentDayEnds.map((d) => ({
      id: d.id,
      outletId: d.outletId,
      outletName: outletNameMap.get(d.outletId) || "Outlet",
      date: d.date,
      salesPaise: d.salesPaise,
      expensePaise: d.expensePaise,
      orders: d.orders,
      closedAt: d.closedAt.toISOString(),
    })),
    insights,
  };
}
