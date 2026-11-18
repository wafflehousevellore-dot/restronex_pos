import { prisma } from "@/lib/db";
import { ingestOrder, OrderSource } from "@/lib/order-ingestion";
import {
  AggregatorProvider,
  NormalizedOrderPayload,
} from "../core/integration-types";
import { UnmappedStoreError } from "../core/integration-errors";

export class AggregatorOrderIngestionService {
  /**
   * Process and ingest a normalized aggregator order
   */
  public static async processOrder(payload: NormalizedOrderPayload) {
    const {
      provider,
      providerOrderId,
      displayOrderId,
      providerStoreId,
      customerName,
      customerMaskedPhone,
      deliveryAddressMasked,
      orderStatus,
      prepTimeMinutes,
      rawPayloadJson,
      items,
      riderName,
      riderPhone,
      riderStatus,
      grossAmountPaise,
      discountPaise,
      deliveryFeePaise,
      taxesPaise,
      commissionPaise = Math.round(grossAmountPaise * 0.18),
      netPayoutPaise = grossAmountPaise - Math.round(grossAmountPaise * 0.18),
    } = payload;

    // 1. Idempotency Check: check if order was already ingested
    const existingRef = await prisma.aggregatorOrderReference.findFirst({
      where: {
        provider,
        providerOrderId,
      },
      include: {
        order: true,
      },
    });

    if (existingRef) {
      return {
        ok: true,
        isDuplicate: true,
        orderId: existingRef.orderId,
        orderNumber: existingRef.order.orderNumber,
        providerOrderId,
        status: existingRef.orderStatus,
      };
    }

    // 2. Find outlet mapping for providerStoreId
    const mapping = await prisma.aggregatorOutletMapping.findFirst({
      where: {
        provider,
        providerStoreId,
      },
      include: {
        outlet: true,
        tenant: true,
      },
    });

    if (!mapping) {
      // Record in AggregatorExceptionQueue
      await prisma.aggregatorExceptionQueue.create({
        data: {
          tenantId: "unknown",
          provider,
          externalOrderId: providerOrderId,
          errorType: "OUTLET_UNMAPPED",
          reason: `No outlet mapping found for store ${providerStoreId} on ${provider}`,
          payloadJson: rawPayloadJson,
        },
      }).catch(() => null);

      throw new UnmappedStoreError(providerStoreId, provider);
    }

    const { tenantId, outletId } = mapping;

    // 3. Resolve item mappings and kitchen stations
    const resolvedItems: {
      name: string;
      quantity: number;
      unitPricePaise: number;
      totalPaise: number;
      variantName?: string;
      modifiersJson?: string;
      notes?: string;
      station?: string;
    }[] = [];

    for (const item of items) {
      // Look up in menu mappings or items
      const menuMapping = await prisma.aggregatorMenuMapping.findFirst({
        where: {
          tenantId,
          provider,
          providerItemId: item.providerItemId,
        },
        include: {
          menuItem: {
            include: { category: true },
          },
        },
      });

      const categoryName = menuMapping?.categoryName || menuMapping?.menuItem?.category?.name || "";
      const isBar = /beverage|drink|shake|juice|bar|mocktail|cocktail/i.test(categoryName);
      const station = isBar ? "BAR" : "MAIN";

      let modifiersJson: string | undefined = undefined;
      if (item.addons && item.addons.length > 0) {
        modifiersJson = JSON.stringify(
          item.addons.map((a) => ({
            name: a.name,
            pricePaise: a.pricePaise,
            groupName: a.groupName,
          }))
        );
      }

      resolvedItems.push({
        name: item.name,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        totalPaise: item.unitPricePaise * item.quantity,
        variantName: item.variantName,
        modifiersJson,
        notes: item.notes,
        station,
      });

      // If item was completely unmapped, log exception for tracking
      if (!menuMapping) {
        await prisma.aggregatorExceptionQueue.create({
          data: {
            tenantId,
            outletId,
            provider,
            externalOrderId: providerOrderId,
            errorType: "ITEM_UNMAPPED",
            reason: `Item '${item.name}' (${item.providerItemId}) was not found in catalog; processed automatically.`,
            payloadJson: JSON.stringify(item),
          },
        }).catch(() => null);
      }
    }

    // 4. Generate order number (e.g. SWG-9202 or ZOM-4182)
    const prefix = provider === "SWIGGY" ? "SWG" : "ZOM";
    const orderNumber = `${prefix}-${providerOrderId.slice(-6)}`;

    // 5. Ingest into core POS / Kitchen system
    const ingestionResult = await ingestOrder({
      tenantId,
      outletId,
      orderNumber,
      source: provider as OrderSource,
      externalOrderId: providerOrderId,
      serviceMode: "DELIVERY",
      customerName,
      customerPhone: customerMaskedPhone,
      customerAddress: deliveryAddressMasked,
      notes: `Aggregator: ${provider} | Order Ref: ${displayOrderId}`,
      items: resolvedItems,
      subtotalPaise: grossAmountPaise - taxesPaise,
      taxPaise: taxesPaise,
      discountPaise,
      deliveryChargePaise: deliveryFeePaise,
      totalPaise: grossAmountPaise,
      isPaid: true,
      paymentMethod: `${provider}_PAY`,
      idempotencyKey: `agg_${provider}_${providerOrderId}`,
      riderDetails: {
        name: riderName,
        phone: riderPhone,
      },
    });

    if (!ingestionResult.ok || !ingestionResult.orderId) {
      throw new Error(`Core order ingestion failed: ${ingestionResult.error}`);
    }

    // 6. Create AggregatorOrderReference
    await prisma.aggregatorOrderReference.create({
      data: {
        tenantId,
        outletId,
        orderId: ingestionResult.orderId,
        provider,
        providerOrderId,
        displayOrderId,
        providerStoreId,
        customerName,
        customerMaskedPhone,
        deliveryAddressMasked,
        orderStatus,
        prepTimeMinutes,
        rawPayloadJson,
        riderName,
        riderPhone,
        riderStatus,
        itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
        grossAmountPaise,
        discountPaise,
        deliveryFeePaise,
        taxesPaise,
        netPayoutPaise,
        commissionPaise,
      },
    });

    return {
      ok: true,
      orderId: ingestionResult.orderId,
      orderNumber,
      ticketId: ingestionResult.ticketId,
      providerOrderId,
      displayOrderId,
      status: orderStatus,
    };
  }

