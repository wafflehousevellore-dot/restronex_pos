import { prisma } from "./db";

export type Entitlements = {
  hasActiveSubscription: boolean;
  planSlug: string | null;
  planName: string | null;
  maxOutlets: number;
  maxUsers: number;
  features: string[];
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  isTrialing: boolean;
  canUsePOS: boolean;
  canUseInventory: boolean;
  canUseKDS: boolean;
  canUseIntegrations: boolean;
  canUseTables: boolean;
  canUseQROrdering: boolean;
  canUsePrinters: boolean;
  canUseMultiPrinters: boolean;
  canUseWhatsAppInvoices: boolean;
  canUseMultiOutlet: boolean;
};

export async function getEntitlements(tenantId: string): Promise<Entitlements> {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { currentPeriodEnd: "desc" },
    include: { plan: true },
  });
  if (!sub || !sub.plan) {
    return {
      hasActiveSubscription: false,
      planSlug: null,
      planName: null,
      maxOutlets: 0,
      maxUsers: 0,
      features: [],
      subscriptionStatus: null,
      trialEndsAt: null,
      isTrialing: false,
      canUsePOS: false,
      canUseInventory: false,
      canUseKDS: false,
      canUseIntegrations: false,
      canUseTables: false,
      canUseQROrdering: false,
      canUsePrinters: false,
      canUseMultiPrinters: false,
      canUseWhatsAppInvoices: false,
      canUseMultiOutlet: false,
    };
  }
  const now = new Date();
  const isTrialActive = sub.status === "TRIALING" && sub.trialEndsAt && sub.trialEndsAt > now;
  const isActive = sub.status === "ACTIVE" || isTrialActive;
  const hasActive = isActive || sub.status === "TRIALING";

  let features: string[] = [];
  try {
    features = JSON.parse(sub.plan.featuresJson || "[]");
  } catch {
    features = [];
  }
  const planSlug = sub.plan.slug;
  const isGrowthOrBusiness = planSlug === "growth" || planSlug === "business";

  return {
    hasActiveSubscription: hasActive,
    planSlug,
    planName: sub.plan.name,
    maxOutlets: sub.plan.maxOutlets,
    maxUsers: sub.plan.maxUsers,
    features,
    subscriptionStatus: sub.status,
    trialEndsAt: sub.trialEndsAt,
    isTrialing: sub.status === "TRIALING",
    canUsePOS: hasActive,
    canUseInventory: hasActive && isGrowthOrBusiness,
    canUseKDS: hasActive,
    canUseIntegrations: hasActive && isGrowthOrBusiness,
    canUseTables: hasActive,
    canUseQROrdering: hasActive && isGrowthOrBusiness,
    canUsePrinters: hasActive,
    canUseMultiPrinters: hasActive && isGrowthOrBusiness,
    canUseWhatsAppInvoices: hasActive && isGrowthOrBusiness,
    canUseMultiOutlet: hasActive && sub.plan.maxOutlets > 1,
  };
}

export async function requireEntitlement(tenantId: string, feature: keyof Entitlements) {
  const e = await getEntitlements(tenantId);
  if (!e.hasActiveSubscription) throw new Error("SUBSCRIPTION_REQUIRED");
  if (feature && !e[feature]) throw new Error(`FEATURE_GATED:${String(feature)}`);
  return e;
}
