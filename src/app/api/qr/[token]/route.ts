import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcOrderTotals } from "@/lib/money";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing QR token" }, { status: 400 });

  const table = await prisma.table.findFirst({
    where: { qrToken: token },
    include: {
      outlet: { select: { id: true, name: true, city: true, address: true, phone: true } },
      tenant: { select: { id: true, name: true, currency: true, logoUrl: true, settings: true } },
    },
  });

  if (!table) {
    return NextResponse.json({ error: "Invalid or expired Table QR Code" }, { status: 404 });
  }

  if (!table.qrOrderingEnabled) {
    return NextResponse.json(
      { error: "Contactless QR ordering is temporarily disabled for this table. Please order with your steward." },
      { status: 403 }
    );
  }

  // Fetch menu for this tenant
  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: table.tenantId, isActive: true },
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

  // Get active order if already placed
  let activeOrder = null;
  if (table.currentOrderId) {
    activeOrder = await prisma.order.findUnique({
      where: { id: table.currentOrderId },
      select: {
        orderNumber: true,
        status: true,
        totalPaise: true,
        items: { select: { name: true, quantity: true, totalPaise: true } },
      },
    });
  }

  return NextResponse.json({
    table: {
      id: table.id,
      number: table.number,
      area: table.area,
      status: table.status,
    },
    outlet: table.outlet,
    restaurant: {
      id: table.tenant.id,
      name: table.tenant.name,
      currency: table.tenant.currency,
      logoUrl: table.tenant.logoUrl,
    },
    categories,
    activeOrder,
  });
}

// Guest places contactless QR order
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { items, customerName, customerPhone, notes, whatsappConsent } = body;

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const table = await prisma.table.findFirst({
    where: { qrToken: token },
    include: {
      tenant: { include: { settings: true } },
      outlet: true,
    },
  });

  if (!table) return NextResponse.json({ error: "Invalid Table QR Code" }, { status: 404 });
  if (!table.qrOrderingEnabled) return NextResponse.json({ error: "QR Ordering disabled" }, { status: 403 });

  // Calculate line totals securely from database prices (prevent client price tampering)
  const lineTotals: number[] = [];
  const validatedItems: any[] = [];

  for (const it of items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: it.menuItemId },
      include: { variants: true, modifiers: true },
    });
    if (!menuItem || menuItem.tenantId !== table.tenantId) {
      return NextResponse.json({ error: `Dish not found: ${it.name}` }, { status: 400 });
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
    // Create QR order
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
      },
    });

    for (const it of validatedItems) {
      await tx.orderItem.create({
        data: {
          orderId: o.id,
          menuItemId: it.menuItemId,
          name: it.name,
          quantity: it.quantity,
          unitPricePaise: it.unitPricePaise,
          variantName: it.variantName,
          modifiersJson: it.modifiersJson,
          notes: it.notes,
          totalPaise: it.totalPaise,
          kotStatus: "PENDING",
        },
      });
    }

    // Auto-create Kitchen Ticket
    await tx.kitchenTicket.create({
      data: {
        orderId: o.id,
        tenantId: table.tenantId,
        outletId: table.outletId,
        station: "MAIN",
        status: "RECEIVED",
      },
    });

    // Mark Table Occupied
    await tx.table.update({
      where: { id: table.id },
      data: {
        status: "OCCUPIED",
        currentOrderId: o.id,
        orderTotalPaise: totals.total,
      },
    });

    // Queue KOT Print Job
    await tx.printJob.create({
      data: {
        tenantId: table.tenantId,
        outletId: table.outletId,
        orderId: o.id,
        jobType: "KOT",
        contentJson: JSON.stringify({
          source: "QR_GUEST_ORDER",
          orderNumber,
          table: table.number,
          items: validatedItems.map((i) => ({ name: i.name, quantity: i.quantity, notes: i.notes })),
        }),
        status: "PENDING",
      },
    });

    return o;
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    table: table.number,
    totals,
    status: order.status,
    message: "Order placed successfully! Kitchen has received your ticket.",
  });
}
