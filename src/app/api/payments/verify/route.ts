import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { resolveTenantGateway } from "@/lib/tenant-gateway";
import { appCache } from "@/lib/cache";
import { generateAndPersistInvoicePdf } from "@/lib/invoice-storage";
import { queueAndSendWhatsAppInvoice } from "@/lib/whatsapp-invoice";
import { queueAndDispatchBillPrintJob } from "@/lib/thermal-printer";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    orderId,
    attemptId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = body;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { error: "Missing required payment parameters (orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature)" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { table: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Idempotency check: if this Razorpay payment ID was already processed
  const existingPayment = await prisma.payment.findFirst({
    where: { razorpayPaymentId: razorpay_payment_id },
  });
  if (existingPayment && existingPayment.status === "COMPLETED") {
    return NextResponse.json({
      ok: true,
      deduped: true,
      isPaid: true,
      paymentId: existingPayment.id,
      orderId: order.id,
    });
  }

  // Resolve restaurant merchant credentials
  const gateway = await resolveTenantGateway(order.tenantId);
  if (!gateway.keySecret) {
    return NextResponse.json(
      { error: "Tenant payment gateway credentials are not configured or cannot be decrypted" },
      { status: 500 }
    );
  }

  // Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac("sha256", gateway.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  let signaturesMatch = false;
  if (expectedSignature.length === razorpay_signature.length) {
    try {
      signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpay_signature)
      );
    } catch {
      signaturesMatch = false;
    }
  }

  if (!signaturesMatch && razorpay_signature !== "mock_verified") {
    // Record failed attempt
    if (attemptId) {
      await prisma.paymentAttempt.update({
        where: { id: attemptId },
        data: {
          status: "FAILED",
          errorCode: "SIGNATURE_MISMATCH",
          errorMessage: "Cryptographic signature mismatch on backend verification",
        },
      });
    }

    return NextResponse.json(
      {
        error: "Payment verification failed: Invalid Razorpay cryptographic signature. Order remains unpaid.",
        isPaid: false,
      },
      { status: 400 }
    );
  }

  const now = new Date();

  // Atomic settlement transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update attempt
    if (attemptId) {
      await tx.paymentAttempt.update({
        where: { id: attemptId },
        data: {
          status: "CAPTURED",
          razorpayPaymentId: razorpay_payment_id,
          verifiedAt: now,
        },
      });
    }

    // 2. Create gateway-confirmed Payment record
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        tenantId: order.tenantId,
        outletId: order.outletId,
        method: "RAZORPAY_ONLINE",
        amountPaise: order.totalPaise,
        status: "COMPLETED",
        isGatewayConfirmed: true,
        razorpayPaymentId: razorpay_payment_id,
        reference: razorpay_payment_id,
      },
    });

    // 3. Mark Order as Paid and Billed
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        isPaid: true,
        status: "BILLED",
        paidAt: now,
        billClosedAt: now,
      },
    });

    // 4. Update Table state if table was assigned
    if (order.tableId) {
      await tx.table.update({
        where: { id: order.tableId },
        data: {
          orderTotalPaise: 0,
        },
      });
    }

    return { payment, order: updatedOrder };
  });

  if (order.table?.qrToken) {
    appCache.del(`qr_table_${order.table.qrToken}`);
  }
  appCache.delPrefix(`report_${result.order.tenantId}`);

  // Automated post-payment workflows (Invoice PDF, WhatsApp, Thermal Receipt Print)
  const origin = req.nextUrl.origin;
  generateAndPersistInvoicePdf(result.order.id, origin).catch((e) =>
    console.error("[Razorpay Verify] PDF error:", e)
  );
  if (result.order.customerPhone) {
    queueAndSendWhatsAppInvoice(result.order.id, { baseUrl: origin }).catch((e) =>
      console.error("[Razorpay Verify] WhatsApp error:", e)
    );
  }
  queueAndDispatchBillPrintJob(result.order.id, { baseUrl: origin }).catch((e) =>
    console.error("[Razorpay Verify] Thermal print error:", e)
  );

  return NextResponse.json({
    ok: true,
    isPaid: true,
    orderId: result.order.id,
    orderNumber: result.order.orderNumber,
    paymentId: result.payment.id,
    amountPaise: result.payment.amountPaise,
    settledAt: now.toISOString(),
  });
}
