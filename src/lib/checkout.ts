import { pricingPlans } from "./brand";

export type BillingCycle = "MONTHLY" | "ANNUAL";
export const GST_BPS = 1800; // 18%
export const TRIAL_DAYS = 0; // Free trials disabled

export function getPlanBySlug(slug: string) {
  return pricingPlans.find(p => p.slug === slug) || null;
}
export function getPlanById(id: string) {
  return pricingPlans.find(p => p.id === id) || null;
}

export type PlanPricingOverride = {
  name?: string;
  priceMonthlyPaise: number;
  priceAnnualPaise: number;
  maxOutlets?: number;
  maxUsers?: number;
};

export function resolveCouponDiscount(
  code: string | undefined | null,
  subtotalPaise: number
): { discountPaise: number; fixedTotalPaise?: number; label: string } {
  const c = (code || "").trim().toUpperCase();
  if (!c) return { discountPaise: 0, label: "" };

  if (
    c === "PAY1" ||
    c === "RS1" ||
    c === "1RS" ||
    c === "ONE" ||
    c === "RUPEE1" ||
    c === "1RUPEE" ||
    c === "TEST1" ||
    c === "PROMO1"
  ) {
    return { discountPaise: 0, fixedTotalPaise: 100, label: "VIP Special (Pay ₹1 for testing)" };
  }
  if (
    c === "PAY2" ||
    c === "TEST2" ||
    c === "RS2" ||
    c === "100OFF" ||
    c === "TEST100" ||
    c === "TESTPAY" ||
    c === "2RS" ||
    c === "100%" ||
    c === "FREE" ||
    c === "2RUPEES"
  ) {
    return { discountPaise: 0, fixedTotalPaise: 200, label: "100% OFF (Pay ₹2 for testing)" };
  }
  if (c === "WELCOME10" || c === "SAVE10") {
    return { discountPaise: Math.round(subtotalPaise * 0.1), label: "10% OFF" };
  }
  if (c === "FLAT50") {
    return { discountPaise: 5000, label: "₹50 FLAT OFF" };
  }
  if (c === "CHEF20" || c === "FESTIVE20") {
    return { discountPaise: Math.round(subtotalPaise * 0.2), label: "20% OFF" };
  }
  return { discountPaise: 0, label: "" };
}

export function calcCheckoutTotals(opts: {
  planSlug: string;
  billingCycle: BillingCycle;
  outletCount?: number;
  couponDiscountPaise?: number;
  fixedTotalPaise?: number;
  planPricingOverride?: PlanPricingOverride | null;
}) {
  const brandPlan = getPlanBySlug(opts.planSlug);
  if (!brandPlan) throw new Error(`Unknown plan ${opts.planSlug}`);

  const effectiveMonthlyPaise =
    opts.planPricingOverride?.priceMonthlyPaise ?? brandPlan.priceMonthly * 100;
  const effectiveAnnualPaise =
    opts.planPricingOverride?.priceAnnualPaise ?? brandPlan.priceAnnual * 100;
  const effectiveMaxOutlets = opts.planPricingOverride?.maxOutlets ?? brandPlan.maxOutlets;
  const effectiveMaxUsers = opts.planPricingOverride?.maxUsers ?? brandPlan.maxUsers;

  const plan = {
    ...brandPlan,
    name: opts.planPricingOverride?.name ?? brandPlan.name,
    priceMonthly: Math.round(effectiveMonthlyPaise / 100),
    priceAnnual: Math.round(effectiveAnnualPaise / 100),
    maxOutlets: effectiveMaxOutlets,
    maxUsers: effectiveMaxUsers,
  };

  const basePaise = opts.billingCycle === "ANNUAL" ? effectiveAnnualPaise : effectiveMonthlyPaise;
  const outlets = Math.max(1, opts.outletCount || 1);
  // Multi-outlet plans scale with outlets when >1 selected; single-outlet plans remain flat.
  const outletMultiplier = plan.maxOutlets > 1 ? outlets : 1;
  const subtotal = basePaise * outletMultiplier;

  let total: number;
  let taxable: number;
  let gst: number;
  let discount: number;

  if (typeof opts.fixedTotalPaise === "number" && opts.fixedTotalPaise > 0) {
    total = opts.fixedTotalPaise;
    taxable = Math.round(total / (1 + GST_BPS / 10000));
    gst = total - taxable;
    discount = Math.max(0, subtotal - taxable);
  } else {
    discount = Math.min(opts.couponDiscountPaise || 0, subtotal);
    taxable = subtotal - discount;
    gst = Math.round((taxable * GST_BPS) / 10000);
    total = taxable + gst;
  }

  return {
    plan,
    billingCycle: opts.billingCycle,
    basePaise: basePaise,
    outletCount: outlets,
    subtotal,
    discountPaise: discount,
    taxable,
    gstPaise: gst,
    gstBps: GST_BPS,
    totalPaise: total,
    trialEligible: false, // Free trials disabled - direct payment required
  };
}

export const CHECKOUT_COOKIE = "restronex_checkout";
export function serializeCheckoutState(state: { planSlug: string; billingCycle: BillingCycle; outletCount?: number }) {
  return JSON.stringify(state);
}
export function parseCheckoutState(raw?: string | null) {
  if (!raw) return null;
  try { return JSON.parse(raw) as { planSlug: string; billingCycle: BillingCycle; outletCount?: number }; } catch { return null; }
}

export const PLAN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
