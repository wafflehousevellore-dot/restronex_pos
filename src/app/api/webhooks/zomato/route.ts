import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ZomatoIntegrationProvider } from "@/lib/integrations/providers/zomato/adapter";
import { AggregatorOrderIngestionService } from "@/lib/integrations/services/order-ingestion-service";
import { AggregatorConnectionService } from "@/lib/integrations/services/connection-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = new ZomatoIntegrationProvider();

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  // 1. Resolve tenant-specific or platform webhook secret
  let resolvedSecret = process.env.ZOMATO_WEBHOOK_SECRET;
  let resolvedTenantId: string | undefined = undefined;
  let resolvedOutletId: string | undefined = undefined;

  const rawStoreId = payload?.res_id || payload?.restaurant_id || payload?.store_id;
  if (rawStoreId) {
    try {
      const mapping = await prisma.aggregatorOutletMapping.findFirst({
        where: {
          provider: "ZOMATO",
          providerStoreId: String(rawStoreId),
        },
      });

      if (mapping) {
        resolvedTenantId = mapping.tenantId;
        resolvedOutletId = mapping.outletId;
        const conn = await prisma.aggregatorConnection.findUnique({
          where: { tenantId_provider: { tenantId: mapping.tenantId, provider: "ZOMATO" } },
        });
        const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);
        if (creds?.webhookSecret || creds?.apiKey) {
          resolvedSecret = creds.webhookSecret || creds.apiKey;
        }
      }
    } catch (e) {
      console.warn("[Zomato Webhook] Store mapping resolution warning:", e);
    }
  }

  // 2. Cryptographic signature verification
  const isValid = provider.verifyWebhookSignature(req.headers, rawBody, resolvedSecret);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const eventType = payload.event_type || (payload.items ? "ORDER_PLACED" : "ORDER_STATUS_UPDATE");
  const eventId = payload.event_id || payload.delivery_id || `zom_evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const orderId = payload.order_id ? String(payload.order_id) : undefined;

  try {
    // 3. Record webhook event in AggregatorWebhookEvent with tenant context
    await prisma.aggregatorWebhookEvent.upsert({
      where: {
        provider_eventId: {
          provider: "ZOMATO",
          eventId,
        },
      },
      create: {
        tenantId: resolvedTenantId,
        provider: "ZOMATO",
        eventId,
        eventType,
        payloadJson: rawBody,
        status: "RECEIVED",
      },
      update: {
        tenantId: resolvedTenantId,
        payloadJson: rawBody,
      },
    });

    // 4. Route and process event
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

    // 5. Mark webhook event processed
    await prisma.aggregatorWebhookEvent.updateMany({
      where: { provider: "ZOMATO", eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    const ack = provider.formatWebhookAck(eventType, orderId, "SUCCESS");
    return NextResponse.json(ack.body, { status: ack.status });
  } catch (err: any) {
    console.error("[Zomato Webhook Processing Error]:", err);

    if (resolvedTenantId) {
      await prisma.aggregatorExceptionQueue.create({
        data: {
          tenantId: resolvedTenantId,
          outletId: resolvedOutletId,
          provider: "ZOMATO",
          externalOrderId: orderId,
          errorType: err.name === "UnmappedStoreError" ? "OUTLET_UNMAPPED" : "PROCESSING_ERROR",
          reason: err.message || "Failed to process Zomato order webhook",
          payloadJson: rawBody,
        },
      }).catch(() => null);
    }

    const ack = provider.formatWebhookAck(eventType, orderId, "FAILURE", err.message);
    return NextResponse.json(ack.body, { status: ack.status });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ACTIVE",
    provider: "ZOMATO",
    service: "RestroNex Universal Aggregator Webhook Gateway",
    signatureVerification: "Bearer / Secret Token",
    multiTenantEnabled: true,
  });
}
