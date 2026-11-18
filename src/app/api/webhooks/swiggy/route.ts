import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SwiggyIntegrationProvider } from "@/lib/integrations/providers/swiggy/adapter";
import { AggregatorOrderIngestionService } from "@/lib/integrations/services/order-ingestion-service";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = new SwiggyIntegrationProvider();

  try {
    // 1. Verify signature
    const isValid = provider.verifyWebhookSignature(req.headers, rawBody, process.env.SWIGGY_WEBHOOK_SECRET);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type || (payload.order_items ? "ORDER_PLACED" : "ORDER_STATUS_UPDATE");
    const eventId = payload.event_id || payload.delivery_id || `swg_evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 2. Record webhook delivery in AggregatorWebhookEvent for audit trail
    await prisma.aggregatorWebhookEvent.upsert({
      where: {
        provider_eventId: {
          provider: "SWIGGY",
          eventId,
        },
      },
      create: {
        provider: "SWIGGY",
        eventId,
        eventType,
        payloadJson: rawBody,
        status: "RECEIVED",
      },
      update: {
        payloadJson: rawBody,
      },
    });

    // 3. Process payload
    if (eventType === "ORDER_PLACED" || payload.order_items) {
      const normalized = provider.parseOrderPayload(rawBody);
      await AggregatorOrderIngestionService.processOrder(normalized);
    } else if (payload.status === "CANCELLED" || payload.cancel_reason) {
      await AggregatorOrderIngestionService.cancelOrder({
        provider: "SWIGGY",
        providerOrderId: String(payload.order_id),
        reason: payload.cancel_reason,
      });
    } else if (payload.rider) {
      await AggregatorOrderIngestionService.updateRiderStatus({
        provider: "SWIGGY",
        providerOrderId: String(payload.order_id),
        riderName: payload.rider.name,
        riderPhone: payload.rider.phone_number,
        riderStatus: payload.rider.status,
      });
    }

    // Mark webhook event processed
    await prisma.aggregatorWebhookEvent.updateMany({
      where: { provider: "SWIGGY", eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    return NextResponse.json({ status: "SUCCESS", message: "Order processed successfully" }, { status: 200 });
  } catch (err) {
    console.error("[Swiggy Webhook Error]:", err);
    return NextResponse.json({ status: "ACKNOWLEDGED", warning: (err as Error).message }, { status: 200 });
  }
}
