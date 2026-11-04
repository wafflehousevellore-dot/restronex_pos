import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const method = req.nextUrl.searchParams.get("method");
  const status = req.nextUrl.searchParams.get("status");
  const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50), 100);

  const where: any = { tenantId };
  if (method) where.method = method;
  if (status) where.status = status;

  const [payments, aggregate, refundsAggregate] = await Promise.all([
    prisma.payment.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            type: true,
          },
        },
        refunds: true,
      },
    }),
    prisma.payment.groupBy({
      by: ["method", "isGatewayConfirmed"],
      where: { tenantId, status: "COMPLETED" },
      _sum: { amountPaise: true },
      _count: { id: true },
    }),
    prisma.paymentRefund.aggregate({
      where: { tenantId, status: "PROCESSED" },
      _sum: { amountPaise: true },
      _count: { id: true },
    }),
  ]);

  let totalSalesPaise = 0;
  let onlineGatewayPaise = 0;
  let cashPaise = 0;
  let cardTerminalPaise = 0;
  let upiManualPaise = 0;
  let totalSuccessfulCount = 0;

  for (const group of aggregate) {
    const sum = group._sum.amountPaise || 0;
    const count = group._count.id || 0;
    totalSalesPaise += sum;
    totalSuccessfulCount += count;

    if (group.method === "RAZORPAY_ONLINE" || group.isGatewayConfirmed) {
      onlineGatewayPaise += sum;
    } else if (group.method === "CASH") {
      cashPaise += sum;
    } else if (group.method === "EXTERNAL_CARD" || group.method === "CARD") {
      cardTerminalPaise += sum;
    } else if (group.method === "UPI" || group.method === "MANUAL_UPI") {
      upiManualPaise += sum;
    }
  }

  const totalRefundsPaise = refundsAggregate._sum.amountPaise || 0;
  const totalRefundsCount = refundsAggregate._count.id || 0;

  return NextResponse.json({
    metrics: {
      totalSalesPaise,
      netSalesPaise: Math.max(0, totalSalesPaise - totalRefundsPaise),
      onlineGatewayPaise,
      cashPaise,
      cardTerminalPaise,
      upiManualPaise,
      totalSuccessfulCount,
      totalRefundsPaise,
      totalRefundsCount,
    },
    payments,
  });
}
