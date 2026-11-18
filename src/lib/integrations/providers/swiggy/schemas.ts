import { z } from "zod";

export const SwiggyItemAddonSchema = z.object({
  id: z.string().or(z.number()).transform(v => String(v)),
  name: z.string(),
  price: z.number().default(0), // in Rupees or Paise
  group_name: z.string().optional(),
});

export const SwiggyOrderItemSchema = z.object({
  item_id: z.string().or(z.number()).transform(v => String(v)),
  item_name: z.string(),
  quantity: z.number().int().positive().default(1),
  price: z.number(),
  variant_name: z.string().optional(),
  instructions: z.string().optional(),
  sub_items: z.array(SwiggyItemAddonSchema).optional(),
});

export const SwiggyOrderPayloadSchema = z.object({
  order_id: z.string().or(z.number()).transform(v => String(v)),
  restaurant_id: z.string().or(z.number()).transform(v => String(v)),
  customer: z.object({
    name: z.string().optional(),
    mobile: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  order_items: z.array(SwiggyOrderItemSchema),
  prep_time: z.number().default(15),
  bill_sub_total: z.number().default(0),
  discount: z.number().default(0),
  delivery_charges: z.number().default(0),
  tax: z.number().default(0),
  total_amount: z.number(),
  rider: z.object({
    name: z.string().optional(),
    phone_number: z.string().optional(),
    status: z.string().optional(),
  }).optional(),
  status: z.string().optional(),
  cancel_reason: z.string().optional(),
});

export type SwiggyOrderPayload = z.infer<typeof SwiggyOrderPayloadSchema>;
