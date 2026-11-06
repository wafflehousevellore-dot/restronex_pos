import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { formatINR } from "@/lib/money";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { orderId, phone: rawPhone, templateName = "order_invoice_utility", isTest, testPhone } = body;

  // 1. Support Admin Test Message Ping
  if (isTest || testPhone) {
    const tenantId = await resolveTenantId(userId, body.tenantId);
    if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

    const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!mem || mem.role !== "OWNER") return NextResponse.json({ error: "Only owners can send test messages" }, { status: 403 });

    const targetPhone = (testPhone || rawPhone || "").replace(/[^0-9]/g, "");
    if (targetPhone.length < 10) return NextResponse.json({ error: "Valid 10+ digit test phone number required" }, { status: 400 });
    const recipientPhone = targetPhone.length === 10 ? `91${targetPhone}` : targetPhone;

    const setting = await prisma.restaurantSetting.findUnique({ where: { tenantId } });
    const phoneNumberId = setting?.whatsappPhoneNumberId;
    const accessToken = setting?.whatsappAccessToken;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({
        error: "Cannot send test: WhatsApp Phone Number ID and Access Token must be configured first.",
      }, { status: 400 });
    }

    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: {
            preview_url: true,
            body: `🍽️ *RestroNex WhatsApp Integration Test*\n\nThis is a verified test message confirming your Meta WhatsApp Cloud API credentials are configured correctly.\n\nTime: ${new Date().toLocaleString("en-IN")}\nPowered by *RestroNex – Restaurant OS*`,
          },
        }),
      });

      const metaJson = await metaRes.json();
      if (!metaRes.ok) {
        return NextResponse.json({
          ok: false,
          error: metaJson.error?.message || "Meta API returned an error.",
          details: metaJson,
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: "Test message successfully dispatched via Meta WhatsApp Cloud API!",
        messageId: metaJson.messages?.[0]?.id,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to contact Meta WhatsApp endpoint" }, { status: 500 });
    }
  }

  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: { include: { settings: true } },
      outlet: true,
      items: true,
      invoice: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const tenantId = await resolveTenantId(userId, order.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const phone = (rawPhone || order.customerPhone || "").replace(/[^0-9]/g, "");
  if (!phone || phone.length < 10) {
    return NextResponse.json({ error: "Valid 10+ digit mobile number required" }, { status: 400 });
  }

  // Format with country code 91 if 10 digits
  const recipientPhone = phone.length === 10 ? `91${phone}` : phone;

  // Retrieve WhatsApp Cloud credentials from RestaurantSetting or IntegrationConfig
  const phoneNumberId = order.tenant.settings?.whatsappPhoneNumberId;
  const accessToken = order.tenant.settings?.whatsappAccessToken;

  let providerStatus = "SENT";
  let metaMessageId: string | null = null;
  let apiError: string | null = null;

  // If official Meta Cloud API credentials are configured, execute real dispatch
  if (phoneNumberId && accessToken) {
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipientPhone,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: order.customerName || "Valued Guest" },
                    { type: "text", text: order.orderNumber },
                    { type: "text", text: formatINR(order.totalPaise) },
                    { type: "text", text: order.outlet.name },
                  ],
                },
              ],
            },
          }),
        }
      );

      const metaJson = await metaRes.json();
      if (!metaRes.ok) {
        providerStatus = "FAILED";
        apiError = metaJson.error?.message || "Meta WhatsApp Cloud API error";
      } else {
        metaMessageId = metaJson.messages?.[0]?.id || null;
        providerStatus = "DELIVERED";
      }
    } catch (err: any) {
      providerStatus = "FAILED";
      apiError = err.message || "Failed to contact Meta WhatsApp endpoint";
    }
  }

  // Create persistent Delivery Log
  const log = await prisma.whatsAppDeliveryLog.create({
    data: {
      tenantId: order.tenantId,
      outletId: order.outletId,
      orderId: order.id,
      recipientPhone,
      templateName,
      messageId: metaMessageId,
      status: providerStatus,
      errorMessage: apiError,
      metadataJson: JSON.stringify({
        orderNumber: order.orderNumber,
        totalPaise: order.totalPaise,
        invoiceNumber: order.invoice?.invoiceNumber,
      }),
    },
  });

  // Generate verified WhatsApp Direct Web Link as instant fallback
  const billSummary = `*${order.tenant.name} — Invoice*\n` +
    `Order: ${order.orderNumber}\n` +
    `Items:\n${order.items.map((i) => `• ${i.name} × ${i.quantity} — ${formatINR(i.totalPaise)}`).join("\n")}\n` +
    `Total: *${formatINR(order.totalPaise)}*\n` +
    `Thank you for dining with us!`;

  const directWhatsAppUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(billSummary)}`;

  return NextResponse.json({
    ok: providerStatus !== "FAILED",
    logId: log.id,
    status: providerStatus,
    metaMessageId,
    errorMessage: apiError,
    directWhatsAppUrl,
    recipientPhone,
  });
}
