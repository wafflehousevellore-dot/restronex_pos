import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const GRACE_PERIOD_DAYS = 7;

export interface SubscriptionEntitlements {
  hasAccess: boolean;
  isGracePeriod: boolean;
  isTrial: boolean;
  daysRemaining: number;
  graceDaysRemaining: number;
  plan: {
    name: string;
    slug: string;
    maxOutlets: number;
    maxUsers: number;
    priceMonthlyPaise: number;
    priceAnnualPaise: number;
    features: string[];
  } | null;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "HALTED" | "CANCELLED" | "EXPIRED" | "PENDING";
  currentPeriodEnd: Date | null;
  billingCycle: "MONTHLY" | "ANNUAL";
  canCreateOrder: boolean;
  canAddOutlet: boolean;
  canAddStaff: boolean;
  currentOutletsCount: number;
  currentStaffCount: number;
}

/**
 * Validates tenant subscription entitlements server-side.
 * Never grants access if expired and outside grace period.
 */
export async function getTenantSubscriptionEntitlements(tenantId: string): Promise<SubscriptionEntitlements> {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  const outletsCount = await prisma.outlet.count({ where: { tenantId } });
  const staffCount = await prisma.membership.count({ where: { tenantId } });

  if (!subscription || !subscription.plan) {
    return {
      hasAccess: false,
      isGracePeriod: false,
      isTrial: false,
      daysRemaining: 0,
      graceDaysRemaining: 0,
      plan: null,
      status: "EXPIRED",
      currentPeriodEnd: null,
      billingCycle: "MONTHLY",
      canCreateOrder: false,
      canAddOutlet: false,
      canAddStaff: false,
      currentOutletsCount: outletsCount,
      currentStaffCount: staffCount,
    };
  }

  const now = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const msRemaining = periodEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  let gracePeriodEnd = subscription.gracePeriodEndsAt;
  if (!gracePeriodEnd) {
    gracePeriodEnd = new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  }
  const graceMsRemaining = gracePeriodEnd.getTime() - now.getTime();
  const graceDaysRemaining = Math.max(0, Math.ceil(graceMsRemaining / (1000 * 60 * 60 * 24)));

  const isPastPeriod = now > periodEnd;
  const isGracePeriod = isPastPeriod && now <= gracePeriodEnd;
  const isTrial = subscription.status === "TRIALING";

  let effectiveStatus = subscription.status as SubscriptionEntitlements["status"];
  if (isPastPeriod) {
    if (isGracePeriod) {
      effectiveStatus = "PAST_DUE";
    } else {
      effectiveStatus = "EXPIRED";
    }
  }

  const hasAccess =
    effectiveStatus === "ACTIVE" ||
    effectiveStatus === "TRIALING" ||
    (effectiveStatus === "PAST_DUE" && isGracePeriod);

  let features: string[] = [];
  try {
    features = JSON.parse(subscription.plan.featuresJson || "[]");
  } catch {
    features = [];
  }

  return {
    hasAccess,
    isGracePeriod,
    isTrial,
    daysRemaining,
    graceDaysRemaining,
    plan: {
      name: subscription.plan.name,
      slug: subscription.plan.slug,
      maxOutlets: subscription.plan.maxOutlets,
      maxUsers: subscription.plan.maxUsers,
      priceMonthlyPaise: subscription.plan.priceMonthlyPaise,
      priceAnnualPaise: subscription.plan.priceAnnualPaise,
      features,
    },
    status: effectiveStatus,
    currentPeriodEnd: periodEnd,
    billingCycle: (subscription.billingCycle as "MONTHLY" | "ANNUAL") || "MONTHLY",
    canCreateOrder: hasAccess,
    canAddOutlet: hasAccess && outletsCount < subscription.plan.maxOutlets,
    canAddStaff: hasAccess && staffCount < subscription.plan.maxUsers,
    currentOutletsCount: outletsCount,
    currentStaffCount: staffCount,
  };
}

/**
 * Calculates plan upgrade or downgrade adjustment.
 */
export function calculatePlanChange({
  currentPlanPriceMonthlyPaise,
  newPlanPriceMonthlyPaise,
  billingCycle,
  daysRemainingInPeriod,
  totalDaysInPeriod,
}: {
  currentPlanPriceMonthlyPaise: number;
  newPlanPriceMonthlyPaise: number;
  billingCycle: "MONTHLY" | "ANNUAL";
  daysRemainingInPeriod: number;
  totalDaysInPeriod: number;
}): {
  isUpgrade: boolean;
  proratedCreditPaise: number;
  newPlanChargePaise: number;
  payablePaise: number;
} {
  const currentTotal =
    billingCycle === "ANNUAL" ? currentPlanPriceMonthlyPaise * 10 : currentPlanPriceMonthlyPaise;
  const newTotal =
    billingCycle === "ANNUAL" ? newPlanPriceMonthlyPaise * 10 : newPlanPriceMonthlyPaise;

  const fractionRemaining = Math.max(0, Math.min(1, daysRemainingInPeriod / Math.max(1, totalDaysInPeriod)));
  const proratedCreditPaise = Math.round(currentTotal * fractionRemaining);
  const newPlanChargePaise = Math.round(newTotal * fractionRemaining);
  const payablePaise = Math.max(0, newPlanChargePaise - proratedCreditPaise);

  return {
    isUpgrade: newTotal > currentTotal,
    proratedCreditPaise,
    newPlanChargePaise,
    payablePaise,
  };
}

