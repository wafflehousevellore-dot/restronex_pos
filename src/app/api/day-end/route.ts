import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const list = await prisma.dayEndSummary.findMany({
    where: { tenantId },
    include: { outlet: true },
    orderBy: { date: "desc" },
    take: 30,
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId || !body.outletId) return NextResponse.json({ error: "outletId required" }, { status: 400 });

  const memChk2 = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk2) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outlet = await prisma.outlet.findFirst({
    where: { id: body.outletId, tenantId },
    include: { tenant: { select: { name: true } } },
  });
  if (!outlet) return NextResponse.json({ error: "Invalid outlet" }, { status: 403 });

  const date = body.date || new Date().toISOString().slice(0, 10);
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  // Fetch all orders & payments for this date
  const [orders, payments, expenseAgg] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        outletId: body.outletId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        totalPaise: true,
        subtotalPaise: true,
        taxPaise: true,
        discountPaise: true,
        serviceChargePaise: true,
        isPaid: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        tenantId,
        outletId: body.outletId,
        status: "COMPLETED",
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { method: true, amountPaise: true },
    }),
    prisma.expense.aggregate({
      where: {
        tenantId,
        outletId: body.outletId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { amountPaise: true },
    }),
  ]);

  const ordersCount = orders.length;
  const totalSalesPaise = orders.reduce((s, o) => s + (o.totalPaise || 0), 0);
  const totalTaxPaise = orders.reduce((s, o) => s + (o.taxPaise || 0), 0);
  const totalDiscountPaise = orders.reduce((s, o) => s + (o.discountPaise || 0), 0);
  const totalExpensePaise = expenseAgg._sum.amountPaise || 0;

  let cashSalesPaise = 0;
  let upiSalesPaise = 0;
  let cardSalesPaise = 0;

  for (const p of payments) {
    if (p.method === "CASH") cashSalesPaise += p.amountPaise;
    else if (p.method === "UPI") upiSalesPaise += p.amountPaise;
    else if (p.method === "CARD") cardSalesPaise += p.amountPaise;
    else cashSalesPaise += p.amountPaise;
  }

  // Counted cash vs expected cash
  const openingFloatPaise = parseInt(body.openingFloatPaise || "0", 10);
  const countedCashPaise = parseInt(body.countedCashPaise || String(cashSalesPaise + openingFloatPaise), 10);
  const expectedCashPaise = openingFloatPaise + cashSalesPaise;
  const cashVariancePaise = countedCashPaise - expectedCashPaise;

  const d = await prisma.dayEndSummary.upsert({
    where: { outletId_date: { outletId: body.outletId, date } },
    create: {
      tenantId,
      outletId: body.outletId,
      date,
      salesPaise: totalSalesPaise,
      expensePaise: totalExpensePaise,
      orders: ordersCount,
      closedAt: new Date(),
    },
    update: {
      salesPaise: totalSalesPaise,
      expensePaise: totalExpensePaise,
      orders: ordersCount,
      closedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "DAY_END_CLOSED",
      entity: "DayEndSummary",
      entityId: d.id,
      metadataJson: JSON.stringify({
        date,
        salesPaise: totalSalesPaise,
        ordersCount,
        countedCashPaise,
        variancePaise: cashVariancePaise,
      }),
    },
  });

  const zReport = {
    reportType: "DAILY_Z_REPORT",
    date,
    closedAt: d.closedAt.toISOString(),
    outletName: outlet.name,
    tenantName: outlet.tenant?.name || "Restaurant",
    ordersCount,
    totalSalesPaise,
    totalTaxPaise,
    totalDiscountPaise,
    cashSalesPaise,
    upiSalesPaise,
    cardSalesPaise,
    totalExpensePaise,
    openingFloatPaise,
    countedCashPaise,
    expectedCashPaise,
    cashVariancePaise,
  };

  return NextResponse.json({ summary: d, zReport });
}
