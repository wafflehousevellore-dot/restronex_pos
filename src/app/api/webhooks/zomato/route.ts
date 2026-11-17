import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ZomatoAdapter } from "@/lib/aggregators/zomato";
import { ingestOrder, cancelOrder } from "@/lib/order-ingestion";

export const dynamic = "force-dynamic";

/**
 * Official Zomato POS Webhook Receiver
 * Handles incoming online orders, cancellations, and rider dispatch updates.
 */
export async function POST(req: NextRequest) {
  let rawBody = "";
  let body: any;
  try {
    rawBody = await req.text();
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON payload" }, { status: 400 });
  }

  // 1. Signature Verification
  const signature = req.headers.get("x-zomato-signature") || req.headers.get("x-hub-signature-256");
  const isValidSig = ZomatoAdapter.verifySignature(rawBody, signature);
  if (!isValidSig) {
    return NextResponse.json({ status: "failed", error: "Invalid webhook signature" }, { status: 401 });
  }

  const { event = "order_created", res_id, order_id } = body;
  const eventId = `zomato_${order_id || Date.now()}_${event}_${Date.now()}`;

  // 2. Idempotency Check
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });
  if (existingEvent?.processed) {
    return NextResponse.json({ status: "success", message: "Event already processed" });
  }

  // 3. Map Zomato Restaurant ID to tenant & outlet
  let targetTenantId: string | null = null;
  let targetOutletId: string | null = null;

  if (res_id) {
    // 3a. Primary lookup: AggregatorOutletMapping table
    const outletMapping = await prisma.aggregatorOutletMapping.findFirst({
      where: {
        provider: "zomato",
        providerStoreId: String(res_id),
      },
    });

    if (outletMapping) {
      targetTenantId = outletMapping.tenantId;
      targetOutletId = outletMapping.restroOutletId;
    } else {
      // 3b. Secondary lookup: IntegrationConfig configJson
      const allConfigs = await prisma.integrationConfig.findMany({
        where: { provider: "zomato" },
      });

      for (const c of allConfigs) {
        if (!c.configJson) continue;
        try {
          const parsed = JSON.parse(c.configJson);
          if (parsed.providerStoreId === String(res_id)) {
            targetTenantId = c.tenantId;
            targetOutletId = parsed.outletId;
            break;
          }
          const matchedMapping = parsed.outletMappings?.find(
            (m: any) => m.providerStoreId === String(res_id)
          );
          if (matchedMapping) {
            targetTenantId = c.tenantId;
            targetOutletId = matchedMapping.localOutletId || matchedMapping.restroOutletId;
            break;
          }
        } catch {}
      }
    }
  }

  // Fallback: Default to active tenant if single store setup
  if (!targetTenantId) {
    const fallbackTenant = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      include: { outlets: true },
    });
    if (fallbackTenant) {
      targetTenantId = fallbackTenant.id;
      targetOutletId = fallbackTenant.outlets[0]?.id || null;
    }
  }

  if (!targetTenantId || !targetOutletId) {
    return NextResponse.json(
      { status: "failed", error: `Unmapped Zomato restaurant Res ID: ${res_id}` },
      { status: 404 }
    );
  }

  try {
    // 4. Handle Cancellation vs New Order
    if (event === "order_cancelled") {
      const cancelInfo = ZomatoAdapter.normalizeCancellation(body);
      const cancelRes = await cancelOrder({
        tenantId: targetTenantId,
        outletId: targetOutletId,
        orderNumber: cancelInfo.orderNumber,
        externalOrderId: cancelInfo.externalOrderId,
        reason: cancelInfo.reason,
        source: "ZOMATO",
      });

      if (!cancelRes.ok) {
        console.warn("[Zomato Webhook] Cancellation note:", cancelRes.error);
      }
    } else {
      // order_created or incoming dispatch
      const normalizedPayload = ZomatoAdapter.normalizeOrder(body, targetTenantId, targetOutletId);
      const ingestRes = await ingestOrder(normalizedPayload);

      if (!ingestRes.ok) {
        throw new Error(ingestRes.error || "Failed to ingest Zomato order");
      }
    }

    // 5. Update last sync on Zomato integration config
    await prisma.integrationConfig.updateMany({
      where: { tenantId: targetTenantId, provider: "zomato" },
      data: { lastSyncAt: new Date() },
    });

    // 6. Record audit log
    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        provider: "ZOMATO",
        eventType: event,
        tenantId: targetTenantId,
        payloadJson: JSON.stringify(body),
        processed: true,
        status: "PROCESSED",
        processedAt: new Date(),
      },
      update: {
        processed: true,
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "success",
      order_id,
      ack_id: `ack_zomato_${order_id}_${Date.now()}`,
      message: "Zomato order successfully received and routed to RestroNex KDS with audio alert.",
    });
  } catch (err: any) {
    console.error("[Zomato Webhook] Processing error:", err);
    return NextResponse.json(
      { status: "failed", error: err.message || "Failed to process Zomato order" },
      { status: 500 }
    );
  }
}
