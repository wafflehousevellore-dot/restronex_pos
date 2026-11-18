import { NormalizedOrderPayload, AggregatorOrderStatus } from "../../core/integration-types";
import { SwiggyOrderPayload } from "./schemas";

export function mapSwiggyToNormalizedOrder(payload: SwiggyOrderPayload, rawJson: string): NormalizedOrderPayload {
  // Convert prices to Paise (Swiggy API values are in Rupees)
  const toPaise = (rupees: number) => Math.round(rupees * 100);

  let mappedStatus: AggregatorOrderStatus = "PLACED";
  const rawStatus = (payload.status || "").toUpperCase();
  if (rawStatus.includes("CANCEL")) mappedStatus = "CANCELLED";
  else if (rawStatus.includes("ACCEPT")) mappedStatus = "ACCEPTED";
  else if (rawStatus.includes("PREPAR") || rawStatus.includes("FOOD_READY")) mappedStatus = "PREPARING";
  else if (rawStatus.includes("DISPATCH") || rawStatus.includes("OUT_FOR_DELIVERY")) mappedStatus = "DISPATCHED";
  else if (rawStatus.includes("DELIVER")) mappedStatus = "DELIVERED";

  const displayId = payload.order_id.length > 5 ? `#${payload.order_id.slice(-4)}` : `#${payload.order_id}`;

  return {
    provider: "SWIGGY",
    providerOrderId: payload.order_id,
    displayOrderId: displayId,
    providerStoreId: payload.restaurant_id,
    customerName: payload.customer?.name || "Swiggy Customer",
    customerMaskedPhone: payload.customer?.mobile || "******0000",
    deliveryAddressMasked: payload.customer?.address || "Address Masked (Swiggy Policy)",
    orderStatus: mappedStatus,
    prepTimeMinutes: payload.prep_time || 15,
    rawPayloadJson: rawJson,
    riderName: payload.rider?.name,
    riderPhone: payload.rider?.phone_number,
    riderStatus: payload.rider?.status,
    grossAmountPaise: toPaise(payload.total_amount),
    discountPaise: toPaise(payload.discount || 0),
    deliveryFeePaise: toPaise(payload.delivery_charges || 0),
    taxesPaise: toPaise(payload.tax || 0),
    commissionPaise: Math.round(toPaise(payload.total_amount) * 0.18), // Estimated Swiggy 18% base
    netPayoutPaise: toPaise(payload.total_amount) - Math.round(toPaise(payload.total_amount) * 0.18),
    items: payload.order_items.map((item) => ({
      providerItemId: item.item_id,
      name: item.item_name,
      quantity: item.quantity,
      unitPricePaise: toPaise(item.price),
      variantName: item.variant_name,
      notes: item.instructions,
      addons: item.sub_items?.map((sub) => ({
        id: sub.id,
        name: sub.name,
        pricePaise: toPaise(sub.price),
        groupName: sub.group_name,
      })),
    })),
  };
}
