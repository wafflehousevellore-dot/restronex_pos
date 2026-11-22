import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { retryCustomerInvoiceMessage } from "@/lib/messaging/customer-messaging-service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json();
    const { orderId, channel } = body;
    if (!orderId || !channel) {
      return NextResponse.json({ error: "orderId and channel are required" }, { status: 400 });
    }

    if (channel !== "WHATSAPP" && channel !== "SMS") {
      return NextResponse.json({ error: "channel must be WHATSAPP or SMS" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId, tenantId: order.tenantId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const origin = req.nextUrl.origin;
    const result = await retryCustomerInvoiceMessage({
      orderId,
      tenantId: order.tenantId,
      channel,
      baseUrl: origin,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[CustomerMessages] Retry error:", err);
    return NextResponse.json({ error: err.message || "Failed to retry message" }, { status: 500 });
  }
}
