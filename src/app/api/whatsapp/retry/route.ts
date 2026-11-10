import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { dispatchWhatsAppQueueItem, queueAndSendWhatsAppInvoice } from "@/lib/whatsapp-invoice";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { queueId, orderId } = body;

  if (!queueId && !orderId) {
    return NextResponse.json({ error: "queueId or orderId required" }, { status: 400 });
  }

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let item = null;
  if (queueId) {
    item = await prisma.whatsAppMessageQueue.findFirst({ where: { id: queueId, tenantId } });
  } else if (orderId) {
    item = await prisma.whatsAppMessageQueue.findFirst({
      where: { orderId, tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!item) {
    if (orderId) {
      const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
      if (!order) return NextResponse.json({ error: "Order not found in active tenant" }, { status: 404 });
      const qRes = await queueAndSendWhatsAppInvoice(order.id);
      return NextResponse.json({ ok: qRes.status !== "FAILED", result: qRes });
    }
    return NextResponse.json({ error: "WhatsApp queue record not found" }, { status: 404 });
  }

  // Prevent duplicate delivery if already succeeded
  if (["SENT", "DELIVERED", "READ"].includes(item.status)) {
    return NextResponse.json({
      ok: true,
      queueId: item.id,
      replayed: true,
      result: { success: true, status: item.status, wamid: item.wamid },
    });
  }

  await prisma.whatsAppMessageQueue.update({
    where: { id: item.id },
    data: {
      status: "QUEUED",
      lastError: null,
      updatedAt: new Date(),
    },
  });

  const dispatchResult = await dispatchWhatsAppQueueItem(item.id);

  return NextResponse.json({
    ok: true,
    queueId: item.id,
    result: dispatchResult,
  });
}
