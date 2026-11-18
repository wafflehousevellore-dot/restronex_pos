/**
 * RestroNex Centralized Subscription Plan & Pricing Engine
 * Single source of truth for public pricing, checkout calculations,
 * entitlement limits, and Platform Admin subscription operations.
 */

export interface PlanFeatureEntitlement {
  id: string;
  name: string;
  description: string;
  category: "core" | "operations" | "kitchen" | "inventory" | "growth" | "enterprise";
}

export interface CentralSubscriptionPlan {
  id: string;
  slug: "starter" | "growth" | "business";
  name: string;
  tagline: string;
  description: string;
  priceMonthlyRupees: number;
  priceMonthlyPaise: number;
  priceAnnualRupees: number;
  priceAnnualPaise: number;
  maxOutlets: number;
  maxUsers: number;
  sortOrder: number;
  highlighted: boolean;
  ctaText: string;
  effectiveFrom: string; // ISO date
  version: string;
  features: string[];
  entitlements: {
    canUsePOS: boolean;
    canUseMenu: boolean;
    canUseReports: boolean;
    canUseKDS: boolean;
    canUseTables: boolean;
    canUseQROrdering: boolean;
    canUseInventory: boolean;
    canUseRecipeCosting: boolean;
    canUseStaffRBAC: boolean;
    canUseMultiOutlet: boolean;
    canUseAuditLogs: boolean;
    canUseCustomerCRM: boolean;
    canUseWhatsAppInvoices: boolean;
    canUseIntegrations: boolean;
  };
}

export const RESTRO_NEX_GST_RATE_BPS = 1800; // 18% GST (9% CGST + 9% SGST)
export const GRACE_PERIOD_DAYS = 7;
export const REMINDER_CHECKPOINTS_DAYS = [7, 3, 1, 0] as const;

export const CENTRAL_SUBSCRIPTION_PLANS: CentralSubscriptionPlan[] = [
  {
    id: "plan_starter_v2",
    slug: "starter",
    name: "Starter",
    tagline: "For single-outlet cafes & quick-service counters",
    description: "Complete Cloud POS and billing essentials for a single restaurant outlet.",
    priceMonthlyRupees: 99,
    priceMonthlyPaise: 9900,
    priceAnnualRupees: 990,
    priceAnnualPaise: 99000,
    maxOutlets: 1,
    maxUsers: 5,
    sortOrder: 1,
    highlighted: false,
    ctaText: "Get Started with Starter",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    version: "2.1",
    features: [
      "1 Active Outlet",
      "Up to 5 Staff accounts",
      "Fast Cloud POS Counter Billing",
      "Digital Menu & Category Management",
      "Table & Dine-In Status",
      "Essential Sales & Daily Reports",
      "GST Compliant Receipt Printing",
      "Email & In-App Support",
    ],
    entitlements: {
      canUsePOS: true,
      canUseMenu: true,
      canUseReports: true,
      canUseKDS: true,
      canUseTables: true,
      canUseQROrdering: false,
      canUseInventory: false,
      canUseRecipeCosting: false,
      canUseStaffRBAC: true,
      canUseMultiOutlet: false,
      canUseAuditLogs: false,
      canUseCustomerCRM: false,
      canUseWhatsAppInvoices: false,
      canUseIntegrations: false,
    },
  },
  {
    id: "plan_growth_v2",
    slug: "growth",
    name: "Growth",
    tagline: "Most popular for growing restaurants & diners",
    description: "Full operational suite with Kitchen Display, QR ordering, and inventory.",
    priceMonthlyRupees: 199,
    priceMonthlyPaise: 19900,
    priceAnnualRupees: 1990,
    priceAnnualPaise: 199000,
    maxOutlets: 5,
    maxUsers: 25,
    sortOrder: 2,
    highlighted: true,
    ctaText: "Choose Growth",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    version: "2.1",
    features: [
      "Up to 5 Active Outlets",
      "Up to 25 Staff accounts",
      "Cloud POS & Cashier Station",
      "Interactive Kitchen Display System (KDS)",
      "Contactless QR Table Ordering",
      "Table Layout & Floor Plan Management",
      "Raw Ingredient Inventory & Low-Stock Alerts",
      "Day-End Closing (Z-Reports) & Reconciliation",
      "Granular Staff Roles & Shift Tracking",
      "Standard Priority Support",
    ],
    entitlements: {
      canUsePOS: true,
      canUseMenu: true,
      canUseReports: true,
      canUseKDS: true,
      canUseTables: true,
      canUseQROrdering: true,
      canUseInventory: true,
      canUseRecipeCosting: false,
      canUseStaffRBAC: true,
      canUseMultiOutlet: true,
      canUseAuditLogs: true,
      canUseCustomerCRM: true,
      canUseWhatsAppInvoices: true,
      canUseIntegrations: false,
    },
  },
  {
    id: "plan_business_v2",
    slug: "business",
    name: "Business",
    tagline: "For restaurant chains, franchises & multi-unit brands",
    description: "Enterprise multi-outlet management, recipe BOM costing, and centralized controls.",
    priceMonthlyRupees: 299,
    priceMonthlyPaise: 29900,
    priceAnnualRupees: 2990,
    priceAnnualPaise: 299000,
    maxOutlets: 50,
    maxUsers: 200,
    sortOrder: 3,
    highlighted: false,
    ctaText: "Scale with Business",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    version: "2.1",
    features: [
      "Up to 50 Active Outlets",
      "Up to 200 Staff accounts",
      "Centralized Head Office Management",
      "Consolidated Multi-Outlet Financials",
      "Advanced Recipe Costing & Bill of Materials (BOM)",
      "Customer CRM, Loyalty Points & Segments",
      "Automated Scheduled Email Digests",
      "Tamper-Resistant Security Audit Trail",
      "Direct Aggregator & Payment Webhooks",
      "Dedicated Enterprise Account Manager",
    ],
    entitlements: {
      canUsePOS: true,
      canUseMenu: true,
      canUseReports: true,
      canUseKDS: true,
      canUseTables: true,
      canUseQROrdering: true,
      canUseInventory: true,
      canUseRecipeCosting: true,
      canUseStaffRBAC: true,
      canUseMultiOutlet: true,
      canUseAuditLogs: true,
      canUseCustomerCRM: true,
      canUseWhatsAppInvoices: true,
      canUseIntegrations: true,
    },
  },
];

