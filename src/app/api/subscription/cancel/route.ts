import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GRACE_PERIOD_DAYS } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem || mem.role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can cancel subscriptions" }, { status: 403 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const periodEnd = new Date(subscription.currentPeriodEnd);
  const graceEnd = new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Soft cancel: sets cancelAtPeriodEnd, retains full restaurant data and access until period + grace ends
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
      gracePeriodEndsAt: graceEnd,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "SUBSCRIPTION_CANCEL_SCHEDULED",
      entity: "Subscription",
      entityId: subscription.id,
      metadataJson: JSON.stringify({
        effectiveEndDate: periodEnd.toISOString(),
        gracePeriodEndDate: graceEnd.toISOString(),
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Subscription cancelled. Your restaurant retains full access until your billing period ends.",
    effectivePeriodEnd: periodEnd.toISOString(),
    gracePeriodEnd: graceEnd.toISOString(),
    subscription: updated,
  });
}

