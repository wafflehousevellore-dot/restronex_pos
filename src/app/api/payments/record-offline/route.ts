import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appCache } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, method = "CASH", amountPaise, reference, notes } = body;
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const tenantId = await resolveTenantId(userId, order.tenantId);
  if (!tenantId || tenantId !== order.tenantId) {
    return NextResponse.json({ error: "Forbidden: Cannot record payments for another tenant" }, { status: 403 });
  }

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const validMethods = ["CASH", "EXTERNAL_CARD", "MANUAL_UPI"];
  const selectedMethod = validMethods.includes(method) ? method : "CASH";

  const paymentAmount = Number(amountPaise) || order.totalPaise;
  const now = new Date();

  // Check existing paid amount
  const alreadyPaid = order.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const newTotalPaid = alreadyPaid + paymentAmount;
  const isFullyPaid = newTotalPaid >= order.totalPaise;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Payment record with explicit flag isGatewayConfirmed: false
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        tenantId,
        outletId: order.outletId,
        method: selectedMethod,
        amountPaise: paymentAmount,
        status: "COMPLETED",
        isGatewayConfirmed: false, // Clearly distinguished from online gateway verified
        reference: reference || (selectedMethod === "CASH" ? "Cash at Counter" : notes || "POS Terminal"),
      },
    });

    // 2. Update Order
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        isPaid: isFullyPaid,
        status: isFullyPaid ? "BILLED" : order.status,
        paidAt: isFullyPaid ? now : order.paidAt,
        billClosedAt: isFullyPaid ? now : order.billClosedAt,
      },
    });

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action: `OFFLINE_PAYMENT_RECORDED_${selectedMethod}`,
        entity: "Payment",
        entityId: payment.id,
        metadataJson: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountPaise: paymentAmount,
          method: selectedMethod,
          isFullyPaid,
          reference,
        }),
      },
    });

    return { payment, order: updatedOrder };
  });

  appCache.delPrefix(`report_${result.order.tenantId}`);

  return NextResponse.json({
    ok: true,
    isPaid: result.order.isPaid,
    paymentId: result.payment.id,
    orderId: result.order.id,
    amountRecorded: result.payment.amountPaise,
    method: result.payment.method,
    isGatewayConfirmed: false,
  });
}

