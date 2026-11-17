import { prisma } from "@/lib/db";
import { broadcastKdsEvent } from "./kds-events";

export type OrderSource = "POS" | "SWIGGY" | "ZOMATO" | "WEBSITE" | "TABLE_QR";

export interface NormalizedOrderItem {
  id?: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise?: number;
  variantName?: string;
  modifiersJson?: string;
  notes?: string;
  station?: string;
}

export interface NormalizedOrderPayload {
  tenantId: string;
  outletId: string;
  orderNumber: string;
  source: OrderSource;
  externalOrderId?: string;
  serviceMode?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  cookingInstructions?: string;
  items: NormalizedOrderItem[];
  subtotalPaise: number;
  taxPaise: number;
  discountPaise?: number;
  deliveryChargePaise?: number;
  packagingChargePaise?: number;
  totalPaise: number;
  isPaid?: boolean;
  paymentMethod?: string;
  idempotencyKey?: string;
  riderDetails?: {
    name?: string;
    phone?: string;
    etaMinutes?: number;
  };
  metadataJson?: string;
}

export interface IngestionResult {
  ok: boolean;
  isDuplicate?: boolean;
  orderId?: string;
  orderNumber?: string;
  ticketId?: string;
  status: string;
  source: OrderSource;
  error?: string;
}

/**
 * Central Order Ingestion Service
 * Ingests orders from POS, Swiggy, Zomato, Online Website, or Table QR into RestroNex.
 * Guarantees idempotency: never creates two kitchen tickets for the same incoming order.
 */
