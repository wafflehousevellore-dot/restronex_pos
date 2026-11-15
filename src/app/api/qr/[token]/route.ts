import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcOrderTotals } from "@/lib/money";
import { appCache, getOrSetCache } from "@/lib/cache";
import { queueAndSendWhatsAppInvoice } from "@/lib/whatsapp-invoice";
import { queueAndDispatchBillPrintJob } from "@/lib/thermal-printer";
import { generateAndPersistInvoicePdf } from "@/lib/invoice-storage";
import { resolveTenantGateway } from "@/lib/tenant-gateway";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing QR token" }, { status: 400 });

  // 1. Cached Table Lookup with active order state (15s TTL, invalidated immediately on order placement/payment)
  const cachedTableData = await getOrSetCache(
    `qr_table_${token}`,
    async () => {
      const table = await prisma.table.findFirst({
        where: { qrToken: token },
        include: {
          outlet: { select: { id: true, name: true, city: true, address: true, phone: true } },
          tenant: { select: { id: true, name: true, currency: true, logoUrl: true } },
        },
      });
      if (!table) return null;

      let activeOrder = null;
      if (table.currentOrderId) {
        activeOrder = await prisma.order.findUnique({
          where: { id: table.currentOrderId },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalPaise: true,
            isPaid: true,
            paidAt: true,
            createdAt: true,
            customerName: true,
            customerPhone: true,
            items: {
              select: {
                id: true,
                name: true,
                quantity: true,
                unitPricePaise: true,
                totalPaise: true,
                notes: true,
              },
            },
          },
        });
      }

      // Fetch tenant payment configuration (Direct UPI / Automated Razorpay Gateway)
      const gatewayConfig = await prisma.tenantPaymentGatewayConfig.findUnique({
        where: { tenantId: table.tenantId },
      });
      const gateway = await resolveTenantGateway(table.tenantId);

      const fallbackUpi = "ajaydpi2005@ptyes";
      const upiId = gatewayConfig?.keyId || fallbackUpi;
      const merchantName = gateway.merchantName || gatewayConfig?.merchantName || table.tenant.name || "WAFFLE PLUM HOUSE";

      return {
        table: {
          id: table.id,
          number: table.number,
          area: table.area,
          status: table.status,
          qrOrderingEnabled: table.qrOrderingEnabled,
          tenantId: table.tenantId,
          outletId: table.outletId,
        },
        outlet: table.outlet,
        restaurant: {
          id: table.tenant.id,
          name: table.tenant.name,
          currency: table.tenant.currency,
          logoUrl: table.tenant.logoUrl,
        },
        paymentConfig: {
          isOnlinePaymentEnabled: true,
          provider: gateway.keyId ? "RAZORPAY" : "DIRECT_UPI",
          upiId,
          merchantName,
          razorpayKeyId: gateway.keyId || null,
          cashEnabled: gateway.cashEnabled ?? true,
        },
        activeOrder,
      };
    },
    15
  );

  if (!cachedTableData) {
    return NextResponse.json({ error: "Invalid or expired Table QR Code" }, { status: 404 });
  }

  if (!cachedTableData.table.qrOrderingEnabled) {
    return NextResponse.json(
      { error: "Contactless QR ordering is temporarily disabled for this table. Please order with your steward." },
      { status: 403 }
    );
  }

  // 2. Cached Menu Categories & Items (30s TTL per tenant)
  const categories = await getOrSetCache(
    `qr_menu_${cachedTableData.table.tenantId}`,
    async () => {
      return prisma.menuCategory.findMany({
        where: { tenantId: cachedTableData.table.tenantId, isActive: true },
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

  const response = NextResponse.json({
    table: cachedTableData.table,
    outlet: cachedTableData.outlet,
    restaurant: cachedTableData.restaurant,
    paymentConfig: cachedTableData.paymentConfig,
    categories: categories || [],
    activeOrder: cachedTableData.activeOrder,
  });

  // Edge and browser caching headers for high concurrency
  response.headers.set("Cache-Control", "public, s-maxage=5, stale-while-revalidate=15");
  return response;
}

// Guest places contactless QR order with Idempotency & Batching + Optional Direct Online Payment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const {
    items,
    customerName,
    customerPhone,
    notes,
    whatsappConsent,
    idempotencyKey,
    payOnline = false,
    paymentMethod = "UPI",
    paymentRef,
    upiVpa,
  } = body;

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
        isPaid: existing.isPaid,
        message: "Order already received (idempotent replay)",
      });
    }
  }

  let tenantId = "";
  let outletId = "";
  let tableId = "";
  let tableStatus = "AVAILABLE";
  let qrOrderingEnabled = true;

  const cachedData = appCache.get(`qr_table_${token}`) as any;
  if (cachedData?.table) {
    tenantId = cachedData.table.tenantId;
    outletId = cachedData.table.outletId;
    tableId = cachedData.table.id;
    tableStatus = cachedData.table.status;
    qrOrderingEnabled = cachedData.table.qrOrderingEnabled;
  } else {
    const table = await prisma.table.findFirst({
      where: { qrToken: token },
      select: { id: true, tenantId: true, outletId: true, qrOrderingEnabled: true, status: true },
    });
    if (!table) return NextResponse.json({ error: "Invalid Table QR Code" }, { status: 404 });
    tenantId = table.tenantId;
    outletId = table.outletId;
    tableId = table.id;
    tableStatus = table.status;
    qrOrderingEnabled = table.qrOrderingEnabled;
  }

  if (!qrOrderingEnabled) return NextResponse.json({ error: "QR Ordering disabled" }, { status: 403 });

  // Menu lookup from cache with fallback to DB
  const itemIds = items.map((it: any) => it.menuItemId).filter(Boolean);
  const menuMap = new Map<string, any>();

  const cachedCategories = appCache.get(`qr_menu_${tenantId}`) as any[];
  if (Array.isArray(cachedCategories)) {
    for (const cat of cachedCategories) {
      if (Array.isArray(cat.items)) {
        for (const item of cat.items) {
          if (itemIds.includes(item.id)) {
            menuMap.set(item.id, item);
          }
        }
      }
    }
  }

  const missingItemIds = itemIds.filter((id: string) => !menuMap.has(id));
  if (missingItemIds.length > 0) {
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: missingItemIds }, tenantId },
      include: { variants: true, modifiers: true },
    });
    for (const m of dbMenuItems) {
      menuMap.set(m.id, m);
    }
  }

  const lineTotals: number[] = [];
  const validatedItems: any[] = [];

  for (const it of items) {
    const menuItem = menuMap.get(it.menuItemId);
    if (!menuItem) {
      return NextResponse.json({ error: `Dish not found or unavailable: ${it.name}` }, { status: 400 });
    }

    let unitPrice = menuItem.pricePaise;
    if (it.variantId) {
      const v = menuItem.variants.find((x: any) => x.id === it.variantId);
      if (v) unitPrice = v.pricePaise;
    }

    let modsPrice = 0;
    if (Array.isArray(it.modifierIds)) {
      for (const mId of it.modifierIds) {
        const m = menuItem.modifiers.find((x: any) => x.id === mId);
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

  const isPaid = Boolean(payOnline);

  const order = await prisma.$transaction(
    async (tx) => {
      // 1. Create QR order
      const o = await tx.order.create({
        data: {
          tenantId,
          outletId,
          orderNumber,
          type: "QR",
          serviceMode: "DINE_IN",
          status: isPaid ? "BILLED" : "PLACED",
          tableId,
          customerName: customerName?.trim() || "Table Guest",
          customerPhone: customerPhone?.trim() || null,
          notes: notes || null,
          subtotalPaise: totals.subtotal,
          taxPaise: totals.tax,
          discountPaise: 0,
          serviceChargePaise: totals.service,
          totalPaise: totals.total,
          kotStatus: "PENDING",
          isPaid,
          paidAt: isPaid ? now : null,
          billClosedAt: isPaid ? now : null,
          whatsappConsent: whatsappConsent || false,
          idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : null,
        },
      });

      // 2. High-performance batch create of all order items
      await tx.orderItem.createMany({
        data: validatedItems.map((v) => ({
          ...v,
          orderId: o.id,
        })),
      });

      // 3. Record Payment record if paid online
      if (isPaid) {
        await tx.payment.create({
          data: {
            orderId: o.id,
            tenantId,
            outletId,
            method: paymentMethod || "UPI",
            amountPaise: totals.total,
            status: "COMPLETED",
            reference:
              paymentRef?.trim() || `UPI-TXN-${Date.now().toString(36).toUpperCase()}`,
            isGatewayConfirmed: true,
            upiVpa: upiVpa?.trim() || null,
          },
        });
      }

      // 4. Create Kitchen Ticket (KDS)
      await tx.kitchenTicket.create({
        data: {
          orderId: o.id,
          tenantId,
          outletId,
          station: "MAIN",
          status: "RECEIVED",
        },
      });

      // 5. Mark Table Occupied
      if (tableStatus !== "OCCUPIED") {
        await tx.table.update({
          where: { id: tableId },
          data: {
            status: "OCCUPIED",
            currentOrderId: o.id,
            orderTotalPaise: totals.total,
          },
        });
      } else {
        await tx.table.update({
          where: { id: tableId },
          data: {
            currentOrderId: o.id,
            orderTotalPaise: totals.total,
          },
        });
      }

      // 6. Queue KOT Print Job
      await tx.printJob.create({
        data: {
          tenantId,
          outletId,
          orderId: o.id,
          jobType: "KOT",
          contentJson: JSON.stringify({
            source: "QR_GUEST_ORDER",
            orderNumber,
            table: tableId,
            isPaid,
            paymentMethod: isPaid ? paymentMethod || "UPI" : "UNPAID",
            items: validatedItems.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              notes: i.notes,
            })),
          }),
          status: "PENDING",
        },
      });

      return o;
    },
    {
      maxWait: 15000,
      timeout: 20000,
    }
  );

  // Invalidate cache immediately so new state is reflected
  appCache.del(`qr_table_${token}`);
  appCache.delPrefix(`report_${order.tenantId}`);

  // Non-blocking async jobs if paid online
  const origin = req.nextUrl.origin;
  if (isPaid) {
    generateAndPersistInvoicePdf(order.id, origin).catch((e) =>
      console.error("[QR Online Pay] PDF generation error:", e)
    );
    if (order.customerPhone) {
      queueAndSendWhatsAppInvoice(order.id, { baseUrl: origin }).catch((e) =>
        console.error("[QR Online Pay] WhatsApp invoice dispatch error:", e)
      );
    }
    queueAndDispatchBillPrintJob(order.id, { baseUrl: origin }).catch((e) =>
      console.error("[QR Online Pay] Thermal print dispatch error:", e)
    );
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totals,
    status: order.status,
    isPaid,
    paymentMethod: isPaid ? paymentMethod || "UPI" : null,
    message: isPaid
      ? "Order placed and paid online via UPI! Kitchen has received your ticket."
      : "Order placed successfully! Kitchen has received your ticket.",
  });
}

