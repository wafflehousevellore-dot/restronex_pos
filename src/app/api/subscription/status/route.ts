import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";

export async function GET(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ hasActiveSubscription:false, tenantId:null });
  const tenant = await prisma.tenant.findUnique({ where:{ id: tenantId }});
  if (!tenant) return NextResponse.json({error:"Tenant not found"},{status:404});
  const mem = await prisma.membership.findFirst({ where:{ tenantId, userId }});
  if (!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const ent = await getEntitlements(tenantId);
  const sub = await prisma.subscription.findFirst({ where:{ tenantId }, orderBy:{ currentPeriodEnd:"desc" }, include:{ plan:true }});
  return NextResponse.json({
    tenantId,
    onboardingStep: tenant.onboardingStep,
    onboardingComplete: tenant.onboardingComplete,
    hasActiveSubscription: ent.hasActiveSubscription,
    subscriptionStatus: ent.subscriptionStatus,
    planSlug: ent.planSlug,
    planName: ent.planName,
    isTrialing: ent.isTrialing,
    trialEndsAt: ent.trialEndsAt,
    maxOutlets: ent.maxOutlets,
    maxUsers: ent.maxUsers,
    entitlements: ent,
    subscription: sub ? { id: sub.id, status: sub.status, plan: sub.plan, billingCycle: sub.billingCycle, currentPeriodEnd: sub.currentPeriodEnd } : null,
  });
}
