import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveTenantGateway } from "@/lib/tenant-gateway";
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

  const { paymentId, amountPaise, reason = "Customer requested refund" } = body;
  if (!paymentId) return NextResponse.json({ error: "paymentId is required" }, { status: 400 });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });

  const tenantId = await resolveTenantId(userId, payment.order.tenantId);
  if (!tenantId || tenantId !== payment.order.tenantId) {
    return NextResponse.json({ error: "Forbidden: Cannot refund payments for another tenant" }, { status: 403 });
  }

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem || (mem.role !== "OWNER" && mem.role !== "OUTLET_MANAGER")) {
    return NextResponse.json({ error: "Forbidden: Only owners and managers can issue refunds" }, { status: 403 });
  }

  const availableRefundable = payment.amountPaise - payment.refundedPaise;
  const refundAmount = Number(amountPaise) || availableRefundable;

  if (refundAmount <= 0) {
    return NextResponse.json({ error: "Invalid refund amount" }, { status: 400 });
  }

  if (refundAmount > availableRefundable) {
    return NextResponse.json(
      {
        error: `Refund amount (₹${(refundAmount / 100).toFixed(2)}) exceeds maximum refundable amount (₹${(availableRefundable / 100).toFixed(2)})`,
      },
      { status: 400 }
    );
  }

  let razorpayRefundId: string | null = null;

  // If online gateway payment, initiate refund through tenant's Razorpay account
  if (payment.isGatewayConfirmed && payment.razorpayPaymentId) {
    const gateway = await resolveTenantGateway(tenantId);
    if (!gateway.client) {
      return NextResponse.json(
        { error: "Tenant Razorpay gateway is not configured to process automated online refunds" },
        { status: 500 }
      );
    }

    try {
      const rzRefund = await gateway.client.payments.refund(payment.razorpayPaymentId, {
        amount: refundAmount,
        notes: {
          reason,
          orderId: payment.orderId,
          orderNumber: payment.order.orderNumber,
          tenantId,
        },
      });
      razorpayRefundId = rzRefund.id;
    } catch (err: any) {
      console.error("Razorpay refund API call failed:", err);
      return NextResponse.json(
        { error: `Razorpay online refund failed: ${err.message || "Gateway error"}` },
        { status: 500 }
      );
    }
  }

  const now = new Date();
  const updatedTotalRefunded = payment.refundedPaise + refundAmount;
  const isFullRefund = updatedTotalRefunded >= payment.amountPaise;

  const refundRecord = await prisma.$transaction(async (tx) => {
    // 1. Create PaymentRefund record
    const ref = await tx.paymentRefund.create({
      data: {
        tenantId,
        paymentId: payment.id,
        orderId: payment.orderId,
        amountPaise: refundAmount,
        reason,
        status: "PROCESSED",
        razorpayRefundId,
        createdById: userId,
      },
    });

    // 2. Update Payment status & refunded total
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        refundedPaise: updatedTotalRefunded,
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    // 3. Update Order status if full refund
    if (isFullRefund) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: "CANCELLED",
        },
      });
    }

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "PAYMENT_REFUND_PROCESSED",
        entity: "PaymentRefund",
        entityId: ref.id,
        metadataJson: JSON.stringify({
          paymentId: payment.id,
          orderId: payment.orderId,
          refundAmountPaise: refundAmount,
          isFullRefund,
          razorpayRefundId,
        }),
      },
    });

    return ref;
  });

  appCache.delPrefix(`report_${tenantId}`);

  return NextResponse.json({
    ok: true,
    refundId: refundRecord.id,
    amountRefundedPaise: refundAmount,
    razorpayRefundId,
    status: "PROCESSED",
    processedAt: now.toISOString(),
  });
}

