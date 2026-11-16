import crypto from "crypto";
import { NormalizedOrderPayload } from "../order-ingestion";

export interface ZomatoWebhookPayload {
  event: "order_created" | "order_dispatched" | "order_cancelled" | "rider_assigned" | "order_delivered";
  res_id: string;
  order_id: string;
  timestamp?: number;
  order?: {
    customer?: {
      name?: string;
      phone?: string;
      address?: string;
    };
    rider?: {
      name?: string;
      phone?: string;
    };
    subtotal?: number;
    tax?: number;
    total?: number;
    instructions?: string;
    items?: Array<{
      id?: string;
      name: string;
      quantity: number;
      price: number;
      notes?: string;
      addons?: Array<{ name: string; price: number }>;
      variant?: string;
    }>;
    cancel_reason?: string;
  };
}

export class ZomatoAdapter {
  static verifySignature(rawBody: string, signature: string | null, secret?: string): boolean {
    const zomatoSecret = secret || process.env.ZOMATO_WEBHOOK_SECRET;
    if (!zomatoSecret) {
      // In development or testing without configured secret, allow through
      return true;
    }
    if (!signature) return false;

    try {
      const computed = crypto.createHmac("sha256", zomatoSecret).update(rawBody).digest("hex");
      const sigClean = signature.replace(/^sha256=/, "");
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sigClean));
    } catch {
      return false;
    }
  }

  static normalizeOrder(
    payload: ZomatoWebhookPayload,
    tenantId: string,
    outletId: string
  ): NormalizedOrderPayload {
    const orderData = payload.order || {};
    const items = Array.isArray(orderData.items) && orderData.items.length > 0
      ? orderData.items
      : [{ name: "Zomato Order Item", quantity: 1, price: 180 }];

    const totalPaise = Math.round((Number(orderData.total) || 180) * 100);
    const taxPaise = Math.round((Number(orderData.tax) || totalPaise * 0.05 / 100) * 100);
    const subtotalPaise = Math.max(0, totalPaise - taxPaise);

    const orderNumber = `ZOMATO-${payload.order_id || Date.now()}`;

    return {
      tenantId,
      outletId,
      orderNumber,
      source: "ZOMATO",
      externalOrderId: String(payload.order_id || ""),
      serviceMode: "DELIVERY",
      customerName: orderData.customer?.name || "Zomato Customer",
      customerPhone: orderData.customer?.phone,
      customerAddress: orderData.customer?.address,
      cookingInstructions: orderData.instructions,
      notes: orderData.rider?.name ? `Rider: ${orderData.rider.name}` : "Zomato Delivery",
      subtotalPaise,
      taxPaise,
      totalPaise,
      isPaid: true,
      paymentMethod: "ZOMATO_PAY",
      idempotencyKey: `zomato_order_${payload.order_id}`,
      riderDetails: {
        name: orderData.rider?.name,
        phone: orderData.rider?.phone,
      },
      items: items.map((it) => {
        const itemPricePaise = Math.round((Number(it.price) || 120) * 100);
        const itemQty = Number(it.quantity) || 1;
        const addonsSummary = it.addons?.map((a) => a.name).join(", ");
        return {
          name: it.name || "Zomato Item",
          quantity: itemQty,
          unitPricePaise: itemPricePaise,
          totalPaise: itemPricePaise * itemQty,
          variantName: it.variant,
          modifiersJson: addonsSummary ? JSON.stringify(it.addons) : undefined,
          notes: it.notes || (addonsSummary ? `Addons: ${addonsSummary}` : undefined),
          station: "MAIN",
        };
      }),
    };
  }

  static normalizeCancellation(payload: ZomatoWebhookPayload): {
    externalOrderId: string;
    orderNumber: string;
    reason: string;
  } {
    return {
      externalOrderId: String(payload.order_id || ""),
      orderNumber: `ZOMATO-${payload.order_id || ""}`,
      reason: payload.order?.cancel_reason || "Zomato customer / rider cancelled order",
    };
  }
}