export async function ingestOrder(payload: NormalizedOrderPayload): Promise<IngestionResult> {
  try {
    const {
      tenantId,
      outletId,
      orderNumber,
      source,
      externalOrderId,
      serviceMode = source === "POS" ? "DINE_IN" : "DELIVERY",
      tableId,
      customerName,
      customerPhone,
      notes,
      cookingInstructions,
      items,
      subtotalPaise,
      taxPaise,
      discountPaise = 0,
      totalPaise,
      isPaid = true,
      paymentMethod = source === "SWIGGY" ? "SWIGGY_PAY" : source === "ZOMATO" ? "ZOMATO_PAY" : "UPI",
      idempotencyKey = `ingest_${source}_${externalOrderId || orderNumber}`,
      riderDetails,
    } = payload;

    if (!tenantId || !outletId || !orderNumber) {
      return { ok: false, status: "REJECTED", source, error: "Missing required tenantId, outletId or orderNumber" };
    }

    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, status: "REJECTED", source, error: "Order must contain at least one item" };
    }

    // 1. Idempotency Check: check if order already exists in this tenant
    const existingOrder = await prisma.order.findFirst({
      where: {
        tenantId,
        OR: [
          { idempotencyKey },
          { orderNumber },
          ...(externalOrderId ? [{ aggregatorOrderId: externalOrderId }] : []),
        ],
      },
      include: {
        kotTickets: true,
      },
    });

    if (existingOrder) {
      const existingTicket = existingOrder.kotTickets?.[0];
      await prisma.aggregatorOrderLog.create({
        data: {
          tenantId,
          provider: source.toLowerCase(),
          providerOrderId: String(externalOrderId || orderNumber),
          orderId: existingOrder.id,
          status: "DUPLICATE",
          payloadJson: JSON.stringify(payload),
        },
      }).catch(() => null);

      return {
        ok: true,
        isDuplicate: true,
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        ticketId: existingTicket?.id,
        status: existingOrder.status,
        source,
      };
    }

    // 2. Resolve or create fallback MenuItem for foreign key requirements
    let fallbackMenuItem = await prisma.menuItem.findFirst({
      where: { tenantId },
    });

    if (!fallbackMenuItem) {
      let defaultCat = await prisma.menuCategory.findFirst({
        where: { tenantId },
      });
      if (!defaultCat) {
        defaultCat = await prisma.menuCategory.create({
          data: {
            tenantId,
            name: "Menu",
            slug: `menu-${Date.now()}`,
          },
        });
      }
      fallbackMenuItem = await prisma.menuItem.create({
        data: {
          tenantId,
          categoryId: defaultCat.id,
          name: "Standard Item",
          pricePaise: 10000,
          isVeg: true,
        },
      });
    }

    // 2b. Map items using AggregatorMenuMapping with automatic name matching fallback
    const providerKey = source.toLowerCase();
    const existingMenuMappings = await prisma.aggregatorMenuMapping.findMany({
      where: { tenantId, provider: providerKey },
    });

    const tenantMenuItems = await prisma.menuItem.findMany({
      where: { tenantId },
      select: { id: true, name: true, pricePaise: true },
    });

    const resolvedItems = items.map((it) => {
      // 1) Match by explicit providerItemId or providerItemName
      const mapping = existingMenuMappings.find(
        (m) =>
          (it.id && m.providerItemId === String(it.id)) ||
          m.providerItemName.toLowerCase() === it.name.trim().toLowerCase()
      );

      let matchedMenuItemId = mapping?.restroMenuItemId;
      let isUnmapped = false;

      // 2) Fallback: match by tenant menu item name (case-insensitive)
      if (!matchedMenuItemId) {
        const directNameMatch = tenantMenuItems.find(
          (m) => m.name.toLowerCase().trim() === it.name.toLowerCase().trim()
        );
        if (directNameMatch) {
          matchedMenuItemId = directNameMatch.id;
        }
      }

      // 3) Fallback to default menuItem with unmapped warning
      if (!matchedMenuItemId) {
        matchedMenuItemId = fallbackMenuItem!.id;
        isUnmapped = true;
      }

      const itemNotes = [
        it.notes,
        isUnmapped ? "[UNMAPPED ITEM - REQUIRES ATTENTION]" : null,
      ]
        .filter(Boolean)
        .join(" • ");

      return {
        ...it,
        menuItemId: matchedMenuItemId,
        notes: itemNotes || null,
        isUnmapped,
      };
    });

    // 3. Compile special notes including rider details and cooking instructions
    const combinedNotes = [
      cookingInstructions ? `Instructions: ${cookingInstructions}` : null,
      notes ? `Note: ${notes}` : null,
      riderDetails?.name ? `Rider: ${riderDetails.name}${riderDetails.phone ? ` (${riderDetails.phone})` : ""}` : null,
      resolvedItems.some((i) => i.isUnmapped) ? "⚠️ Contains unmapped aggregator items" : null,
    ]
      .filter(Boolean)
      .join(" • ") || undefined;

    // 4. Transform items data
    const orderItemsCreate = resolvedItems.map((it) => {
      const itTotal = it.totalPaise || it.quantity * it.unitPricePaise;
      return {
        menuItemId: it.menuItemId,
        name: it.name,
        quantity: Math.max(1, it.quantity),
        unitPricePaise: it.unitPricePaise,
        totalPaise: itTotal,
        variantName: it.variantName || null,
        modifiersJson: it.modifiersJson || null,
        notes: it.notes || null,
        kotStatus: "RECEIVED",
      };
    });

    // Determine primary station (defaults to MAIN or item station)
    const primaryStation = items.find((i) => i.station && i.station !== "MAIN")?.station || "MAIN";

    // 5. Atomic transaction to create Order, OrderItems, Payment, KitchenTicket, and PrintJob
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          tenantId,
          outletId,
          orderNumber,
          type: source,
          channel: source,
          aggregatorOrderId: externalOrderId || null,
          aggregatorStatus: "CONFIRMED",
          serviceMode,
          tableId: tableId || null,
          status: "PLACED",
          customerName: customerName || `${source} Customer`,
          customerPhone: customerPhone || null,
          notes: combinedNotes,
          subtotalPaise,
          taxPaise,
          discountPaise,
          totalPaise,
          isPaid,
          paidAt: isPaid ? new Date() : null,
          kotStatus: "SENT",
          idempotencyKey,
          items: {
            create: orderItemsCreate,
          },
          payments: {
            create: {
              tenantId,
              outletId,
              method: paymentMethod,
              amountPaise: totalPaise,
              status: isPaid ? "COMPLETED" : "PENDING",
              reference: externalOrderId ? `${source} Order #${externalOrderId}` : `POS ${orderNumber}`,
            },
          },
          kotTickets: {
            create: {
              tenantId,
              outletId,
              station: primaryStation,
              status: "RECEIVED",
              priority: source === "SWIGGY" || source === "ZOMATO" ? 1 : 0,
            },
          },
        },
        include: {
          items: true,
          kotTickets: true,
        },
      });

      const ticket = order.kotTickets[0];

      // Format KOT content for thermal receipt printing
      const kotLines = [
        "========================================",
        "         KITCHEN ORDER TICKET (KOT)     ",
        "========================================",
        `Order: ${order.orderNumber}  Source: ${source}`,
        `Type:  ${serviceMode}        Station: ${ticket.station}`,
        `Time:  ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`,
        ...(payload.tableNumber ? [`Table: ${payload.tableNumber}`] : []),
        ...(customerName ? [`Customer: ${customerName}`] : []),
        "----------------------------------------",
        "ITEM                              QTY   ",
        "----------------------------------------",
        ...items.map((it) => {
          const itemLines = [
            `${(it.name.length > 28 ? it.name.slice(0, 26) + ".." : it.name).padEnd(30, " ")} ×${String(it.quantity).padStart(2, " ")}`,
          ];
          if (it.variantName) {
            itemLines.push(`   [${it.variantName}]`);
          }
          if (it.modifiersJson) {
            try {
              const mods = JSON.parse(it.modifiersJson);
              if (Array.isArray(mods)) {
                for (const m of mods) {
                  itemLines.push(`   + ${m.name || m.optionNameSnapshot}`);
                }
              }
            } catch {}
          }
          if (it.notes) {
            itemLines.push(`   Note: ${it.notes}`);
          }
          return itemLines.join("\n");
        }),
        "----------------------------------------",
        ...(combinedNotes ? [`SPECIAL INSTRUCTIONS:\n"${combinedNotes}"`, "----------------------------------------"] : []),
        `Ticket ID: ${ticket.id.slice(-8)}`,
        "========================================",
      ].join("\n");

      // Auto-create KOT Print Job
      await tx.printJob.create({
        data: {
          tenantId,
          outletId,
          orderId: order.id,
          idempotencyKey: `kot_print_${ticket.id}`,
          jobType: "KOT",
          paperWidth: "80mm",
          contentJson: JSON.stringify({
            ticketId: ticket.id,
            orderNumber: order.orderNumber,
            source,
            station: ticket.station,
            createdAt: ticket.createdAt,
            textPlain: kotLines,
            items: items.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              variant: it.variantName,
              notes: it.notes,
            })),
            notes: combinedNotes,
          }),
          status: "QUEUED",
        },
      });

      return { order, ticket };
    });

    // 6. Broadcast Realtime KDS Event
    const itemsSummary = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    broadcastKdsEvent({
      type: "NEW_ORDER",
      tenantId,
      outletId,
      ticketId: result.ticket.id,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      source,
      status: "RECEIVED",
      customerName: result.order.customerName || undefined,
      itemsSummary,
      payload: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        source,
        tableNumber: payload.tableNumber,
        itemsCount: items.length,
        notes: combinedNotes,
      },
    });

    // 7. Persist to AggregatorOrderLog
    await prisma.aggregatorOrderLog.create({
      data: {
        tenantId,
        provider: source.toLowerCase(),
        providerOrderId: String(externalOrderId || orderNumber),
        orderId: result.order.id,
        status: "SUCCESS",
        payloadJson: JSON.stringify(payload),
      },
    }).catch(() => null);

    return {
      ok: true,
      isDuplicate: false,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      ticketId: result.ticket.id,
      status: "RECEIVED",
      source,
    };
  } catch (err: any) {
    console.error("[OrderIngestion] Ingestion error:", err);
    await prisma.aggregatorOrderLog.create({
      data: {
        tenantId: payload.tenantId,
        provider: (payload.source || "aggregator").toLowerCase(),
        providerOrderId: String(payload.externalOrderId || payload.orderNumber || "unknown"),
        status: "FAILED",
        payloadJson: JSON.stringify(payload),
        errorMessage: err?.message || "Ingestion error",
      },
    }).catch(() => null);

    return {
      ok: false,
      status: "FAILED",
      source: payload.source,
      error: err?.message || "Failed to ingest order into kitchen system",
    };
  }
}

