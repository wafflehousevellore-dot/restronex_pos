import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { orderCreateSchema } from "@/lib/validators";
import { calcOrderTotals } from "@/lib/money";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const status = req.nextUrl.searchParams.get("status");
  const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50), 100);
  const cursor = req.nextUrl.searchParams.get("cursor");

  const where: any = { tenantId };
  if (outletId) where.outletId = outletId;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      items: true,
      payments: true,
      kotTickets: true,
      invoice: true,
      table: { select: { id: true, number: true, area: true } },
      whatsAppLogs: { orderBy: { createdAt: "desc" }, take: 2 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  // Idempotency check: prevent duplicate charges / duplicate order insertions
  const idempotencyKey = (body as any).idempotencyKey ? String((body as any).idempotencyKey).trim() : null;
  if (idempotencyKey) {
    const existing = await prisma.order.findFirst({
      where: { idempotencyKey },
      include: {
        items: true,
        payments: true,
        invoice: true,
        table: { select: { id: true, number: true, area: true } },
      },
    });
    if (existing) {
      return NextResponse.json({
        ...existing,
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        invoiceNumber: existing.invoice?.invoiceNumber,
        replayed: true,
      });
    }
  }

  // Verify outlet belongs to tenant
  const outlet = await prisma.outlet.findFirst({ where: { id: d.outletId, tenantId } });
  if (!outlet) return NextResponse.json({ error: "Invalid outlet for tenant" }, { status: 400 });

  // Calculate accurate minor-unit totals (paise)
  const lineTotals = d.items.map((it) => {
    const mods = (it as any).modifiers?.reduce((s: number, m: any) => s + (m.pricePaise || 0), 0) || 0;
    return (it.unitPricePaise + mods) * it.quantity;
  });
  const totals = calcOrderTotals({
    lineTotalsPaise: lineTotals,
    discountPaise: d.discountPaise || 0,
    taxRateBps: 1800, // 9% CGST + 9% SGST = 18%
    serviceChargeBps: 0,
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randCode = Math.random().toString(36).slice(2, 6).toUpperCase();
  const orderNumber = `ORD-${dateStr}-${randCode}`;
  const invoiceNumber = `INV-${dateStr}-${randCode}`;

  const isTakeawayOrDelivery = d.type === "TAKEAWAY" || d.type === "DELIVERY";
  const initialStatus = isTakeawayOrDelivery ? "BILLED" : "BILLED";

  const order = await prisma.$transaction(async (tx) => {
    // 1. Create primary Order record
    const o = await tx.order.create({
      data: {
        tenantId,
        outletId: d.outletId,
        orderNumber,
        type: d.type,
        serviceMode: d.serviceMode || (d.type === "QR" ? "DINE_IN" : d.type),
        status: initialStatus,
        tableId: d.tableId || undefined,
        customerName: d.customerName?.trim() || undefined,
        customerPhone: d.customerPhone?.trim() || undefined,
        notes: d.notes,
        subtotalPaise: totals.subtotal,
        taxPaise: totals.tax,
        discountPaise: totals.afterDiscount !== totals.subtotal ? d.discountPaise : 0,
        serviceChargePaise: totals.service,
        totalPaise: totals.total,
        createdById: userId,
        kotStatus: "SENT",
        isPaid: true,
        paidAt: now,
        billClosedAt: now,
        whatsappConsent: d.whatsappConsent || false,
        whatsappStatus: d.whatsappConsent && d.customerPhone ? "QUEUED" : null,
        idempotencyKey: idempotencyKey || null,
      },
    });

    // 2. High-performance batch create of all order items in single SQL query
    const orderItemsData = d.items.map((it) => {
      const modsPrice = (it as any).modifiers?.reduce((s: number, m: any) => s + (m.pricePaise || 0), 0) || 0;
      return {
        orderId: o.id,
        menuItemId: it.menuItemId,
        name: it.name,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        variantName: (it as any).variantName || null,
        modifiersJson: (it as any).modifiers ? JSON.stringify((it as any).modifiers) : null,
        notes: (it as any).notes || null,
        totalPaise: (it.unitPricePaise + modsPrice) * it.quantity,
        kotStatus: "SENT",
      };
    });
    await tx.orderItem.createMany({ data: orderItemsData });

    // 3. Create Kitchen Tickets (KOT)
    await tx.kitchenTicket.create({
      data: {
        orderId: o.id,
        tenantId,
        outletId: d.outletId,
        station: "MAIN",
        status: "RECEIVED",
      },
    });

    // 4. Record Payments
    if (d.splitPayments && d.splitPayments.length > 0) {
      await tx.payment.createMany({
        data: d.splitPayments.map((sp) => ({
          orderId: o.id,
          method: sp.method,
          amountPaise: sp.amountPaise,
          status: "COMPLETED",
        })),
      });
    } else {
      const payMethod = d.paymentMethod || "CASH";
      await tx.payment.create({
        data: {
          orderId: o.id,
          method: payMethod,
          amountPaise: totals.total,
          status: "COMPLETED",
        },
      });
    }

    // 5. Create Official Invoice Record
    await tx.invoiceRecord.create({
      data: {
        tenantId,
        outletId: d.outletId,
        orderId: o.id,
        invoiceNumber,
        subtotalPaise: totals.subtotal,
        taxPaise: totals.tax,
        discountPaise: d.discountPaise || 0,
        totalPaise: totals.total,
        customerName: d.customerName?.trim() || undefined,
        customerPhone: d.customerPhone?.trim() || undefined,
        status: "FINALIZED",
      },
    });

    // 6. Record Customer & Consent if phone is provided
    if (d.customerPhone) {
      const cleanPhone = d.customerPhone.trim();
      const existingCustomer = await tx.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone: cleanPhone } },
      });
      if (existingCustomer) {
        await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            totalSpentPaise: existingCustomer.totalSpentPaise + totals.total,
            visitCount: existingCustomer.visitCount + 1,
            name: d.customerName?.trim() || existingCustomer.name,
          },
        });
      } else {
        await tx.customer.create({
          data: {
            tenantId,
            name: d.customerName?.trim() || "Guest Customer",
            phone: cleanPhone,
            totalSpentPaise: totals.total,
            visitCount: 1,
          },
        });
      }

      if (d.whatsappConsent) {
        await tx.customerConsent.upsert({
          where: { tenantId_phone_channel: { tenantId, phone: cleanPhone, channel: "WHATSAPP" } },
          create: { tenantId, phone: cleanPhone, channel: "WHATSAPP", optIn: true, optInSource: "POS_BILLING" },
          update: { optIn: true, recordedAt: now },
        });

        await tx.whatsAppDeliveryLog.create({
          data: {
            tenantId,
            outletId: d.outletId,
            orderId: o.id,
            recipientPhone: cleanPhone,
            templateName: "order_invoice_utility",
            status: "QUEUED",
            metadataJson: JSON.stringify({ orderNumber, totalPaise: totals.total, invoiceNumber }),
          },
        });
      }
    }

    // 7. Auto-Queue Print Jobs (KOT & Billing Receipt)
    await tx.printJob.create({
      data: {
        tenantId,
        outletId: d.outletId,
        orderId: o.id,
        jobType: "KOT",
        contentJson: JSON.stringify({
          orderNumber,
          table: d.tableId,
          type: d.type,
          items: d.items.map((i) => ({ name: i.name, quantity: i.quantity, notes: (i as any).notes })),
        }),
        status: "PENDING",
      },
    });

    await tx.printJob.create({
      data: {
        tenantId,
        outletId: d.outletId,
        orderId: o.id,
        jobType: "BILL",
        contentJson: JSON.stringify({
          invoiceNumber,
          orderNumber,
          customerName: d.customerName,
          items: d.items,
          totals,
          date: now.toISOString(),
        }),
        status: "PENDING",
      },
    });

    // 8. Deduct Inventory Stock via Recipe Ingredients
    for (const it of d.items) {
      const recipe = await tx.recipe.findUnique({
        where: { menuItemId: it.menuItemId },
        include: { ingredients: true },
      });
      if (recipe) {
        for (const ing of recipe.ingredients) {
          const inv = await tx.inventoryItem.findUnique({ where: { id: ing.inventoryItemId } });
          if (inv) {
            const deductedQty = (ing.quantity * it.quantity) / recipe.yieldQty;
            const newStock = Math.max(0, inv.currentStock - deductedQty);
            await tx.inventoryItem.update({ where: { id: inv.id }, data: { currentStock: newStock } });
            await tx.stockMovement.create({
              data: {
                tenantId,
                outletId: d.outletId,
                inventoryItemId: inv.id,
                type: "CONSUMPTION",
                quantity: -deductedQty,
                reference: orderNumber,
              },
            });
          }
        }
      }
    }

    // 9. Update Table Status
    if (d.tableId) {
      await tx.table.update({
        where: { id: d.tableId },
        data: {
          status: "AVAILABLE",
          currentOrderId: null,
          orderTotalPaise: 0,
        },
      }).catch(() => {});
    }

    // 10. Audit Log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "ORDER_CREATED_AND_BILLED",
        entity: "Order",
        entityId: o.id,
        metadataJson: JSON.stringify({ orderNumber, total: totals.total, invoiceNumber }),
      },
    });

    return o;
  }, {
    maxWait: 15000, // 15s connection queue acquisition timeout
    timeout: 20000, // 20s transaction execution timeout
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber,
    totals,
  });
}

