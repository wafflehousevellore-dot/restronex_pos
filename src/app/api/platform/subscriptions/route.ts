import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logPlatformAdminAction, requirePlatformPermissionApi } from "@/lib/platform-auth";
import { GRACE_PERIOD_DAYS } from "@/lib/subscription";

export async function GET(_req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.subscriptions.view");
  if (!guard.ok) return guard.response;

  const [subscriptions, plans, subscriptionPayments, webhookEvents] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            slug: true,
            outlets: { select: { id: true, name: true, status: true } },
          },
        },
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.subscriptionPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        subscription: {
          include: {
            tenant: { select: { id: true, name: true } },
            plan: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.webhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  let activeCount = 0;
  let trialingCount = 0;
  let pendingCount = 0;
  let pastDueCount = 0;
  let expiredCount = 0;
  let cancelledCount = 0;
  let mrrPaise = 0;

  const planDist: Record<string, number> = {};
  for (const p of plans) {
    planDist[p.slug] = 0;
  }

  const uniqueTenants = new Set<string>();

  for (const s of subscriptions) {
    if (s.tenant) uniqueTenants.add(s.tenant.id);

    if (s.status === "ACTIVE") {
      activeCount++;
      if (s.plan) {
        planDist[s.plan.slug] = (planDist[s.plan.slug] || 0) + 1;
        if (s.billingCycle === "ANNUAL") {
          mrrPaise += Math.round(s.plan.priceAnnualPaise / 12);
        } else {
          mrrPaise += s.plan.priceMonthlyPaise;
        }
      }
    } else if (s.status === "TRIALING") {
      trialingCount++;
    } else if (s.status === "PENDING") {
      pendingCount++;
    } else if (s.status === "PAST_DUE") {
      pastDueCount++;
    } else if (s.status === "EXPIRED") {
      expiredCount++;
    } else if (s.status === "CANCELLED") {
      cancelledCount++;
    }
  }

  const notificationsCount = await prisma.subscriptionNotification.count();

  return NextResponse.json({
    metrics: {
      totalSubscribedRestaurants: uniqueTenants.size,
      activeSubscriptions: activeCount,
      trialingSubscriptions: trialingCount,
      pendingSubscriptions: pendingCount,
      pastDueSubscriptions: pastDueCount,
      expiredSubscriptions: expiredCount,
      cancelledSubscriptions: cancelledCount,
      totalNotificationsSent: notificationsCount,
      mrrPaise,
      arrPaise: mrrPaise * 12,
      planDistribution: planDist,
    },
    subscriptions,
    plans,
    subscriptionPayments,
    webhookEvents,
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.subscriptions.manage");
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { subscriptionId, status, planId, billingCycle, extendDays, reason } = body as {
      subscriptionId?: string;
      status?: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "PENDING";
      planId?: string;
      billingCycle?: "MONTHLY" | "ANNUAL";
      extendDays?: number;
      reason?: string;
    };

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, tenant: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const allowedStatuses = ["ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED", "PENDING"];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid subscription status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "CANCELLED") updateData.cancelledAt = new Date();
      if (status === "ACTIVE") {
        updateData.cancelledAt = null;
        updateData.cancelAtPeriodEnd = false;
      }
    }
    if (planId) {
      const targetPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!targetPlan) return NextResponse.json({ error: "Target plan not found" }, { status: 404 });
      updateData.planId = planId;
    }
    if (billingCycle === "MONTHLY" || billingCycle === "ANNUAL") {
      updateData.billingCycle = billingCycle;
    }
    if (typeof extendDays === "number" && extendDays > 0 && extendDays <= 730) {
      const baseDate = existing.currentPeriodEnd > new Date() ? existing.currentPeriodEnd : new Date();
      const newEnd = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);
      updateData.currentPeriodEnd = newEnd;
      updateData.gracePeriodEndsAt = new Date(newEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: { plan: true, tenant: { select: { id: true, name: true } } },
    });

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      tenantId: existing.tenantId,
      action: "PLATFORM_SUBSCRIPTION_UPDATED",
      entity: "Subscription",
      entityId: subscriptionId,
      metadata: {
        tenantName: existing.tenant?.name,
        previousStatus: existing.status,
        newStatus: updated.status,
        previousPlanId: existing.planId,
        newPlanId: updated.planId,
        extendDays: extendDays || 0,
        reason: reason || "Platform admin manual adjustment",
      },
    });

    return NextResponse.json({ ok: true, subscription: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update subscription" }, { status: 500 });
  }
}
