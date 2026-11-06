import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "restronex_whatsapp_verify_token_2026";

/**
 * Meta WhatsApp Cloud API Webhook Verification (hub.challenge)
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden: verification token mismatch" }, { status: 403 });
}

/**
 * Meta WhatsApp Cloud API Webhook Status Event Receiver
 * Tracks DELIVERED, READ, and FAILED states in real time.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        const statuses = value.statuses || [];
        for (const st of statuses) {
          const wamid = st.id;
          const statusStr = (st.status || "").toUpperCase(); // SENT, DELIVERED, READ, FAILED
          const timestamp = st.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date();

          if (!wamid) continue;

          // Find queue item by wamid
          const queueItem = await prisma.whatsAppMessageQueue.findFirst({
            where: { wamid },
          });

          if (queueItem) {
            const dataToUpdate: any = {
              status: statusStr,
              updatedAt: new Date(),
            };

            if (statusStr === "DELIVERED") {
              dataToUpdate.deliveredAt = timestamp;
            } else if (statusStr === "READ") {
              dataToUpdate.readAt = timestamp;
            } else if (statusStr === "FAILED") {
              dataToUpdate.lastError = st.errors?.[0]?.title || st.errors?.[0]?.message || "Delivery failed by provider";
            }

            await prisma.whatsAppMessageQueue.update({
              where: { id: queueItem.id },
              data: dataToUpdate,
            });

            // Update order whatsappStatus
            await prisma.order.update({
              where: { id: queueItem.orderId },
              data: { whatsappStatus: statusStr },
            }).catch(() => {});

            // Update delivery log
            await prisma.whatsAppDeliveryLog.updateMany({
              where: { messageId: wamid },
              data: {
                status: statusStr,
                updatedAt: new Date(),
                errorMessage: dataToUpdate.lastError || null,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[WhatsApp Webhook] Processing error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