// Settle active table bill online while dining
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    orderId,
    paymentMethod = "UPI",
    paymentRef,
    customerPhone,
    customerName,
    whatsappConsent,
    upiVpa,
  } = body;

  const table = await prisma.table.findFirst({
    where: { qrToken: token },
    select: { id: true, number: true, tenantId: true, outletId: true, currentOrderId: true },
  });

  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const targetOrderId = orderId || table.currentOrderId;
  if (!targetOrderId) {
    return NextResponse.json({ error: "No active order on this table to settle" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: targetOrderId },
    include: { payments: true },
  });

  if (!order || order.tenantId !== table.tenantId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.isPaid) {
    return NextResponse.json({
      ok: true,
      isPaid: true,
      orderNumber: order.orderNumber,
      message: "Order is already paid and settled.",
    });
  }

  const now = new Date();
  const phone = customerPhone?.trim() || order.customerPhone || null;
  const name = customerName?.trim() || order.customerName || "Table Guest";

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: order.id },
      data: {
        isPaid: true,
        paidAt: now,
        billClosedAt: now,
        status: "BILLED",
        customerPhone: phone,
        customerName: name,
        whatsappConsent:
          typeof whatsappConsent === "boolean" ? whatsappConsent : order.whatsappConsent,
      },
    });

    await tx.payment.create({
      data: {
        orderId: o.id,
        tenantId: table.tenantId,
        outletId: table.outletId,
        method: paymentMethod || "UPI",
        amountPaise: o.totalPaise,
        status: "COMPLETED",
        reference: paymentRef?.trim() || `UPI-BILL-${Date.now().toString(36).toUpperCase()}`,
        isGatewayConfirmed: true,
        upiVpa: upiVpa?.trim() || null,
      },
    });

    return o;
  });

  // Bust cache so table status immediately updates
  appCache.del(`qr_table_${token}`);
  appCache.delPrefix(`report_${table.tenantId}`);

  const origin = req.nextUrl.origin;
  generateAndPersistInvoicePdf(updatedOrder.id, origin).catch((e) =>
    console.error("[QR Settle Bill] PDF generation error:", e)
  );
  if (phone) {
    queueAndSendWhatsAppInvoice(updatedOrder.id, { baseUrl: origin }).catch((e) =>
      console.error("[QR Settle Bill] WhatsApp invoice dispatch error:", e)
    );
  }
  queueAndDispatchBillPrintJob(updatedOrder.id, { baseUrl: origin }).catch((e) =>
    console.error("[QR Settle Bill] Thermal receipt print error:", e)
  );

  return NextResponse.json({
    ok: true,
    isPaid: true,
    orderNumber: updatedOrder.orderNumber,
    totalPaise: updatedOrder.totalPaise,
    message: `Table ${table.number} bill of ₹${(updatedOrder.totalPaise / 100).toFixed(
      2
    )} paid successfully via ${paymentMethod}!`,
  });
}
