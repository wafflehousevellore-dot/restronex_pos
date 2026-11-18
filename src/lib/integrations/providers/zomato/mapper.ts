import { NormalizedOrderPayload, AggregatorOrderStatus } from "../../core/integration-types";
import { ZomatoOrderPayload } from "./schemas";

export function mapZomatoToNormalizedOrder(payload: ZomatoOrderPayload, rawJson: string): NormalizedOrderPayload {
  const toPaise = (rupees: number) => Math.round(rupees * 100);

  let mappedStatus: AggregatorOrderStatus = "PLACED";
  const rawStatus = (payload.status || "").toUpperCase();
  if (rawStatus.includes("REJECT") || rawStatus.includes("CANCEL")) mappedStatus = "CANCELLED";
  else if (rawStatus.includes("ACCEPT")) mappedStatus = "ACCEPTED";
  else if (rawStatus.includes("PREPAR") || rawStatus.includes("READY")) mappedStatus = "PREPARING";
  else if (rawStatus.includes("DISPATCH") || rawStatus.includes("PICKED_UP")) mappedStatus = "DISPATCHED";
  else if (rawStatus.includes("DELIVER")) mappedStatus = "DELIVERED";

  const displayId = payload.order_id.length > 5 ? `#${payload.order_id.slice(-4)}` : `#${payload.order_id}`;

  return {
    provider: "ZOMATO",
    providerOrderId: payload.order_id,
    displayOrderId: displayId,
    providerStoreId: payload.res_id,
    customerName: payload.customer?.name || "Zomato Customer",
    customerMaskedPhone: payload.customer?.phone || "******0000",
    deliveryAddressMasked: payload.customer?.address || "Address Masked (Zomato Policy)",
    orderStatus: mappedStatus,
    prepTimeMinutes: payload.prep_time || 15,
    rawPayloadJson: rawJson,
    riderName: payload.delivery_boy?.name,
    riderPhone: payload.delivery_boy?.phone_number,
    riderStatus: payload.delivery_boy?.status,
    grossAmountPaise: toPaise(payload.total),
    discountPaise: toPaise(payload.discount || 0),
    deliveryFeePaise: toPaise(payload.delivery_charges || 0),
    taxesPaise: toPaise(payload.taxes || 0),
    commissionPaise: Math.round(toPaise(payload.total) * 0.18), // Estimated Zomato base commission
    netPayoutPaise: toPaise(payload.total) - Math.round(toPaise(payload.total) * 0.18),
    items: payload.items.map((item) => ({
      providerItemId: item.item_id,
      name: item.name,
      quantity: item.quantity,
      unitPricePaise: toPaise(item.unit_price),
      variantName: item.variant_name,
      notes: item.item_instructions,
      addons: item.sub_items?.map((sub) => ({
        id: sub.id,
        name: sub.name,
        pricePaise: toPaise(sub.price),
        groupName: sub.group_name,
      })),
    })),
  };
}