export function getCentralPlanBySlug(slug: string): CentralSubscriptionPlan | undefined {
  return CENTRAL_SUBSCRIPTION_PLANS.find((p) => p.slug === slug.toLowerCase());
}

export function getCentralPlanById(id: string): CentralSubscriptionPlan | undefined {
  return CENTRAL_SUBSCRIPTION_PLANS.find((p) => p.id === id);
}

/**
 * Calculates MRR (Monthly Recurring Revenue) in Paise from an active subscription.
 * Annual plans are normalized to 1/12th of annual price.
 */
export function calculateSubscriptionMrrPaise(
  plan: Pick<CentralSubscriptionPlan, "priceMonthlyPaise" | "priceAnnualPaise">,
  billingCycle: "MONTHLY" | "ANNUAL"
): number {
  if (billingCycle === "ANNUAL") {
    return Math.round(plan.priceAnnualPaise / 12);
  }
  return plan.priceMonthlyPaise;
}

/**
 * Calculates run-rate ARR (Annual Recurring Revenue) in Paise.
 * ARR = MRR * 12.
 */
export function calculateSubscriptionArrPaise(mrrPaise: number): number {
  return mrrPaise * 12;
}

/**
 * Calculates tax breakdown (18% GST: 9% CGST + 9% SGST) for a given subtotal in paise.
 */
export function calculateGstBreakdownPaise(subtotalPaise: number): {
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalTaxPaise: number;
  totalWithTaxPaise: number;
} {
  const cgstPaise = Math.round((subtotalPaise * 900) / 10000);
  const sgstPaise = Math.round((subtotalPaise * 900) / 10000);
  const totalTaxPaise = cgstPaise + sgstPaise;
  return {
    subtotalPaise,
    cgstPaise,
    sgstPaise,
    totalTaxPaise,
    totalWithTaxPaise: subtotalPaise + totalTaxPaise,
  };
}

/**
 * Formats a sequential SaaS subscription invoice number: RNX-INV-YYYYMM-XXXX
 */
export function generateSaaSInvoiceNumber(seqNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(seqNumber).padStart(4, "0");
  return `RNX-INV-${year}${month}-${seq}`;
}
