import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcOrderTotals } from "@/lib/money";
import { appCache, getOrSetCache } from "@/lib/cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing QR token" }, { status: 400 });

  // 1. Cached Table Lookup (15s TTL)
  const cachedTable = await getOrSetCache(
    `qr_table_${token}`,
    async () => {
      return prisma.table.findFirst({
        where: { qrToken: token },
        include: {
          outlet: { select: { id: true, name: true, city: true, address: true, phone: true } },
          tenant: { select: { id: true, name: true, currency: true, logoUrl: true } },
        },
      });
    },
    15
  );

  if (!cachedTable) {
    return NextResponse.json({ error: "Invalid or expired Table QR Code" }, { status: 404 });
  }

  if (!cachedTable.qrOrderingEnabled) {
    return NextResponse.json(
      { error: "Contactless QR ordering is temporarily disabled for this table. Please order with your steward." },
      { status: 403 }
    );
  }

  // 2. Cached Menu Categories & Items (30s TTL per tenant)
  const categories = await getOrSetCache(
    `qr_menu_${cachedTable.tenantId}`,
    async () => {
      return prisma.menuCategory.findMany({
        where: { tenantId: cachedTable.tenantId, isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isActive: true, isSoldOut: false },
            orderBy: { name: "asc" },
            include: {
              variants: { where: { isActive: true } },
              modifiers: { where: { isActive: true } },
            },
          },
        },
      });
    },
    30
  );

  // 3. Dynamic active order lookup (fresh state)
  let activeOrder = null;
  const liveTable = await prisma.table.findUnique({
    where: { id: cachedTable.id },
    select: { currentOrderId: true, status: true },
  });

  if (liveTable?.currentOrderId) {
    activeOrder = await prisma.order.findUnique({
      where: { id: liveTable.currentOrderId },
      select: {
        orderNumber: true,
        status: true,
        totalPaise: true,
        items: { select: { name: true, quantity: true, totalPaise: true } },
      },
    });
  }

  const response = NextResponse.json({
    table: {
      id: cachedTable.id,
      number: cachedTable.number,
      area: cachedTable.area,
      status: liveTable?.status || cachedTable.status,
    },
    outlet: cachedTable.outlet,
    restaurant: {
      id: cachedTable.tenant.id,
      name: cachedTable.tenant.name,
      currency: cachedTable.tenant.currency,
      logoUrl: cachedTable.tenant.logoUrl,
    },
    categories: categories || [],
    activeOrder,
  });

  // Edge and browser caching headers for high concurrency
  response.headers.set("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
  return response;
}

// Guest places contactless QR order with Idempotency & Batching
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { items, customerName, customerPhone, notes, whatsappConsent, idempotencyKey } = body;

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Idempotency check: prevent duplicate order submissions
  if (idempotencyKey) {
    const existing = await prisma.order.findFirst({
      where: { idempotencyKey: String(idempotencyKey).trim() },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        status: existing.status,
        message: "Order already received (idempotent replay)",
      });
    }
  }

  const table = await prisma.table.findFirst({
    where: { qrToken: token },
    include: {
      tenant: { select: { id: true } },
      outlet: { select: { id: true } },
    },
  });

  if (!table) return NextResponse.json({ error: "Invalid Table QR Code" }, { status: 404 });
  if (!table.qrOrderingEnabled) return NextResponse.json({ error: "QR Ordering disabled" }, { status: 403 });

  // Batch query all referenced menu items in a single query
  const itemIds = items.map((it: any) => it.menuItemId).filter(Boolean);
  const dbMenuItems = await prisma.menuItem.findMany({
    where: { id: { in: itemIds }, tenantId: table.tenantId },
    include: { variants: true, modifiers: true },
  });
  const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));

  const lineTotals: number[] = [];
  const validatedItems: any[] = [];

  for (const it of items) {
    const menuItem = menuMap.get(it.menuItemId);
    if (!menuItem) {
      return NextResponse.json({ error: `Dish not found or unavailable: ${it.name}` }, { status: 400 });
    }

    let unitPrice = menuItem.pricePaise;
    if (it.variantId) {
      const v = menuItem.variants.find((x) => x.id === it.variantId);
      if (v) unitPrice = v.pricePaise;
    }

    let modsPrice = 0;
    if (Array.isArray(it.modifierIds)) {
      for (const mId of it.modifierIds) {
        const m = menuItem.modifiers.find((x) => x.id === mId);
        if (m) modsPrice += m.pricePaise;
      }
    }

    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    const itemTotal = (unitPrice + modsPrice) * qty;
    lineTotals.push(itemTotal);
    validatedItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: qty,
      unitPricePaise: unitPrice,
      variantName: it.variantName || null,
      modifiersJson: it.modifiers ? JSON.stringify(it.modifiers) : null,
      notes: it.notes || null,
      totalPaise: itemTotal,
      kotStatus: "PENDING",
    });
  }

  const totals = calcOrderTotals({
    lineTotalsPaise: lineTotals,
    discountPaise: 0,
    taxRateBps: 1800,
    serviceChargeBps: 0,
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randCode = Math.random().toString(36).slice(2, 6).toUpperCase();
  const orderNumber = `QR-${dateStr}-${randCode}`;

  const order = await prisma.$transaction(async (tx) => {
    // 1. Create QR order
    const o = await tx.order.create({
      data: {
        tenantId: table.tenantId,
        outletId: table.outletId,
        orderNumber,
        type: "QR",
        serviceMode: "DINE_IN",
        status: "PLACED",
        tableId: table.id,
        customerName: customerName?.trim() || "Table Guest",
        customerPhone: customerPhone?.trim() || null,
        notes: notes || null,
        subtotalPaise: totals.subtotal,
        taxPaise: totals.tax,
        discountPaise: 0,
        serviceChargePaise: totals.service,
        totalPaise: totals.total,
        kotStatus: "PENDING",
        isPaid: false,
        whatsappConsent: whatsappConsent || false,
        idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : null,
      },
    });

    // 2. High-performance batch create of all order items in single SQL statement
    await tx.orderItem.createMany({
      data: validatedItems.map((v) => ({
        ...v,
        orderId: o.id,
      })),
    });

    // 3. Create Kitchen Ticket
    await tx.kitchenTicket.create({
      data: {
        orderId: o.id,
        tenantId: table.tenantId,
        outletId: table.outletId,
        station: "MAIN",
        status: "RECEIVED",
      },
    });

    // 4. Mark Table Occupied if needed (avoids redundant row lock contention)
    if (table.status !== "OCCUPIED" || !table.currentOrderId) {
      await tx.table.update({
        where: { id: table.id },
        data: {
          status: "OCCUPIED",
          currentOrderId: o.id,
          orderTotalPaise: totals.total,
        },
      });
    }

    // 5. Queue KOT Print Job
    await tx.printJob.create({
      data: {
        tenantId: table.tenantId,
        outletId: table.outletId,
        orderId: o.id,
        jobType: "KOT",
        contentJson: JSON.stringify({
          source: "QR_GUEST_ORDER",
          orderNumber,
          table: table.id,
          items: validatedItems.map((i) => ({ name: i.name, quantity: i.quantity, notes: i.notes })),
        }),
        status: "PENDING",
      },
    });

    return o;
  });

  // Invalidate table cache immediately
  appCache.del(`qr_table_${token}`);

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totals,
    status: order.status,
    message: "Order placed successfully! Kitchen has received your ticket.",
  });
}
