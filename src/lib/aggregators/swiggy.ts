import crypto from "crypto";
import { NormalizedOrderPayload } from "../order-ingestion";

export interface SwiggyWebhookPayload {
  event_type: "ORDER_PLACED" | "ORDER_DISPATCH" | "ORDER_CANCELLED" | "RIDER_ARRIVED" | "ORDER_STATUS_UPDATE";
  store_id: string;
  order_id: string;
  timestamp?: number;
  data?: {
    customer?: {
      name?: string;
      phone?: string;
      address?: string;
    };
    delivery?: {
      rider_name?: string;
      rider_phone?: string;
      delivery_expected_time?: string;
    };
    billing?: {
      subtotal?: number;
      tax?: number;
      discount?: number;
      delivery_charge?: number;
      packaging_charge?: number;
      total?: number;
    };
    instructions?: string;
    items?: Array<{
      id?: string;
      name: string;
      quantity: number;
      price: number;
      notes?: string;
      addons?: Array<{ name: string; price: number }>;
      variants?: Array<{ name: string }>;
    }>;
    cancellation_reason?: string;
  };
}

export class SwiggyAdapter {
  static verifySignature(rawBody: string, signature: string | null, secret?: string): boolean {
    const swiggySecret = secret || process.env.SWIGGY_WEBHOOK_SECRET;
    if (!swiggySecret) {
      // In development or testing without configured secret, allow through
      return true;
    }
    if (!signature) return false;

    try {
      const computed = crypto.createHmac("sha256", swiggySecret).update(rawBody).digest("hex");
      const sigClean = signature.replace(/^sha256=/, "");
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sigClean));
    } catch {
      return false;
    }
  }

  static normalizeOrder(
    payload: SwiggyWebhookPayload,
    tenantId: string,
    outletId: string
  ): NormalizedOrderPayload {
    const data = payload.data || {};
    const items = Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : [{ name: "Swiggy Order Item", quantity: 1, price: 150 }];

    const subtotalPaise = Math.round((Number(data.billing?.subtotal) || 150) * 100);
    const taxPaise = Math.round((Number(data.billing?.tax) || 15) * 100);
    const discountPaise = Math.round((Number(data.billing?.discount) || 0) * 100);
    const totalPaise = Math.round((Number(data.billing?.total) || subtotalPaise + taxPaise) * 100);

    const orderNumber = `SWIGGY-${payload.order_id || Date.now()}`;

    return {
      tenantId,
      outletId,
      orderNumber,
      source: "SWIGGY",
      externalOrderId: String(payload.order_id || ""),
      serviceMode: "DELIVERY",
      customerName: data.customer?.name || "Swiggy Customer",
      customerPhone: data.customer?.phone,
      customerAddress: data.customer?.address,
      cookingInstructions: data.instructions,
      notes: data.delivery?.rider_name ? `Rider: ${data.delivery.rider_name}` : "Swiggy Delivery",
      subtotalPaise,
      taxPaise,
      discountPaise,
      totalPaise,
      isPaid: true,
      paymentMethod: "SWIGGY_PAY",
      idempotencyKey: `swiggy_order_${payload.order_id}`,
      riderDetails: {
        name: data.delivery?.rider_name,
        phone: data.delivery?.rider_phone,
      },
      items: items.map((it) => {
        const itemPricePaise = Math.round((Number(it.price) || 100) * 100);
        const itemQty = Number(it.quantity) || 1;
        const variantName = it.variants?.[0]?.name;
        const addonsSummary = it.addons?.map((a) => a.name).join(", ");
        return {
          name: it.name || "Swiggy Item",
          quantity: itemQty,
          unitPricePaise: itemPricePaise,
          totalPaise: itemPricePaise * itemQty,
          variantName,
          modifiersJson: addonsSummary ? JSON.stringify(it.addons) : undefined,
          notes: it.notes || (addonsSummary ? `Addons: ${addonsSummary}` : undefined),
          station: "MAIN",
        };
      }),
    };
  }

  static normalizeCancellation(payload: SwiggyWebhookPayload): {
    externalOrderId: string;
    orderNumber: string;
    reason: string;
  } {
    return {
      externalOrderId: String(payload.order_id || ""),
      orderNumber: `SWIGGY-${payload.order_id || ""}`,
      reason: payload.data?.cancellation_reason || "Swiggy customer / rider cancelled order",
    };
  }
}
