import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import {
  defaultMetaWhatsAppTransport,
  normalizeWhatsAppPhone,
  queueAndSendWhatsAppInvoice,
  resolveWhatsAppConfig,
} from "@/lib/whatsapp-invoice";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { orderId, outletId, phone: rawPhone, isTest, testPhone } = body;

  // 1. Test Message Ping (uses resolved decrypted credentials strictly server-side)
  if (isTest || testPhone) {
    const tenantId = await resolveTenantId(userId, body.tenantId);
    if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

    const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!mem || !["OWNER", "HEAD_OFFICE", "OUTLET_MANAGER"].includes(mem.role)) {
      return NextResponse.json({ error: "Only owners/managers can send test messages" }, { status: 403 });
    }

    const recipientPhone = normalizeWhatsAppPhone(String(testPhone || rawPhone || ""));
    if (recipientPhone.length < 10) {
      return NextResponse.json({ error: "Valid 10+ digit test phone number required" }, { status: 400 });
    }

    const cfg = await resolveWhatsAppConfig(tenantId, outletId || null);
    if (!cfg.phoneNumberId || !cfg.accessToken) {
      return NextResponse.json(
        {
          error:
            "Cannot send test: WhatsApp Business Phone Number ID and Access Token must be connected first.",
          status: "NOT_CONFIGURED",
        },
        { status: 400 }
      );
    }

    // Send verified ping via Meta Cloud API (Utility template or session ping)
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: {
            preview_url: false,
            body: `🍽️ *RestroNex WhatsApp Integration Test*\n\nYour Meta WhatsApp Business Cloud API connection (${cfg.source}) is verified.\n\nTime: ${new Date().toLocaleString("en-IN")}\nPowered by RestroNex – Restaurant OS.`,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(t);

      const metaJson = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            status: "FAILED",
            error: metaJson.error?.message || `Meta Cloud API HTTP ${metaRes.status}`,
          },
          { status: 400 }
        );
      }

      await prisma.whatsAppDeliveryLog.create({
        data: {
          tenantId,
          outletId: outletId || null,
          recipientPhone,
          templateName: cfg.templateName || "test_ping",
          messageId: metaJson.messages?.[0]?.id || null,
          status: "SENT",
          metadataJson: JSON.stringify({ type: "TEST_PING", source: cfg.source }),
        },
      });

      return NextResponse.json({
        ok: true,
        status: "SENT",
        message: "Test message dispatched via Meta WhatsApp Cloud API!",
        messageId: metaJson.messages?.[0]?.id || null,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Failed to contact Meta WhatsApp endpoint" },
        { status: 500 }
      );
    }
  }

  // 2. Dispatch transactional invoice for an existing order within caller's tenant
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  if (!order) return NextResponse.json({ error: "Order not found in active tenant" }, { status: 404 });

  if (rawPhone && rawPhone.trim()) {
    await prisma.order.update({
      where: { id: order.id },
      data: { customerPhone: rawPhone.trim() },
    });
  }

  const origin = req.nextUrl.origin;
  const result = await queueAndSendWhatsAppInvoice(order.id, {
    baseUrl: origin,
    transport: defaultMetaWhatsAppTransport,
  });

  return NextResponse.json({
    ok: result.status !== "FAILED" && result.status !== "NOT_CONFIGURED",
    ...result,
  });
}
