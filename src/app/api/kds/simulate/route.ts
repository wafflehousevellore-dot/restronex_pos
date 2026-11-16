import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { ingestOrder, cancelOrder, OrderSource } from "@/lib/order-ingestion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 400 });
  }

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const outletId = body.outletId
    ? String(body.outletId)
    : (await prisma.outlet.findFirst({ where: { tenantId } }))?.id;

  if (!outletId) {
    return NextResponse.json({ error: "No outlet found for tenant" }, { status: 400 });
  }

  const action = String(body.action || "SIMULATE_ORDER").toUpperCase();
  const source = (String(body.source || "SWIGGY").toUpperCase()) as OrderSource;

  if (action === "CANCEL_LATEST" || action === "SIMULATE_CANCELLATION") {
    // Find the latest active ticket/order for this outlet to cancel
    const latestTicket = await prisma.kitchenTicket.findFirst({
      where: { tenantId, outletId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      include: { order: true },
    });

    if (!latestTicket) {
      return NextResponse.json({
        ok: false,
        error: "No active order available to cancel. Place or simulate an order first.",
      });
    }

    const cancelRes = await cancelOrder({
      tenantId,
      outletId,
      orderNumber: latestTicket.order.orderNumber,
      reason: body.reason || `Customer cancelled via ${latestTicket.order.type} app`,
      source: latestTicket.order.type,
    });

    return NextResponse.json({
      ok: cancelRes.ok,
      message: `Simulated cancellation for ${latestTicket.order.orderNumber}`,
      orderNumber: latestTicket.order.orderNumber,
    });
  }

  // Generate simulated order
  const simNum = Math.floor(1000 + Math.random() * 9000);
  const nowStr = Date.now().toString().slice(-4);
  const orderNumber = `${source}-${nowStr}`;

  const sampleItemsBySource: Record<OrderSource, any[]> = {
    SWIGGY: [
      { name: "Belgian Classic Dark Chocolate Waffle", quantity: 2, unitPricePaise: 22000, variantName: "Crispy", notes: "Extra dark chocolate" },
      { name: "Cold Brew Coffee", quantity: 1, unitPricePaise: 16000, notes: "No sugar" },
    ],
    ZOMATO: [
      { name: "Nutella Overload Waffle", quantity: 1, unitPricePaise: 26000, variantName: "Double Layer" },
      { name: "Berry Blast Thick Shake", quantity: 2, unitPricePaise: 19000, notes: "Serve chilled" },
    ],
    WEBSITE: [
      { name: "Red Velvet Cream Cheese Waffle", quantity: 1, unitPricePaise: 28000 },
      { name: "Hot Caramel Cappuccino", quantity: 1, unitPricePaise: 17000 },
    ],
    POS: [
      { name: "Signature Butter Waffle", quantity: 2, unitPricePaise: 18000, station: "MAIN" },
      { name: "Iced Peach Tea", quantity: 2, unitPricePaise: 14000, station: "BEVERAGE" },
    ],
    TABLE_QR: [
      { name: "Triple Chocolate Pancake Stack", quantity: 1, unitPricePaise: 29000 },
      { name: "Fresh Mint Mojito", quantity: 1, unitPricePaise: 15000, station: "BAR" },
    ],
  };

  const items = body.items || sampleItemsBySource[source] || sampleItemsBySource.SWIGGY;
  const subtotalPaise = items.reduce((acc: number, it: any) => acc + (it.unitPricePaise * it.quantity), 0);
  const taxPaise = Math.round(subtotalPaise * 0.05);
  const totalPaise = subtotalPaise + taxPaise;

  const names = ["Aarav Sharma", "Pooja Patel", "Rohan Mehta", "Ananya Rao", "Vikram Singh"];
  const randomName = names[Math.floor(Math.random() * names.length)];

  const ingestRes = await ingestOrder({
    tenantId,
    outletId,
    orderNumber,
    source,
    externalOrderId: `EXT-${simNum}`,
    serviceMode: source === "POS" || source === "TABLE_QR" ? "DINE_IN" : "DELIVERY",
    tableNumber: source === "POS" || source === "TABLE_QR" ? String(Math.floor(1 + Math.random() * 12)) : undefined,
    customerName: body.customerName || `${randomName} (${source})`,
    customerPhone: "+91 9876543210",
    cookingInstructions: body.instructions || (source === "SWIGGY" || source === "ZOMATO" ? "Make it extra crisp and pack safely" : undefined),
    notes: source === "SWIGGY" ? "Swiggy Delivery (Rider: Suresh Kumar)" : source === "ZOMATO" ? "Zomato Delivery (Rider: Amit Verma)" : "POS Walk-in",
    items,
    subtotalPaise,
    taxPaise,
    totalPaise,
    isPaid: true,
    paymentMethod: source === "SWIGGY" ? "SWIGGY_PAY" : source === "ZOMATO" ? "ZOMATO_PAY" : "UPI",
    riderDetails:
      source === "SWIGGY"
        ? { name: "Suresh Kumar", phone: "+91 9988776655", etaMinutes: 12 }
        : source === "ZOMATO"
        ? { name: "Amit Verma", phone: "+91 9876501234", etaMinutes: 15 }
        : undefined,
  });

  return NextResponse.json({
    ok: ingestRes.ok,
    source,
    orderNumber,
    ticketId: ingestRes.ticketId,
    orderId: ingestRes.orderId,
    message: `Simulated order ${orderNumber} received and routed to KDS with audio alert!`,
  });
}
