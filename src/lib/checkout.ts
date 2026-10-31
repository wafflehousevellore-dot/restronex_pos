import { pricingPlans } from "./brand";

export type BillingCycle = "MONTHLY" | "ANNUAL";
export const GST_BPS = 1800; // 18%
export const TRIAL_DAYS = 14;

export function getPlanBySlug(slug: string) {
  return pricingPlans.find(p => p.slug === slug) || null;
}
export function getPlanById(id: string) {
  return pricingPlans.find(p => p.id === id) || null;
}

export function calcCheckoutTotals(opts: {
  planSlug: string;
  billingCycle: BillingCycle;
  outletCount?: number;
  couponDiscountPaise?: number;
  fixedTotalPaise?: number;
}) {
  const plan = getPlanBySlug(opts.planSlug);
  if (!plan) throw new Error(`Unknown plan ${opts.planSlug}`);
  const basePaise = opts.billingCycle === "ANNUAL" ? plan.priceAnnual * 100 : plan.priceMonthly * 100;
  const outlets = Math.max(1, opts.outletCount || 1);
  // Yearly per outlet note in brand is already included in priceAnnual; we do not multiply by outlets for starter demo — but enterprise multi-outlet billing multiplies
  // For simplicity: total = base * outlets (if scale/growth multi-outlet), else base
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
    trialEligible: plan.slug !== "enterprise", // enterprise contact sales no trial
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
