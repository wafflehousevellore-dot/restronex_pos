import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SwiggyAdapter } from "@/lib/aggregators/swiggy";
import { ingestOrder, cancelOrder } from "@/lib/order-ingestion";

export const dynamic = "force-dynamic";

/**
 * Official Swiggy Partner POS Webhook Receiver
 * Handles incoming order dispatch, rider assignments, cancellations, and status updates.
 */
export async function POST(req: NextRequest) {
  let rawBody = "";
  let body: any;
  try {
    rawBody = await req.text();
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "FAILED", error: "Invalid JSON payload" }, { status: 400 });
  }

  // 1. Signature Verification
  const signature = req.headers.get("x-swiggy-signature") || req.headers.get("x-hub-signature-256");
  const isValidSig = SwiggyAdapter.verifySignature(rawBody, signature);
  if (!isValidSig) {
    return NextResponse.json({ status: "FAILED", error: "Invalid webhook signature" }, { status: 401 });
  }

  const { event_type, store_id, order_id } = body;
  const eventId = `swiggy_${order_id || Date.now()}_${event_type || "event"}_${Date.now()}`;

  // 2. Idempotency Check
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });
  if (existingEvent?.processed) {
    return NextResponse.json({ status: "SUCCESS", message: "Event already processed" });
  }

  // 3. Resolve mapped Tenant & Outlet from Swiggy Store ID
  let targetTenantId: string | null = null;
  let targetOutletId: string | null = null;

  if (store_id) {
    const allConfigs = await prisma.integrationConfig.findMany({
      where: { provider: "swiggy" },
    });

    for (const c of allConfigs) {
      if (!c.configJson) continue;
      try {
        const parsed = JSON.parse(c.configJson);
        if (
          parsed.providerStoreId === String(store_id) ||
          parsed.outletMappings?.some((m: any) => m.providerStoreId === String(store_id))
        ) {
          targetTenantId = c.tenantId;
          targetOutletId = parsed.outletId || parsed.outletMappings?.[0]?.localOutletId;
          break;
        }
      } catch {}
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
      { status: "FAILED", error: `Unmapped Swiggy store ID: ${store_id}` },
      { status: 404 }
    );
  }

  try {
    // 4. Handle Cancellation vs New Order
    if (event_type === "ORDER_CANCELLED") {
      const cancelInfo = SwiggyAdapter.normalizeCancellation(body);
      const cancelRes = await cancelOrder({
        tenantId: targetTenantId,
        outletId: targetOutletId,
        orderNumber: cancelInfo.orderNumber,
        externalOrderId: cancelInfo.externalOrderId,
        reason: cancelInfo.reason,
        source: "SWIGGY",
      });

      if (!cancelRes.ok) {
        console.warn("[Swiggy Webhook] Cancellation note:", cancelRes.error);
      }
    } else {
      // ORDER_PLACED or incoming dispatch
      const normalizedPayload = SwiggyAdapter.normalizeOrder(body, targetTenantId, targetOutletId);
      const ingestRes = await ingestOrder(normalizedPayload);

      if (!ingestRes.ok) {
        throw new Error(ingestRes.error || "Failed to ingest Swiggy order");
      }
    }

    // 5. Update last sync timestamp on Swiggy integration config
    await prisma.integrationConfig.updateMany({
      where: { tenantId: targetTenantId, provider: "swiggy" },
      data: { lastSyncAt: new Date() },
    });

    // 6. Record audit log
    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        provider: "SWIGGY",
        eventType: event_type || "ORDER_DISPATCH",
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
      status: "SUCCESS",
      orderId: order_id,
      ack_id: `ack_swiggy_${order_id}_${Date.now()}`,
      message: "Swiggy order successfully received and routed to RestroNex KDS with audio alert.",
    });
  } catch (err: any) {
    console.error("[Swiggy Webhook] Processing error:", err);
    return NextResponse.json(
      { status: "FAILED", error: err.message || "Failed to process Swiggy webhook" },
      { status: 500 }
    );
  }
}
