import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const { userId, user } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Only Platform Admins or Owners can view platform-wide SaaS subscription metrics
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser?.isPlatformAdmin && dbUser?.role !== "OWNER") {
    return NextResponse.json({ error: "Platform Admin access required" }, { status: 403 });
  }

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
            outlets: { select: { id: true } },
          },
        },
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
    prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.subscriptionPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
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
      take: 30,
    }),
  ]);

  let activeCount = 0;
  let trialingCount = 0;
  let pendingCount = 0;
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
    } else if (s.status === "CANCELLED" || s.status === "EXPIRED") {
      cancelledCount++;
    }
  }

  return NextResponse.json({
    metrics: {
      totalSubscribedRestaurants: uniqueTenants.size,
      activeSubscriptions: activeCount,
      trialingSubscriptions: trialingCount,
      pendingSubscriptions: pendingCount,
      cancelledSubscriptions: cancelledCount,
      mrrPaise,
      planDistribution: planDist,
    },
    subscriptions,
    plans,
    subscriptionPayments,
    webhookEvents,
  });
}