/**
 * Handles order cancellation from Swiggy, Zomato, POS or Website.
 * Updates the specific order and ticket, triggers cancellation alert on KDS.
 */
export async function cancelOrder(params: {
  tenantId: string;
  outletId?: string;
  orderNumber?: string;
  externalOrderId?: string;
  reason?: string;
  source: string;
}): Promise<{ ok: boolean; orderId?: string; orderNumber?: string; error?: string }> {
  try {
    const { tenantId, orderNumber, externalOrderId, reason = "Cancelled by aggregator", source } = params;

    const searchTerms = Array.from(
      new Set(
        [
          orderNumber,
          externalOrderId,
          orderNumber ? `SWIGGY-${orderNumber.replace(/^(SWIGGY|ZOMATO)-/, "")}` : null,
          orderNumber ? `ZOMATO-${orderNumber.replace(/^(SWIGGY|ZOMATO)-/, "")}` : null,
          externalOrderId ? `SWIGGY-${externalOrderId}` : null,
          externalOrderId ? `ZOMATO-${externalOrderId}` : null,
        ].filter(Boolean) as string[]
      )
    );

    const targetOrder = await prisma.order.findFirst({
      where: {
        tenantId,
        OR: [
          ...searchTerms.map((t) => ({ orderNumber: t })),
          ...searchTerms.map((t) => ({ aggregatorOrderId: t })),
        ],
      },
      include: {
        kotTickets: true,
      },
    });

    if (!targetOrder) {
      return { ok: false, error: `Order not found for cancellation (Order: ${orderNumber || externalOrderId})` };
    }

    // Update order status
    await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        aggregatorStatus: "CANCELLED",
        kotStatus: "CANCELLED",
      },
    });

    // Update ONLY this specific order's kitchen tickets
    await prisma.kitchenTicket.updateMany({
      where: {
        id: { in: targetOrder.kotTickets.map((t) => t.id) },
      },
      data: {
        status: "CANCELLED",
      },
    });

    // Broadcast cancellation event to trigger cancellation audio alarm on kitchen displays
    broadcastKdsEvent({
      type: "ORDER_CANCELLED",
      tenantId,
      outletId: targetOrder.outletId,
      orderId: targetOrder.id,
      orderNumber: targetOrder.orderNumber,
      source: targetOrder.type || source,
      status: "CANCELLED",
      cancelReason: reason,
      payload: {
        orderNumber: targetOrder.orderNumber,
        reason,
        source: targetOrder.type || source,
      },
    });

    return { ok: true, orderId: targetOrder.id, orderNumber: targetOrder.orderNumber };
  } catch (err: any) {
    console.error("[OrderIngestion] Cancellation error:", err);
    return { ok: false, error: err?.message || "Failed to cancel order" };
  }
}

