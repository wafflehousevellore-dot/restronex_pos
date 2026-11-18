/**
 * RestroNex Platform SaaS Finance & Revenue Intelligence Engine
 * Computes MRR, ARR, Churn, Payment Success Rates, and Plan Distributions
 * strictly from persistent PostgreSQL / Prisma subscription and payment records.
 */

import { prisma } from "./db";
import { calculateSubscriptionMrrPaise, calculateSubscriptionArrPaise } from "./subscription-plans-config";

export interface PlatformFinancialMetrics {
  totalRegisteredBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  trialBusinesses: number; // Stored as 0 since trials were removed
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  gracePeriodSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  totalOutlets: number;
  activeOutlets: number;
  mrrPaise: number;
  arrPaise: number;
  totalSaaSSubscriptionRevenuePaise: number;
  monthlyNewCustomers: number;
  monthlyChurnCount: number;
  monthlyChurnRatePct: number;
  totalPaymentAttempts: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  paymentSuccessRatePct: number;
  paymentFailureRatePct: number;
  totalRefundAmountPaise: number;
  renewalRatePct: number;
  planDistribution: Record<string, { name: string; count: number; mrrPaise: number }>;
}

export async function calculatePlatformFinancialMetrics(): Promise<PlatformFinancialMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalRegisteredBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    subscriptions,
    totalOutlets,
    activeOutlets,
    completedPayments,
    failedPaymentsCount,
    refundsAgg,
    newTenantsCount,
    churnedSubscriptionsCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { status: "SUSPENDED" } }),
    prisma.subscription.findMany({
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.outlet.count(),
    prisma.outlet.count({ where: { status: "ACTIVE" } }),
    prisma.subscriptionPayment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amountPaise: true },
      _count: true,
    }),
    prisma.subscriptionPayment.count({ where: { status: "FAILED" } }),
    prisma.paymentRefund.aggregate({
      where: { status: "PROCESSED" },
      _sum: { amountPaise: true },
    }),
    prisma.tenant.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.subscription.count({
      where: {
        status: { in: ["CANCELLED", "EXPIRED"] },
        updatedAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  let activeSubscriptions = 0;
  let pastDueSubscriptions = 0;
  let gracePeriodSubscriptions = 0;
  let expiredSubscriptions = 0;
  let cancelledSubscriptions = 0;
  let mrrPaise = 0;

  const planDistribution: Record<string, { name: string; count: number; mrrPaise: number }> = {};

  for (const sub of subscriptions) {
    const plan = sub.plan;
    if (!plan) continue;

    if (!planDistribution[plan.slug]) {
      planDistribution[plan.slug] = {
        name: plan.name,
        count: 0,
        mrrPaise: 0,
      };
    }

    if (sub.status === "ACTIVE") {
      activeSubscriptions++;
      planDistribution[plan.slug].count += 1;
      const subMrr = calculateSubscriptionMrrPaise(plan, (sub.billingCycle as "MONTHLY" | "ANNUAL") || "MONTHLY");
      mrrPaise += subMrr;
      planDistribution[plan.slug].mrrPaise += subMrr;
    } else if (sub.status === "PAST_DUE") {
      pastDueSubscriptions++;
    } else if (sub.status === "GRACE_PERIOD") {
      gracePeriodSubscriptions++;
    } else if (sub.status === "EXPIRED") {
      expiredSubscriptions++;
    } else if (sub.status === "CANCELLED") {
      cancelledSubscriptions++;
    }
  }

  const arrPaise = calculateSubscriptionArrPaise(mrrPaise);
  const totalSaaSSubscriptionRevenuePaise = completedPayments._sum.amountPaise || 0;
  const successfulPaymentsCount = completedPayments._count || 0;
  const totalPaymentAttempts = successfulPaymentsCount + failedPaymentsCount;

  const paymentSuccessRatePct =
    totalPaymentAttempts > 0
      ? Number(((successfulPaymentsCount / totalPaymentAttempts) * 100).toFixed(1))
      : 100;

  const paymentFailureRatePct =
    totalPaymentAttempts > 0
      ? Number(((failedPaymentsCount / totalPaymentAttempts) * 100).toFixed(1))
      : 0;

  const denominator = activeSubscriptions + churnedSubscriptionsCount;
  const monthlyChurnRatePct =
    denominator > 0
      ? Number(((churnedSubscriptionsCount / denominator) * 100).toFixed(1))
      : 0;

  const renewalEligibleCount = activeSubscriptions + pastDueSubscriptions;
  const renewalRatePct =
    renewalEligibleCount > 0
      ? Number(((activeSubscriptions / renewalEligibleCount) * 100).toFixed(1))
      : 100;

  return {
    totalRegisteredBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    trialBusinesses: 0,
    activeSubscriptions,
    pastDueSubscriptions,
    gracePeriodSubscriptions,
    expiredSubscriptions,
    cancelledSubscriptions,
    totalOutlets,
    activeOutlets,
    mrrPaise,
    arrPaise,
    totalSaaSSubscriptionRevenuePaise,
    monthlyNewCustomers: newTenantsCount,
    monthlyChurnCount: churnedSubscriptionsCount,
    monthlyChurnRatePct,
    totalPaymentAttempts,
    successfulPaymentsCount,
    failedPaymentsCount,
    paymentSuccessRatePct,
    paymentFailureRatePct,
    totalRefundAmountPaise: refundsAgg._sum.amountPaise || 0,
    renewalRatePct,
    planDistribution,
  };
}
