import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTenantSubscriptionEntitlements } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) {
    return NextResponse.json({
      hasActiveSubscription: false,
      tenantId: null,
      message: "No active restaurant organization context selected.",
    });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entitlements = await getTenantSubscriptionEntitlements(tenantId);

  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return NextResponse.json({
    tenantId,
    tenantName: tenant.name,
    onboardingStep: tenant.onboardingStep,
    onboardingComplete: tenant.onboardingComplete,
    entitlements,
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          plan: sub.plan,
          billingCycle: sub.billingCycle,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialEndsAt: sub.trialEndsAt,
          gracePeriodEndsAt: sub.gracePeriodEndsAt,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          cancelledAt: sub.cancelledAt,
          payments: sub.payments,
        }
      : null,
  });
}
