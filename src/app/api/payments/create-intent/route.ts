import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveTenantGateway } from "@/lib/tenant-gateway";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId } = body;
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      outlet: true,
      tenant: { select: { id: true, name: true, currency: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.isPaid) return NextResponse.json({ error: "Order is already settled and paid", isPaid: true }, { status: 400 });

  // Resolve tenant-specific payment gateway
  const gateway = await resolveTenantGateway(order.tenantId);

  // If the restaurant hasn't configured Razorpay merchant credentials
  if (gateway.mode === "OFFLINE_ONLY" || !gateway.client || !gateway.keyId) {
    return NextResponse.json({
      onlinePaymentAvailable: false,
      message: `${order.tenant.name} accepts Cash, External Card Terminal, or Direct Staff Payments. Online gateway is not enabled.`,
      acceptedMethods: {
        cash: gateway.cashEnabled,
        cardTerminal: gateway.cardTerminalEnabled,
        upiManual: gateway.upiManualEnabled,
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalPaise: order.totalPaise,
        currency: order.tenant.currency || "INR",
      },
    });
  }

  // Create Razorpay Order specifically under the restaurant's own merchant account
  const receipt = `ord_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now().toString(36)}`;
  try {
    const razorpayOrder = await gateway.client.orders.create({
      amount: order.totalPaise,
      currency: order.tenant.currency || "INR",
      receipt,
      notes: {
        tenantId: order.tenantId,
        outletId: order.outletId,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    // Create payment attempt audit record
    const attempt = await prisma.paymentAttempt.create({
      data: {
        tenantId: order.tenantId,
        outletId: order.outletId,
        orderId: order.id,
        gatewayType: gateway.mode === "ROUTE" ? "PLATFORM_ROUTE" : "DIRECT_RAZORPAY",
        razorpayOrderId: razorpayOrder.id,
        amountPaise: order.totalPaise,
        currency: order.tenant.currency || "INR",
        status: "INITIATED",
      },
    });

    return NextResponse.json({
      onlinePaymentAvailable: true,
      attemptId: attempt.id,
      razorpayOrderId: razorpayOrder.id,
      amountPaise: order.totalPaise,
      currency: order.tenant.currency || "INR",
      keyId: gateway.keyId,
      merchantName: gateway.merchantName,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalPaise: order.totalPaise,
      },
    });
  } catch (err: any) {
    console.error("Failed to create tenant Razorpay order:", err);
    return NextResponse.json(
      {
        error: `Could not initiate online payment: ${err.message || "Gateway communication error"}`,
        onlinePaymentAvailable: false,
      },
      { status: 500 }
    );
  }
}