// Order Lifecycle State Transitions
export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { orderId, action, status: targetStatus, notes } = body;
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, table: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: order.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const currentStatus = order.status;
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ["PLACED", "CANCELLED"],
    OPEN: ["ACCEPTED", "PREPARING", "CANCELLED", "BILLED"],
    PLACED: ["ACCEPTED", "PREPARING", "CANCELLED"],
    ACCEPTED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "BILLED", "CANCELLED"],
    SERVED: ["BILL_REQUESTED", "BILLED", "CANCELLED"],
    BILL_REQUESTED: ["BILLED", "CANCELLED"],
    BILLED: ["PAID", "CLOSED", "CANCELLED"],
    PAID: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };

  const nextStatus = targetStatus || (action === "CLOSE" ? "CLOSED" : action === "CANCEL" ? "CANCELLED" : targetStatus);

  if (nextStatus && nextStatus !== currentStatus) {
    const validNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!validNext.includes(nextStatus) && mem.role !== "OWNER") {
      return NextResponse.json(
        { error: `Invalid status transition from ${currentStatus} to ${nextStatus}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updateData: any = {};
    if (nextStatus) updateData.status = nextStatus;
    if (notes) updateData.notes = notes;
    if (nextStatus === "CLOSED") updateData.billClosedAt = new Date();
    if (nextStatus === "PAID") {
      updateData.isPaid = true;
      updateData.paidAt = new Date();
    }

    const o = await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // If order was cancelled, restore inventory
    if (nextStatus === "CANCELLED" && currentStatus !== "CANCELLED") {
      for (const it of order.items) {
        const recipe = await tx.recipe.findUnique({
          where: { menuItemId: it.menuItemId },
          include: { ingredients: true },
        });
        if (recipe) {
          for (const ing of recipe.ingredients) {
            const restoredQty = (ing.quantity * it.quantity) / recipe.yieldQty;
            await tx.inventoryItem.update({
              where: { id: ing.inventoryItemId },
              data: { currentStock: { increment: restoredQty } },
            });
            await tx.stockMovement.create({
              data: {
                tenantId: order.tenantId,
                outletId: order.outletId,
                inventoryItemId: ing.inventoryItemId,
                type: "RETURN",
                quantity: restoredQty,
                reference: `CANCELLED-${order.orderNumber}`,
              },
            });
          }
        }
      }

      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE", currentOrderId: null, orderTotalPaise: 0 },
        });
      }
    }

    // If order is closed, free table
    if (nextStatus === "CLOSED" && order.tableId) {
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE", currentOrderId: null, orderTotalPaise: 0 },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: order.tenantId,
        userId,
        action: `ORDER_STATUS_${nextStatus}`,
        entity: "Order",
        entityId: order.id,
        metadataJson: JSON.stringify({ from: currentStatus, to: nextStatus }),
      },
    });

    return o;
  }, {
    maxWait: 15000, // 15s connection queue acquisition timeout
    timeout: 20000, // 20s transaction execution timeout
  });

  return NextResponse.json({ ok: true, order: updated });
}
