import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { orderCreateSchema } from "@/lib/validators";
import { calcOrderTotals } from "@/lib/money";
import { validateAndPriceCartItems } from "@/lib/addon-pricing";
import { normalizeWhatsAppPhone, queueAndSendWhatsAppInvoice } from "@/lib/whatsapp-invoice";
import { generateAndPersistInvoicePdf } from "@/lib/invoice-storage";
import { queueAndDispatchBillPrintJob } from "@/lib/thermal-printer";
import { appCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const status = req.nextUrl.searchParams.get("status");
  const orderId = req.nextUrl.searchParams.get("orderId");
  const tableId = req.nextUrl.searchParams.get("tableId");
  const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50), 100);
  const cursor = req.nextUrl.searchParams.get("cursor");

  const where: any = { tenantId };
  if (outletId) where.outletId = outletId;
  if (status) where.status = status;
  if (orderId) where.id = orderId;
  if (tableId) where.tableId = tableId;

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
      printJobs: { orderBy: { createdAt: "desc" }, take: 2 },
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

  // Idempotency check: prevent duplicate bills/invoices/notifications on double-clicks or refreshes
  const idempotencyKey = (body as any).idempotencyKey ? String((body as any).idempotencyKey).trim() : null;
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey,
        },
      },
      include: {
        items: true,
        payments: true,
        invoice: true,
        table: { select: { id: true, number: true, area: true } },
        whatsAppQueue: { orderBy: { createdAt: "desc" }, take: 1 },
        printJobs: { where: { jobType: "BILL" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (existing) {
      return NextResponse.json({
        ...existing,
        ok: true,
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        invoiceNumber: existing.invoice?.invoiceNumber,
        invoicePdfUrl: existing.invoice?.fileUrl || null,
        whatsapp: existing.whatsAppQueue?.[0]
          ? { queued: true, queueId: existing.whatsAppQueue[0].id, status: existing.whatsAppQueue[0].status }
          : { queued: false, status: existing.whatsappStatus || "NOT_CONFIGURED" },
        printJob: existing.printJobs?.[0]
          ? { jobId: existing.printJobs[0].id, status: existing.printJobs[0].status, requiresClientDispatch: false }
          : { jobId: null, status: existing.printStatus || "NOT_CONFIGURED", requiresClientDispatch: false },
        replayed: true,
      });
    }
  }

  // Verify outlet belongs to tenant
  const outlet = await prisma.outlet.findFirst({ where: { id: d.outletId, tenantId } });
  if (!outlet) return NextResponse.json({ error: "Invalid outlet for tenant" }, { status: 400 });

  // Authoritative Server-Side Product & Add-on Pricing Verification
  const pricingResult = await validateAndPriceCartItems({
    tenantId,
    outletId: d.outletId,
    items: d.items.map((it) => ({
      menuItemId: it.menuItemId,
      quantity: it.quantity,
      variantName: (it as any).variantName,
      notes: (it as any).notes,
      selectedAddons: (it as any).selectedAddons || (it as any).modifiers,
      modifiers: (it as any).modifiers,
    })),
  });

  if (!pricingResult.ok) {
    return NextResponse.json({ error: pricingResult.error || "Order validation failed" }, { status: 400 });
  }

  // Calculate accurate minor-unit totals (paise) using trusted database prices
  const totals = calcOrderTotals({
    lineTotalsPaise: pricingResult.items.map((it) => it.lineTotalPaise),
    discountPaise: d.discountPaise || 0,
    taxRateBps: 1800, // 9% CGST + 9% SGST = 18%
    serviceChargeBps: 0,
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randCode =
    now.getTime().toString(36).slice(-2).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase();
  const orderNumber = `ORD-${dateStr}-${randCode}`;
  const invoiceNumber = `INV-${dateStr}-${randCode}`;

  const isOnlineGateway = d.paymentMethod === "RAZORPAY_ONLINE";
  const initialStatus = isOnlineGateway ? "PLACED" : "BILLED";

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
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
          isPaid: !isOnlineGateway,
          paidAt: !isOnlineGateway ? now : null,
          billClosedAt: !isOnlineGateway ? now : null,
          whatsappConsent: d.whatsappConsent || false,
          whatsappStatus: null,
          printStatus: null,
          idempotencyKey: idempotencyKey || null,
        },
      });

    // 2. High-performance create of order items with immutable add-on snapshots
    for (const it of pricingResult.items) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: o.id,
          menuItemId: it.menuItemId,
          name: it.name,
          quantity: it.quantity,
          unitPricePaise: it.unitPricePaise,
          variantName: it.variantName || null,
          modifiersJson: it.modifiersJson || null,
          notes: it.notes || null,
          totalPaise: it.lineTotalPaise,
          kotStatus: "SENT",
        },
      });

      if (it.addons && it.addons.length > 0) {
        await tx.orderItemAddon.createMany({
          data: it.addons.map((a) => ({
            orderItemId: orderItem.id,
            addonGroupId: a.groupId,
            addonOptionId: a.optionId,
            groupNameSnapshot: a.groupName,
            optionNameSnapshot: a.name,
            pricePaiseSnapshot: a.pricePaise,
            quantity: a.quantity || 1,
          })),
        });
      }
    }

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
          tenantId,
          outletId: d.outletId,
          method: sp.method,
          amountPaise: sp.amountPaise,
          status: "COMPLETED",
          isGatewayConfirmed: false,
          reference: sp.reference || "Split POS Payment",
        })),
      });
    } else {
      const payMethod = d.paymentMethod || "CASH";
      await tx.payment.create({
        data: {
          orderId: o.id,
          tenantId,
          outletId: d.outletId,
          method: payMethod,
          amountPaise: totals.total,
          status: isOnlineGateway ? "PENDING" : "COMPLETED",
          isGatewayConfirmed: false,
          reference: payMethod === "CASH" ? "Cash at Counter" : payMethod === "CARD" ? "Card Terminal" : "Staff POS Recorded",
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

    // 6. Record Customer, Loyalty Rewards & Consent if phone is provided
    if (d.customerPhone) {
      const cleanPhone = d.customerPhone.trim();
      const pointsEarned = Math.floor(totals.total / 10000) * 5; // 5 points per ₹100 spent
      const pointsRedeemed = Math.max(0, d.loyaltyPointsRedeemed || 0);

      const existingCustomer = await tx.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone: cleanPhone } },
      });

      let customerId = "";

      if (existingCustomer) {
        customerId = existingCustomer.id;
        const newBalance = Math.max(0, existingCustomer.loyaltyPoints - pointsRedeemed + pointsEarned);
        await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            totalSpentPaise: existingCustomer.totalSpentPaise + totals.total,
            visitCount: existingCustomer.visitCount + 1,
            loyaltyPoints: newBalance,
            name: d.customerName?.trim() || existingCustomer.name,
          },
        });
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            tenantId,
            name: d.customerName?.trim() || "Guest Customer",
            phone: cleanPhone,
            loyaltyPoints: Math.max(0, pointsEarned - pointsRedeemed),
            totalSpentPaise: totals.total,
            visitCount: 1,
          },
        });
        customerId = newCustomer.id;
      }

      // Record loyalty transaction ledger
      if (customerId) {
        if (pointsRedeemed > 0) {
          await tx.loyaltyTxn.create({
            data: {
              customerId,
              points: -pointsRedeemed,
              type: "REDEEM",
              reference: `Order #${orderNumber}`,
            },
          });
        }
        if (pointsEarned > 0) {
          await tx.loyaltyTxn.create({
            data: {
              customerId,
              points: pointsEarned,
              type: "EARN",
              reference: `Order #${orderNumber}`,
            },
          });
        }
      }

      if (d.whatsappConsent) {
        const normPhone = normalizeWhatsAppPhone(cleanPhone);
        const existingConsent = await tx.customerConsent.findUnique({
          where: { tenantId_phone_channel: { tenantId, phone: normPhone, channel: "WHATSAPP" } },
        });
        // Respect prior opt-outs unless explicit re-consent, and NEVER auto-enable promotional marketingOptIn
        if (!existingConsent || existingConsent.optIn) {
          await tx.customerConsent.upsert({
            where: { tenantId_phone_channel: { tenantId, phone: normPhone, channel: "WHATSAPP" } },
            create: {
              tenantId,
              customerId: customerId || null,
              phone: normPhone,
              channel: "WHATSAPP",
              optIn: true,
              marketingOptIn: false,
              optInSource: "POS_BILLING",
            },
            update: {
              customerId: customerId || undefined,
              optIn: true,
              recordedAt: now,
            },
          });
        }
      }
    }

    // 7. Auto-Deduct Inventory via Recipe Bill of Materials (BOM)
    for (const it of d.items) {
      if (!it.menuItemId) continue;
      const recipe = await tx.recipe.findUnique({
        where: { menuItemId: it.menuItemId },
        include: { ingredients: true },
      });
      if (recipe && recipe.ingredients.length > 0) {
        for (const ing of recipe.ingredients) {
          const deductQty = (ing.quantity * it.quantity) / (recipe.yieldQty || 1);
          await tx.inventoryItem.update({
            where: { id: ing.inventoryItemId },
            data: { currentStock: { decrement: deductQty } },
          });
          await tx.stockMovement.create({
            data: {
              tenantId,
              outletId: d.outletId,
              inventoryItemId: ing.inventoryItemId,
              quantity: -deductQty,
              type: "SALE_CONSUMPTION",
              reference: `Order #${orderNumber}: ${it.name} ×${it.quantity}`,
            },
          });
        }
      }
    }

    // 7. Queue KOT only if outlet has a dedicated KOT printer configured
    const kotPrinter = await tx.printerDevice.findFirst({
      where: {
        tenantId,
        outletId: d.outletId,
        OR: [{ isDefaultKOT: true }, { station: "MAIN" }],
      },
      orderBy: { isDefaultKOT: "desc" },
    });
    if (kotPrinter) {
      await tx.printJob.create({
        data: {
          tenantId,
          outletId: d.outletId,
          printerId: kotPrinter.id,
          orderId: o.id,
          idempotencyKey: `kot_${o.id}`,
          jobType: "KOT",
          paperWidth: kotPrinter.paperWidth === "58mm" ? "58mm" : "80mm",
          contentJson: JSON.stringify({
            orderNumber,
            table: d.tableId,
            type: d.type,
            items: d.items.map((i) => ({ name: i.name, quantity: i.quantity, notes: (i as any).notes })),
          }),
          status: "QUEUED",
        },
      });
    }

    // 8. Update Table Status
    if (d.tableId) {
      if (o.isPaid) {
        await tx.table.update({
          where: { id: d.tableId },
          data: {
            status: "AVAILABLE",
            currentOrderId: null,
            orderTotalPaise: 0,
          },
        }).catch(() => {});
      } else {
        await tx.table.update({
          where: { id: d.tableId },
          data: {
            status: "OCCUPIED",
            currentOrderId: o.id,
            orderTotalPaise: totals.total,
          },
        }).catch(() => {});
      }
    }

    // 9. Audit Log
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
  } catch (txErr: any) {
    if (txErr?.code === "P2002" && idempotencyKey) {
      const raced = await prisma.order.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
        include: {
          items: true,
          payments: true,
          invoice: true,
          whatsAppQueue: { orderBy: { createdAt: "desc" }, take: 1 },
          printJobs: { where: { jobType: "BILL" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
      if (raced) {
        return NextResponse.json({
          ...raced,
          ok: true,
          orderId: raced.id,
          orderNumber: raced.orderNumber,
          invoiceNumber: raced.invoice?.invoiceNumber,
          invoicePdfUrl: raced.invoice?.fileUrl || null,
          whatsapp: raced.whatsAppQueue?.[0]
            ? { queued: true, queueId: raced.whatsAppQueue[0].id, status: raced.whatsAppQueue[0].status }
            : { queued: false, status: raced.whatsappStatus || "NOT_CONFIGURED" },
          printJob: raced.printJobs?.[0]
            ? { jobId: raced.printJobs[0].id, status: raced.printJobs[0].status, requiresClientDispatch: false }
            : { jobId: null, status: raced.printStatus || "NOT_CONFIGURED", requiresClientDispatch: false },
          replayed: true,
        });
      }
    }
    throw txErr;
  }

  // Non-blocking independent workflows after atomic DB finalization:
  // 1) Persist private Invoice PDF to Supabase Storage
  // 2) Independently dispatch WhatsApp invoice + Thermal bill printing via Promise.allSettled
  const origin = req.nextUrl.origin;
  let invoicePdfUrl: string | null = null;
  try {
    const persisted = await generateAndPersistInvoicePdf(order.id, origin);
    if (persisted?.signedPdfUrl) {
      invoicePdfUrl = persisted.signedPdfUrl;
    }
  } catch (pdfErr) {
    console.error("[Orders] Non-fatal PDF storage error:", pdfErr);
  }

  const [waSettled, printSettled] = await Promise.allSettled([
    order.customerPhone
      ? queueAndSendWhatsAppInvoice(order.id, { baseUrl: origin })
      : Promise.resolve({ queued: false, status: "NOT_CONFIGURED", reason: "No customer mobile number entered" }),
    queueAndDispatchBillPrintJob(order.id, { baseUrl: origin }),
  ]);

  const whatsappResult =
    waSettled.status === "fulfilled"
      ? waSettled.value
      : { queued: false, status: "FAILED", reason: "WhatsApp dispatch failure" };

  const printResult =
    printSettled.status === "fulfilled"
      ? printSettled.value
      : { jobId: null, status: "FAILED", requiresClientDispatch: false, error: "Print dispatch failure" };

  appCache.delPrefix(`report_${tenantId}`);

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber,
    invoicePdfUrl,
    totals,
    whatsapp: whatsappResult,
    printJob: printResult,
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

  if (nextStatus === "BILLED" || nextStatus === "PAID") {
    const origin = req.nextUrl.origin;
    Promise.allSettled([
      generateAndPersistInvoicePdf(order.id, origin),
      order.customerPhone ? queueAndSendWhatsAppInvoice(order.id, { baseUrl: origin }) : Promise.resolve(null),
      queueAndDispatchBillPrintJob(order.id, { baseUrl: origin }),
    ]).catch((err) => {
      console.error("[Orders PATCH] Failed non-blocking automation:", err);
    });
  } else if (nextStatus === "CANCELLED") {
    // If order cancelled, cancel pending WhatsApp deliveries
    prisma.whatsAppMessageQueue.updateMany({
      where: { orderId: order.id, status: { in: ["QUEUED", "SENDING"] } },
      data: { status: "CANCELLED", lastError: "Order cancelled before delivery" },
    }).catch(() => {});
  }

  appCache.delPrefix(`report_${order.tenantId}`);
  return NextResponse.json({ ok: true, order: updated });
}
