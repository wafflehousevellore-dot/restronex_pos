import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [order, queueItem, printJob] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true, whatsappStatus: true, printStatus: true, customerPhone: true },
    }),
    prisma.whatsAppMessageQueue.findFirst({
      where: { orderId, tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.printJob.findFirst({
      where: { orderId, tenantId, jobType: "BILL" },
      include: { printer: { select: { name: true, type: true, paperWidth: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const phone = queueItem?.recipientPhone || order.customerPhone || "";
  const maskedPhone =
    phone.length >= 10
      ? `+${phone.slice(0, 2)} ${phone.slice(2, 4)}*** **${phone.slice(-3)}`
      : phone;

  return NextResponse.json({
    orderId: order.id,
    id: queueItem?.id || null,
    invoiceNumber: queueItem?.invoiceNumber || null,
    recipientPhone: maskedPhone,
    status: queueItem?.status || order.whatsappStatus || "NOT_CONFIGURED",
    wamid: queueItem?.wamid || null,
    error: queueItem?.lastError || null,
    retryCount: queueItem?.retryCount || 0,
    sentAt: queueItem?.sentAt || null,
    deliveredAt: queueItem?.deliveredAt || null,
    readAt: queueItem?.readAt || null,
    pdfUrl: queueItem?.pdfUrl || null,
    printJob: printJob
      ? {
          id: printJob.id,
          status: printJob.status,
          paperWidth: printJob.paperWidth,
          printerName: printJob.printer?.name || null,
          printerType: printJob.printer?.type || null,
          attempts: printJob.attempts,
          lastError: printJob.lastError,
        }
      : {
          id: null,
          status: order.printStatus || "NOT_CONFIGURED",
        },
  });
}
