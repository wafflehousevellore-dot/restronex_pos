import { z } from "zod";

export const ZomatoItemAddonSchema = z.object({
  id: z.string().or(z.number()).transform(v => String(v)),
  name: z.string(),
  price: z.number().default(0),
  group_name: z.string().optional(),
});

export const ZomatoOrderItemSchema = z.object({
  item_id: z.string().or(z.number()).transform(v => String(v)),
  name: z.string(),
  quantity: z.number().int().positive().default(1),
  unit_price: z.number(),
  variant_name: z.string().optional(),
  item_instructions: z.string().optional(),
  sub_items: z.array(ZomatoItemAddonSchema).optional(),
});

export const ZomatoOrderPayloadSchema = z.object({
  order_id: z.string().or(z.number()).transform(v => String(v)),
  res_id: z.string().or(z.number()).transform(v => String(v)),
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  items: z.array(ZomatoOrderItemSchema),
  prep_time: z.number().default(15),
  subtotal: z.number().default(0),
  discount: z.number().default(0),
  delivery_charges: z.number().default(0),
  taxes: z.number().default(0),
  total: z.number(),
  delivery_boy: z.object({
    name: z.string().optional(),
    phone_number: z.string().optional(),
    status: z.string().optional(),
  }).optional(),
  status: z.string().optional(),
  rejection_reason: z.string().optional(),
});

export type ZomatoOrderPayload = z.infer<typeof ZomatoOrderPayloadSchema>;
