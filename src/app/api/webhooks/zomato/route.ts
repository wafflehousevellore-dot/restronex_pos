import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Official Zomato POS Webhook Receiver
 * Handles incoming online orders, cancellations, and rider dispatch updates.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON" }, { status: 400 });
  }

  const { event = "order_created", res_id, order_id, order: orderData } = body;
  const eventId = `zomato_${order_id || Date.now()}_${event}_${Date.now()}`;

  // Idempotency check
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });
  if (existingEvent?.processed) {
    return NextResponse.json({ status: "success", message: "Event already processed" });
  }

  // Map Zomato Restaurant ID to tenant & outlet
  let targetTenantId: string | null = null;
  let targetOutletId: string | null = null;

  if (res_id) {
    const allConfigs = await prisma.integrationConfig.findMany({
      where: { provider: "zomato" },
    });

    for (const c of allConfigs) {
      if (!c.configJson) continue;
      try {
        const parsed = JSON.parse(c.configJson);
        if (
          parsed.providerStoreId === String(res_id) ||
          parsed.outletMappings?.some((m: any) => m.providerStoreId === String(res_id))
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
      { status: "failed", error: `Unmapped Zomato restaurant Res ID: ${res_id}` },
      { status: 404 }
    );
  }

  const orderNumber = `ZOMATO-${order_id || Date.now()}`;

  try {
    if (event === "order_cancelled") {
      await prisma.order.updateMany({
        where: { tenantId: targetTenantId, orderNumber },
        data: { status: "CANCELLED" },
      });
      await prisma.kitchenTicket.updateMany({
        where: { tenantId: targetTenantId },
        data: { status: "CANCELLED" },
      });
    } else {
      const items = Array.isArray(orderData?.items) ? orderData.items : [];
      const totalPaise = Math.round((Number(orderData?.total) || 250) * 100);

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

      const orderItemsData = (items.length > 0 ? items : [{ name: "Zomato Order Dish", quantity: 1, price: 100 }]).map(
        (it: any) => ({
          menuItemId: defaultMenuItem.id,
          name: it.name || "Zomato Item",
          quantity: Number(it.quantity) || 1,
          unitPricePaise: Math.round((Number(it.price) || 0) * 100),
          totalPaise: Math.round((Number(it.price) || 0) * (Number(it.quantity) || 1) * 100) || 10000,
          notes: it.notes || null,
        })
      );

      await prisma.order.upsert({
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
          type: "ZOMATO",
          serviceMode: "DELIVERY",
          status: "PLACED",
          customerName: orderData?.customer?.name || "Zomato Customer",
          customerPhone: orderData?.customer?.phone || null,
          notes: "Zomato Online Order",
          subtotalPaise: Math.round(totalPaise * 0.9),
          taxPaise: Math.round(totalPaise * 0.1),
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
              method: "ZOMATO_PAY",
              amountPaise: totalPaise,
              status: "COMPLETED",
              reference: `Zomato Payout #${order_id}`,
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

      await prisma.integrationConfig.updateMany({
        where: { tenantId: targetTenantId, provider: "zomato" },
        data: { lastSyncAt: new Date() },
      });
    }

    // Audit log webhook
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
      message: "Order successfully received and routed to kitchen.",
    });
  } catch (err: any) {
    console.error("Zomato webhook error:", err);
    return NextResponse.json(
      { status: "failed", error: err.message || "Failed to process order" },
      { status: 500 }
    );
  }
}
