import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const queueItem = await prisma.whatsAppMessageQueue.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  if (!queueItem) {
    return NextResponse.json({ status: "NONE", message: "No WhatsApp delivery queued" });
  }

  // Mask recipient phone: e.g. "919876543210" -> "+91 98*** **210"
  const phone = queueItem.recipientPhone;
  const maskedPhone =
    phone.length >= 10
      ? `+${phone.slice(0, 2)} ${phone.slice(2, 4)}*** **${phone.slice(-3)}`
      : phone;

  return NextResponse.json({
    id: queueItem.id,
    orderId: queueItem.orderId,
    invoiceNumber: queueItem.invoiceNumber,
    recipientPhone: maskedPhone,
    status: queueItem.status,
    wamid: queueItem.wamid,
    error: queueItem.lastError,
    retryCount: queueItem.retryCount,
    sentAt: queueItem.sentAt,
    deliveredAt: queueItem.deliveredAt,
    readAt: queueItem.readAt,
    pdfUrl: queueItem.pdfUrl,
  });
}
