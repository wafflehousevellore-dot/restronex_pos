import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ZomatoIntegrationProvider } from "@/lib/integrations/providers/zomato/adapter";
import { AggregatorOrderIngestionService } from "@/lib/integrations/services/order-ingestion-service";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = new ZomatoIntegrationProvider();

  try {
    const isValid = provider.verifyWebhookSignature(req.headers, rawBody, process.env.ZOMATO_WEBHOOK_SECRET);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type || (payload.items ? "ORDER_PLACED" : "ORDER_STATUS_UPDATE");
    const eventId = payload.event_id || payload.delivery_id || `zom_evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await prisma.aggregatorWebhookEvent.upsert({
      where: {
        provider_eventId: {
          provider: "ZOMATO",
          eventId,
        },
      },
      create: {
        provider: "ZOMATO",
        eventId,
        eventType,
        payloadJson: rawBody,
        status: "RECEIVED",
      },
      update: {
        payloadJson: rawBody,
      },
    });

    if (eventType === "ORDER_PLACED" || payload.items) {
      const normalized = provider.parseOrderPayload(rawBody);
      await AggregatorOrderIngestionService.processOrder(normalized);
    } else if (payload.status === "REJECTED" || payload.status === "CANCELLED" || payload.rejection_reason) {
      await AggregatorOrderIngestionService.cancelOrder({
        provider: "ZOMATO",
        providerOrderId: String(payload.order_id),
        reason: payload.rejection_reason || payload.cancel_reason,
      });
    } else if (payload.delivery_boy) {
      await AggregatorOrderIngestionService.updateRiderStatus({
        provider: "ZOMATO",
        providerOrderId: String(payload.order_id),
        riderName: payload.delivery_boy.name,
        riderPhone: payload.delivery_boy.phone_number,
        riderStatus: payload.delivery_boy.status,
      });
    }

    await prisma.aggregatorWebhookEvent.updateMany({
      where: { provider: "ZOMATO", eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    return NextResponse.json({ status: "SUCCESS", message: "Order processed successfully" }, { status: 200 });
  } catch (err) {
    console.error("[Zomato Webhook Error]:", err);
    return NextResponse.json({ status: "ACKNOWLEDGED", warning: (err as Error).message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ACTIVE",
    provider: "ZOMATO",
    service: "RestroNex Aggregator Webhook Gateway",
    signatureVerification: "Bearer / Secret Token",
  });
}
