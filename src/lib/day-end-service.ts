import { prisma } from "@/lib/db";
import { appCache } from "@/lib/cache";
import { getTimeZoneDayBoundsUtc } from "@/lib/timezone";

export async function closeOutletDayEnd(params: {
  tenantId: string;
  outletId: string;
  userId?: string | null;
  date?: string | null;
  openingFloatPaise?: number;
  countedCashPaise?: number | null;
}) {
  const outlet = await prisma.outlet.findFirst({
    where: { id: params.outletId, tenantId: params.tenantId },
    include: { tenant: { select: { name: true, timeZone: true } } },
  });

  if (!outlet) {
    return { error: "Invalid outlet", status: 403 as const };
  }

  const bounds = getTimeZoneDayBoundsUtc(params.date, outlet.tenant?.timeZone);

  const [orders, cancelledOrdersCount, payments, expenseAgg, refundsRaw] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        status: { not: "CANCELLED" },
        createdAt: { gte: bounds.startOfDay, lte: bounds.endOfDay },
      },
      select: {
        totalPaise: true,
        subtotalPaise: true,
        taxPaise: true,
        discountPaise: true,
        serviceChargePaise: true,
      },
    }),
    prisma.order.count({
      where: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        status: "CANCELLED",
        createdAt: { gte: bounds.startOfDay, lte: bounds.endOfDay },
      },
    }),
    prisma.payment.findMany({
      where: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        order: { status: { not: "CANCELLED" } },
        createdAt: { gte: bounds.startOfDay, lte: bounds.endOfDay },
      },
      select: { method: true, amountPaise: true, refundedPaise: true },
    }),
    prisma.expense.aggregate({
      where: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        createdAt: { gte: bounds.startOfDay, lte: bounds.endOfDay },
      },
      _sum: { amountPaise: true },
    }),
    prisma.paymentRefund.findMany({
      where: {
        tenantId: params.tenantId,
        status: "PROCESSED",
        createdAt: { gte: bounds.startOfDay, lte: bounds.endOfDay },
      },
      select: { amountPaise: true, orderId: true },
    }),
  ]);

  let refundedPaise = 0;
  if (refundsRaw.length > 0) {
    const refundOrderIds = Array.from(new Set(refundsRaw.map((r) => r.orderId)));
    const outletOrders = await prisma.order.findMany({
      where: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        id: { in: refundOrderIds },
      },
      select: { id: true },
    });
    const outletOrderSet = new Set(outletOrders.map((o) => o.id));
    refundedPaise = refundsRaw
      .filter((r) => outletOrderSet.has(r.orderId))
      .reduce((sum, r) => sum + r.amountPaise, 0);
  }

  const totalSalesPaise = orders.reduce((s, o) => s + o.totalPaise, 0);
  const totalTaxPaise = orders.reduce((s, o) => s + o.taxPaise, 0);
  const totalDiscountPaise = orders.reduce((s, o) => s + o.discountPaise, 0);
  const ordersCount = orders.length;
  const totalExpensePaise = expenseAgg._sum.amountPaise || 0;
  const netSalesPaise = Math.max(0, totalSalesPaise - refundedPaise);

  let cashSalesPaise = 0;
  let upiSalesPaise = 0;
  let cardSalesPaise = 0;
  let onlineSalesPaise = 0;
  let otherSalesPaise = 0;

  for (const p of payments) {
    const netAmount = Math.max(0, p.amountPaise - (p.refundedPaise || 0));
    if (netAmount <= 0) continue;
    const method = (p.method || "").toUpperCase();
    if (method === "CASH") cashSalesPaise += netAmount;
    else if (method === "UPI") upiSalesPaise += netAmount;
    else if (method === "CARD") cardSalesPaise += netAmount;
    else if (method === "RAZORPAY_ONLINE") onlineSalesPaise += netAmount;
    else otherSalesPaise += netAmount;
  }

  const openingFloatPaise = Number.isFinite(params.openingFloatPaise)
    ? Math.max(0, Math.round(params.openingFloatPaise!))
    : 0;
  const expectedCashPaise = openingFloatPaise + cashSalesPaise;
  const countedCashPaise =
    params.countedCashPaise !== undefined &&
    params.countedCashPaise !== null &&
    Number.isFinite(params.countedCashPaise)
      ? Math.round(params.countedCashPaise)
      : expectedCashPaise;
  const cashVariancePaise = countedCashPaise - expectedCashPaise;

  const existing = await prisma.dayEndSummary.findFirst({
    where: {
      tenantId: params.tenantId,
      outletId: params.outletId,
      date: bounds.date,
    },
  });

  const now = new Date();
  const summary = existing
    ? await prisma.dayEndSummary.update({
        where: { id: existing.id },
        data: {
          salesPaise: totalSalesPaise,
          expensePaise: totalExpensePaise,
          orders: ordersCount,
          closedAt: now,
        },
      })
    : await prisma.dayEndSummary.create({
        data: {
          tenantId: params.tenantId,
          outletId: params.outletId,
          date: bounds.date,
          salesPaise: totalSalesPaise,
          expensePaise: totalExpensePaise,
          orders: ordersCount,
          closedAt: now,
        },
      });

  if (params.userId) {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: "DAY_END_CLOSED",
        entity: "DayEndSummary",
        entityId: summary.id,
        metadataJson: JSON.stringify({
          outletId: params.outletId,
          date: bounds.date,
          timeZone: bounds.timeZone,
          salesPaise: totalSalesPaise,
          netSalesPaise,
          refundedPaise,
          ordersCount,
          cancelledOrdersCount,
          cashSalesPaise,
          upiSalesPaise,
          cardSalesPaise,
          onlineSalesPaise,
          countedCashPaise,
          variancePaise: cashVariancePaise,
        }),
      },
    });
  }

  appCache.delPrefix(`report_${params.tenantId}`);

  const zReport = {
    reportType: "DAILY_Z_REPORT",
    date: bounds.date,
    timeZone: bounds.timeZone,
    closedAt: summary.closedAt.toISOString(),
    outletName: outlet.name,
    tenantName: outlet.tenant?.name || "Restaurant",
    ordersCount,
    cancelledOrdersCount,
    totalSalesPaise,
    netSalesPaise,
    refundedPaise,
    totalTaxPaise,
    totalDiscountPaise,
    cashSalesPaise,
    upiSalesPaise,
    cardSalesPaise,
    onlineSalesPaise,
    otherSalesPaise,
    totalExpensePaise,
    openingFloatPaise,
    countedCashPaise,
    expectedCashPaise,
    cashVariancePaise,
  };

  return { summary, zReport };
}