  /**
   * Update rider or delivery status for an existing order
   */
  public static async updateRiderStatus(params: {
    provider: AggregatorProvider;
    providerOrderId: string;
    riderName?: string;
    riderPhone?: string;
    riderStatus?: string;
  }) {
    const { provider, providerOrderId, riderName, riderPhone, riderStatus } = params;

    const ref = await prisma.aggregatorOrderReference.findFirst({
      where: { provider, providerOrderId },
    });

    if (!ref) return null;

    return prisma.aggregatorOrderReference.update({
      where: { id: ref.id },
      data: {
        ...(riderName ? { riderName } : {}),
        ...(riderPhone ? { riderPhone } : {}),
        ...(riderStatus ? { riderStatus } : {}),
      },
    });
  }

  /**
   * Cancel order requested by aggregator
   */
  public static async cancelOrder(params: {
    provider: AggregatorProvider;
    providerOrderId: string;
    reason?: string;
  }) {
    const { provider, providerOrderId, reason } = params;

    const ref = await prisma.aggregatorOrderReference.findFirst({
      where: { provider, providerOrderId },
    });

    if (!ref) return null;

    // Update AggregatorOrderReference
    await prisma.aggregatorOrderReference.update({
      where: { id: ref.id },
      data: {
        orderStatus: "CANCELLED",
        cancelReason: reason || "Cancelled by aggregator",
      },
    });

    // Update core Order and Kitchen Tickets
    await prisma.order.update({
      where: { id: ref.orderId },
      data: {
        status: "CANCELLED",
        cancelReason: reason || "Cancelled by aggregator",
      },
    });

    await prisma.kitchenTicket.updateMany({
      where: { orderId: ref.orderId },
      data: { status: "CANCELLED" },
    });

    return { success: true };
  }
}
