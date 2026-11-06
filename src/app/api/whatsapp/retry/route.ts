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

  let item = null;
  if (queueId) {
    item = await prisma.whatsAppMessageQueue.findUnique({ where: { id: queueId } });
  } else if (orderId) {
    item = await prisma.whatsAppMessageQueue.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!item) {
    // If not in queue yet, attempt to queue now
    if (orderId) {
      const qRes = await queueAndSendWhatsAppInvoice(orderId);
      return NextResponse.json({ ok: true, result: qRes });
    }
    return NextResponse.json({ error: "WhatsApp queue record not found" }, { status: 404 });
  }

  const tenantId = await resolveTenantId(userId, item.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: item.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Reset status to QUEUED and trigger dispatch
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