/**
 * Acknowledges a kitchen ticket, stopping the repeating sound alert on all kitchen displays.
 */
export async function acknowledgeKitchenTicket(params: {
  ticketId: string;
  tenantId: string;
  userId?: string;
  userName?: string;
}): Promise<{ ok: boolean; ticket?: any; error?: string }> {
  try {
    const { ticketId, tenantId, userName = "Kitchen Staff" } = params;

    const existing = await prisma.kitchenTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: { order: true },
    });

    if (!existing) {
      return { ok: false, error: "Kitchen ticket not found" };
    }

    const now = new Date();
    const updated = await prisma.kitchenTicket.update({
      where: { id: ticketId },
      data: {
        acknowledgedAt: now,
        acknowledgedBy: userName,
        status: existing.status === "RECEIVED" ? "ACCEPTED" : existing.status,
      },
    });

    broadcastKdsEvent({
      type: "TICKET_ACKNOWLEDGED",
      tenantId,
      outletId: existing.outletId,
      ticketId,
      orderId: existing.orderId,
      orderNumber: existing.order?.orderNumber,
      status: updated.status,
    });

    return { ok: true, ticket: updated };
  } catch (err: any) {
    console.error("[OrderIngestion] Acknowledge error:", err);
    return { ok: false, error: err?.message || "Failed to acknowledge ticket" };
  }
}

/**
 * Updates a kitchen ticket status (ACCEPTED -> PREPARING -> READY -> COMPLETED).
 */
export async function updateKitchenTicketStatus(params: {
  ticketId: string;
  tenantId: string;
  status: "RECEIVED" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED";
  userName?: string;
}): Promise<{ ok: boolean; ticket?: any; error?: string }> {
  try {
    const { ticketId, tenantId, status, userName } = params;

    const existing = await prisma.kitchenTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: { order: true },
    });

    if (!existing) {
      return { ok: false, error: "Kitchen ticket not found" };
    }

    const updateData: any = { status };
    if (!existing.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
      updateData.acknowledgedBy = userName || "Kitchen Staff";
    }

    const updated = await prisma.kitchenTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Synchronize Order status
    let orderStatus = existing.order.status;
    let kotStatus = existing.order.kotStatus;
    let aggregatorStatus = existing.order.aggregatorStatus;

    if (status === "ACCEPTED") {
      kotStatus = "ACCEPTED";
      aggregatorStatus = "CONFIRMED";
    } else if (status === "PREPARING") {
      kotStatus = "PREPARING";
      orderStatus = "IN_PROGRESS";
      aggregatorStatus = "PREPARING";
    } else if (status === "READY") {
      kotStatus = "READY";
      aggregatorStatus = "READY_FOR_PICKUP";
    } else if (status === "COMPLETED") {
      kotStatus = "SERVED";
      orderStatus = "BILLED";
      aggregatorStatus = "DELIVERED";
    }

    await prisma.order.update({
      where: { id: existing.orderId },
      data: {
        kotStatus,
        status: orderStatus,
        ...(aggregatorStatus ? { aggregatorStatus } : {}),
      },
    });

    broadcastKdsEvent({
      type: "TICKET_STATUS_UPDATED",
      tenantId,
      outletId: existing.outletId,
      ticketId,
      orderId: existing.orderId,
      orderNumber: existing.order.orderNumber,
      status,
    });

    return { ok: true, ticket: updated };
  } catch (err: any) {
    console.error("[OrderIngestion] Status update error:", err);
    return { ok: false, error: err?.message || "Failed to update ticket status" };
  }
}
