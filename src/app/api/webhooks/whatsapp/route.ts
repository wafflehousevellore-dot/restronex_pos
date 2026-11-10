import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-invoice";

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

function verifyMetaWebhookSignature(rawBody: string, headerSig: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!appSecret) return true; // Not configured yet
  if (!headerSig || !headerSig.startsWith("sha256=")) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(headerSig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Meta WhatsApp Cloud API Webhook Event Receiver
 * Tracks SENT, DELIVERED, READ, FAILED delivery statuses and customer STOP opt-outs.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("x-hub-signature-256");
    if (!verifyMetaWebhookSignature(rawBody, sig)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // 1. Handle delivery & read receipts
        const statuses = value.statuses || [];
        for (const st of statuses) {
          const wamid = st.id;
          const statusStr = String(st.status || "").toUpperCase(); // SENT, DELIVERED, READ, FAILED
          const timestamp = st.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date();
          if (!wamid) continue;

          const queueItem = await prisma.whatsAppMessageQueue.findFirst({
            where: { wamid },
          });
          if (!queueItem) continue;

          const dataToUpdate: any = {
            status: statusStr,
            updatedAt: new Date(),
          };
          if (statusStr === "DELIVERED") {
            dataToUpdate.deliveredAt = timestamp;
          } else if (statusStr === "READ") {
            dataToUpdate.readAt = timestamp;
          } else if (statusStr === "FAILED") {
            dataToUpdate.lastError =
              st.errors?.[0]?.title || st.errors?.[0]?.message || "Delivery failed by provider";
          }

          await prisma.whatsAppMessageQueue.update({
            where: { id: queueItem.id },
            data: dataToUpdate,
          });

          await prisma.order
            .update({
              where: { id: queueItem.orderId },
              data: { whatsappStatus: statusStr },
            })
            .catch(() => {});

          await prisma.whatsAppDeliveryLog.updateMany({
            where: { messageId: wamid },
            data: {
              status: statusStr,
              updatedAt: new Date(),
              errorMessage: dataToUpdate.lastError || null,
            },
          });
        }

        // 2. Handle customer STOP / UNSUBSCRIBE opt-out compliance messages
        const messages = value.messages || [];
        const phoneNumberId = value.metadata?.phone_number_id;
        if (messages.length > 0 && phoneNumberId) {
          const outletCfg = await prisma.outletWhatsAppConfig.findFirst({
            where: { phoneNumberId, status: "CONNECTED" },
            select: { tenantId: true },
          });
          const setting = !outletCfg
            ? await prisma.restaurantSetting.findFirst({
                where: { whatsappPhoneNumberId: phoneNumberId, whatsappConnectionStatus: "CONNECTED" },
                select: { tenantId: true },
              })
            : null;
          const targetTenantId = outletCfg?.tenantId || setting?.tenantId;

          if (targetTenantId) {
            for (const msg of messages) {
              const textBody = String(msg.text?.body || "").trim().toUpperCase();
              if (["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT"].includes(textBody)) {
                const senderPhone = normalizeWhatsAppPhone(String(msg.from || ""));
                if (senderPhone.length >= 10) {
                  await prisma.customerConsent.upsert({
                    where: {
                      tenantId_phone_channel: {
                        tenantId: targetTenantId,
                        phone: senderPhone,
                        channel: "WHATSAPP",
                      },
                    },
                    create: {
                      tenantId: targetTenantId,
                      phone: senderPhone,
                      channel: "WHATSAPP",
                      optIn: false,
                      marketingOptIn: false,
                      optInSource: "WHATSAPP_STOP",
                    },
                    update: {
                      optIn: false,
                      marketingOptIn: false,
                      optInSource: "WHATSAPP_STOP",
                      recordedAt: new Date(),
                    },
                  });
                }
              }
            }
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
