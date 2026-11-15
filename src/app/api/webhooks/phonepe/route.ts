import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appCache } from "@/lib/cache";
import { generateAndPersistInvoicePdf } from "@/lib/invoice-storage";
import { queueAndSendWhatsAppInvoice } from "@/lib/whatsapp-invoice";
import { queueAndDispatchBillPrintJob } from "@/lib/thermal-printer";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const base64Response = body.response;
  if (!base64Response) {
    return NextResponse.json({ error: "Missing base64 response" }, { status: 400 });
  }

  let decoded: any;
  try {
    const jsonStr = Buffer.from(base64Response, "base64").toString("utf-8");
    decoded = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({ error: "Invalid base64 payload" }, { status: 400 });
  }

  const isSuccess = decoded.success === true && decoded.code === "PAYMENT_SUCCESS";
  const merchantTransactionId = decoded.data?.merchantTransactionId;

  if (!isSuccess || !merchantTransactionId) {
    return NextResponse.json({ ok: true, status: "IGNORED" });
  }

  // Find corresponding PaymentAttempt
  const attempt = await prisma.paymentAttempt.findFirst({
    where: { razorpayOrderId: merchantTransactionId, gatewayType: "PHONEPE" },
    orderBy: { createdAt: "desc" },
  });

  if (!attempt) {
    return NextResponse.json({ ok: true, message: "Attempt not found" });
  }

  const order = await prisma.order.findUnique({
    where: { id: attempt.orderId },
    include: { table: true },
  });

  if (!order || order.isPaid) {
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  const now = new Date();
  const utr = decoded.data?.paymentInstrument?.utr || null;
  const transactionId = decoded.data?.transactionId || merchantTransactionId;

  // Atomically settle order
  const settled = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        isPaid: true,
        status: "BILLED",
        paidAt: now,
        billClosedAt: now,
      },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        tenantId: order.tenantId,
        outletId: order.outletId,
        method: "PHONEPE_UPI",
        amountPaise: decoded.data?.amount || order.totalPaise,
        status: "COMPLETED",
        isGatewayConfirmed: true,
        reference: transactionId,
        upiVpa: utr,
      },
    });

    if (order.tableId) {
      await tx.table.update({
        where: { id: order.tableId },
        data: {
          orderTotalPaise: 0,
        },
      });
    }

    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "CAPTURED",
        verifiedAt: now,
      },
    });

    return updated;
  });

  // Invalidate cache
  if (order.table?.qrToken) {
    appCache.del(`qr_table_${order.table.qrToken}`);
  }
  appCache.delPrefix(`report_${order.tenantId}`);

  // Dispatch background tasks
  const origin = req.nextUrl.origin;
  generateAndPersistInvoicePdf(settled.id, origin).catch((e) =>
    console.error("[PhonePe Webhook] PDF error:", e)
  );
  if (settled.customerPhone) {
    queueAndSendWhatsAppInvoice(settled.id, { baseUrl: origin }).catch((e) =>
      console.error("[PhonePe Webhook] WhatsApp invoice error:", e)
    );
  }
  queueAndDispatchBillPrintJob(settled.id, { baseUrl: origin }).catch((e) =>
    console.error("[PhonePe Webhook] Thermal print error:", e)
  );

  return NextResponse.json({ ok: true, verified: true });
}
