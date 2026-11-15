import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { initiatePhonePePayment } from "@/lib/phonepe";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, token } = body;
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { table: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.isPaid) {
    return NextResponse.json({ error: "Order is already paid and settled", isPaid: true }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const qrToken = token || order.table?.qrToken || "table";

  const redirectUrl = `${origin}/order/table/${qrToken}?phonepe_check=1&orderId=${order.id}`;
  const callbackUrl = `${origin}/api/webhooks/phonepe`;

  try {
    const payment = await initiatePhonePePayment({
      tenantId: order.tenantId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountPaise: order.totalPaise,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      redirectUrl,
      callbackUrl,
    });

    // Record PaymentAttempt in DB
    await prisma.paymentAttempt.create({
      data: {
        tenantId: order.tenantId,
        outletId: order.outletId,
        orderId: order.id,
        gatewayType: "PHONEPE",
        razorpayOrderId: payment.merchantTransactionId,
        amountPaise: order.totalPaise,
        currency: "INR",
        status: "INITIATED",
      },
    });

    return NextResponse.json({
      ok: true,
      redirectUrl: payment.redirectUrl,
      merchantTransactionId: payment.merchantTransactionId,
      amountPaise: order.totalPaise,
      orderNumber: order.orderNumber,
    });
  } catch (err: any) {
    console.error("[PhonePe Initiate Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to initiate payment on PhonePe gateway" },
      { status: 500 }
    );
  }
}
