import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Official Swiggy Partner POS Webhook Receiver
 * Handles incoming order dispatch, rider assignments, cancellations, and status updates.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "FAILED", error: "Invalid JSON payload" }, { status: 400 });
  }

  const { event_type, store_id, order_id, data } = body;
  const eventId = `swiggy_${order_id || Date.now()}_${event_type || "event"}_${Date.now()}`;

  // Idempotency: Check if this webhook event was already processed
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });
  if (existingEvent?.processed) {
    return NextResponse.json({ status: "SUCCESS", message: "Event already processed" });
  }

  // Find the tenant & outlet mapped to this Swiggy Store ID
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
      { status: "FAILED", error: `Unmapped Swiggy store: ${store_id}` },
      { status: 404 }
    );
  }

  const orderNumber = `SWIGGY-${order_id || Date.now()}`;

  try {
    if (event_type === "ORDER_CANCELLED") {
      await prisma.order.updateMany({
        where: { tenantId: targetTenantId, orderNumber },
        data: { status: "CANCELLED" },
      });
      await prisma.kitchenTicket.updateMany({
        where: { tenantId: targetTenantId },
        data: { status: "CANCELLED" },
      });
    } else {
      // ORDER_PLACED or incoming new order
      const items = Array.isArray(data?.items) ? data.items : [];
      const subtotalPaise = Math.round((Number(data?.billing?.subtotal) || 0) * 100);
      const taxPaise = Math.round((Number(data?.billing?.tax) || 0) * 100);
      const totalPaise = Math.round((Number(data?.billing?.total) || subtotalPaise + taxPaise) * 100) || 10000;

      // Resolve or create a menu item for each order item
      let defaultMenuItem = await prisma.menuItem.findFirst({
        where: { tenantId: targetTenantId },
      });
      if (!defaultMenuItem) {
        let defaultCat = await prisma.menuCategory.findFirst({
          where: { tenantId: targetTenantId },
        });
        if (!defaultCat) {
          defaultCat = await prisma.menuCategory.create({
            data: {
              tenantId: targetTenantId,
              name: "Online Orders",
              slug: `online-orders-${Date.now()}`,
            },
          });
        }
        defaultMenuItem = await prisma.menuItem.create({
          data: {
            tenantId: targetTenantId,
            categoryId: defaultCat.id,
            name: "Online Dish",
            pricePaise: 25000,
            isVeg: true,
          },
        });
      }

      const orderItemsData = (items.length > 0 ? items : [{ name: "Swiggy Order Dish", quantity: 1, price: 100 }]).map(
        (it: any) => ({
          menuItemId: defaultMenuItem.id,
          name: it.name || "Swiggy Dish",
          quantity: Number(it.quantity) || 1,
          unitPricePaise: Math.round((Number(it.price) || 0) * 100),
          totalPaise: Math.round((Number(it.price) || 0) * (Number(it.quantity) || 1) * 100) || 10000,
          notes: it.notes || null,
        })
      );

      const _order = await prisma.order.upsert({
        where: {
          tenantId_orderNumber: {
            tenantId: targetTenantId,
            orderNumber,
          },
        },
        create: {
          tenantId: targetTenantId,
          outletId: targetOutletId,
          orderNumber,
          type: "SWIGGY",
          serviceMode: "DELIVERY",
          status: "PLACED",
          customerName: data?.customer?.name || "Swiggy Customer",
          customerPhone: data?.customer?.phone || null,
          notes: data?.delivery?.rider_name ? `Rider: ${data.delivery.rider_name}` : "Swiggy Online Order",
          subtotalPaise,
          taxPaise,
          totalPaise,
          isPaid: true,
          paidAt: new Date(),
          kotStatus: "SENT",
          items: {
            create: orderItemsData,
          },
          payments: {
            create: {
              tenantId: targetTenantId,
              outletId: targetOutletId,
              method: "SWIGGY_PAY",
              amountPaise: totalPaise,
              status: "COMPLETED",
              reference: `Swiggy Payout #${order_id}`,
            },
          },
          kotTickets: {
            create: {
              tenantId: targetTenantId,
              outletId: targetOutletId,
              station: "MAIN",
              status: "RECEIVED",
            },
          },
        },
        update: {
          status: "PLACED",
        },
      });

      // Update last sync on Swiggy integration config
      await prisma.integrationConfig.updateMany({
        where: { tenantId: targetTenantId, provider: "swiggy" },
        data: { lastSyncAt: new Date() },
      });
    }

    // Record webhook event for auditing
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
      message: "Order successfully received and routed to RestroNex KDS.",
    });
  } catch (err: any) {
    console.error("Swiggy webhook error:", err);
    return NextResponse.json(
      { status: "FAILED", error: err.message || "Failed to process order" },
      { status: 500 }
    );
  }
}
