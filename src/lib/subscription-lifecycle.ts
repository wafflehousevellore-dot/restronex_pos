/**
 * RestroNex Subscription Lifecycle & State Machine Engine
 * Handles subscription status transitions, renewal periods, grace periods,
 * renewal reminders (7d, 3d, 1d, 0d), and access restrictions.
 */

import { prisma } from "./db";
import { GRACE_PERIOD_DAYS, REMINDER_CHECKPOINTS_DAYS } from "./subscription-plans-config";

export type SubscriptionLifecycleStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export interface LifecycleEvaluationResult {
  rawStatus: string;
  effectiveStatus: SubscriptionLifecycleStatus;
  isActive: boolean;
  isInGracePeriod: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  isSuspended: boolean;
  canOperatePOS: boolean;
  canCreateOutlets: boolean;
  daysRemaining: number;
  graceDaysRemaining: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gracePeriodEndsAt: Date;
}

/**
 * Evaluates the real-time lifecycle status of a subscription record.
 * Never grants access if outside grace period.
 */
export function evaluateSubscriptionLifecycle(subscription: {
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gracePeriodEndsAt?: Date | null;
  cancelledAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
}): LifecycleEvaluationResult {
  const now = new Date();
  const periodStart = new Date(subscription.currentPeriodStart);
  const periodEnd = new Date(subscription.currentPeriodEnd);

  const gracePeriodEndsAt =
    subscription.gracePeriodEndsAt ||
    new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const msRemaining = periodEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  const graceMsRemaining = gracePeriodEndsAt.getTime() - now.getTime();
  const graceDaysRemaining = Math.max(0, Math.ceil(graceMsRemaining / (1000 * 60 * 60 * 24)));

  const isPastPeriod = now > periodEnd;
  const isInGrace = isPastPeriod && now <= gracePeriodEndsAt;
  const isPastGrace = now > gracePeriodEndsAt;

  let effectiveStatus: SubscriptionLifecycleStatus = (subscription.status as SubscriptionLifecycleStatus) || "PENDING";

  if (subscription.status === "SUSPENDED") {
    effectiveStatus = "SUSPENDED";
  } else if (subscription.status === "CANCELLED") {
    if (isPastGrace) {
      effectiveStatus = "EXPIRED";
    } else {
      effectiveStatus = "CANCELLED";
    }
  } else if (isPastGrace) {
    effectiveStatus = "EXPIRED";
  } else if (isInGrace) {
    effectiveStatus = "GRACE_PERIOD";
  } else if (subscription.status === "ACTIVE" && !isPastPeriod) {
    effectiveStatus = "ACTIVE";
  } else if (subscription.status === "PAST_DUE" && isInGrace) {
    effectiveStatus = "GRACE_PERIOD";
  }

  const isActive = effectiveStatus === "ACTIVE";
  const isInGracePeriod = effectiveStatus === "GRACE_PERIOD";
  const isExpired = effectiveStatus === "EXPIRED";
  const isCancelled = effectiveStatus === "CANCELLED";
  const isSuspended = effectiveStatus === "SUSPENDED";

  // Operational access is permitted only when ACTIVE or in GRACE_PERIOD (or CANCELLED before grace ends)
  const canOperatePOS = isActive || isInGracePeriod || (isCancelled && !isPastGrace);
  const canCreateOutlets = isActive; // New outlets require an ACTIVE unexpired contract

  return {
    rawStatus: subscription.status,
    effectiveStatus,
    isActive,
    isInGracePeriod,
    isExpired,
    isCancelled,
    isSuspended,
    canOperatePOS,
    canCreateOutlets,
    daysRemaining,
    graceDaysRemaining,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    gracePeriodEndsAt,
  };
}

/**
 * Evaluates pending renewal reminders for all active subscriptions.
 * Prevents duplicate alerts via unique database constraint in SubscriptionNotification.
 */
export async function runDurableSubscriptionReminderCheck(): Promise<{
  processedCount: number;
  remindersSent: Array<{
    subscriptionId: string;
    tenantId: string;
    daysBefore: number;
    title: string;
  }>;
  statusTransitions: Array<{
    subscriptionId: string;
    previousStatus: string;
    newStatus: string;
  }>;
}> {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE", "GRACE_PERIOD"] },
    },
    include: {
      tenant: true,
      plan: true,
    },
  });

  const remindersSent: Array<{
    subscriptionId: string;
    tenantId: string;
    daysBefore: number;
    title: string;
  }> = [];

  const statusTransitions: Array<{
    subscriptionId: string;
    previousStatus: string;
    newStatus: string;
  }> = [];

  for (const sub of subscriptions) {
    const lifecycle = evaluateSubscriptionLifecycle({
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      gracePeriodEndsAt: sub.gracePeriodEndsAt,
      cancelledAt: sub.cancelledAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });

    // Check if status in DB needs transition
    if (lifecycle.effectiveStatus === "EXPIRED" && sub.status !== "EXPIRED") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
      statusTransitions.push({
        subscriptionId: sub.id,
        previousStatus: sub.status,
        newStatus: "EXPIRED",
      });
      continue;
    } else if (lifecycle.effectiveStatus === "GRACE_PERIOD" && sub.status === "ACTIVE") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE" },
      });
      statusTransitions.push({
        subscriptionId: sub.id,
        previousStatus: sub.status,
        newStatus: "PAST_DUE",
      });
    }

    // Determine applicable reminder checkpoint (7, 3, 1, 0 days)
    for (const checkpoint of REMINDER_CHECKPOINTS_DAYS) {
      if (lifecycle.daysRemaining <= checkpoint && lifecycle.daysRemaining > checkpoint - 1) {
        // Attempt to create durable in-app notification
        const title =
          checkpoint === 0
            ? "Your RestroNex Subscription Renews Today"
            : `Your Subscription Renews in ${checkpoint} Day${checkpoint > 1 ? "s" : ""}`;

        const message =
          checkpoint === 0
            ? `Your ${sub.plan?.name || "RestroNex"} plan renewal is due today. Renew now to avoid entering grace period.`
            : `Your ${sub.plan?.name || "RestroNex"} plan will renew in ${checkpoint} days. Review your plan and billing details in Subscription Settings.`;

        try {
          await prisma.subscriptionNotification.create({
            data: {
              subscriptionId: sub.id,
              tenantId: sub.tenantId,
              daysBefore: checkpoint,
              channel: "IN_APP",
              title,
              message,
              status: "SENT",
              sentAt: now,
              metadataJson: JSON.stringify({
                planSlug: sub.plan?.slug,
                currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
                evaluatedDaysRemaining: lifecycle.daysRemaining,
              }),
            },
          });
          remindersSent.push({
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            daysBefore: checkpoint,
            title,
          });
        } catch {
          // Unique constraint violation means reminder was already dispatched for this checkpoint.
        }
        break; // Only one checkpoint per evaluation
      }
    }
  }

  return {
    processedCount: subscriptions.length,
    remindersSent,
    statusTransitions,
  };
}
