import { z } from "zod";

export const demoRequestSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  restaurantName: z.string().min(2).max(100),
  city: z.string().min(2).max(60),
  message: z.string().max(1000).optional(),
});

export const signUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  businessType: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  country: z.string().default("IN"),
  timeZone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),
});

export const createOutletSchema = z.object({
  name: z.string().min(2).max(80),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(60),
  phone: z.string().min(8).max(20),
  serviceModes: z.array(z.string()).default(["DINE_IN","TAKEAWAY"]),
});

export const orderCreateSchema = z.object({
  outletId: z.string(),
  type: z.enum(["DINE_IN","TAKEAWAY","DELIVERY","QR"]),
  serviceMode: z.enum(["DINE_IN","TAKEAWAY","DELIVERY"]).optional(),
  tableId: z.string().nullable().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  whatsappConsent: z.boolean().optional().default(false),
  notes: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string(),
    name: z.string(),
    quantity: z.number().int().min(1),
    unitPricePaise: z.number().int().min(0),
    modifiers: z.array(z.object({ name: z.string(), pricePaise: z.number() })).optional(),
    variantName: z.string().optional(),
    notes: z.string().optional(),
  })).min(1),
  discountPaise: z.number().int().min(0).default(0),
  discountReason: z.string().optional(),
  loyaltyPointsRedeemed: z.number().int().min(0).optional().default(0),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "SPLIT", "RAZORPAY_ONLINE"]).optional().default("CASH"),
  splitPayments: z.array(z.object({ method: z.string(), amountPaise: z.number().int(), reference: z.string().optional() })).optional(),
});

export const menuItemSchema = z.object({
  name: z.string().min(2).max(100),
  categoryId: z.string(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  pricePaise: z.number().int().min(0),
  isVeg: z.boolean().default(true),
  isSoldOut: z.boolean().default(false),
  sku: z.string().optional().nullable(),
});
