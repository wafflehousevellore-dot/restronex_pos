import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId, setActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureSeedPlans } from "@/lib/seed";

export async function POST(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  await ensureSeedPlans();
  let body: any; try{ body=await req.json(); }catch{ return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  const { planSlug, billingCycle } = body as { planSlug:string; billingCycle: "MONTHLY"|"ANNUAL" };
  if (!planSlug) return NextResponse.json({error:"plan required"},{status:400});
  const plan = await prisma.subscriptionPlan.findUnique({ where:{ slug: planSlug }});
  if (!plan) return NextResponse.json({error:"Plan not found"},{status:404});
  if (plan.slug === "enterprise") return NextResponse.json({error:"Enterprise requires contact sales — no self-serve trial. Book a demo."},{status:400});

  let tenantId = await resolveTenantId(userId);
  if (!tenantId) {
    const regCookie = req.cookies.get("restronex_registration_id")?.value;
    const user = await prisma.user.findUnique({ where:{ id: userId }});
    const pendingReg = regCookie
      ? await prisma.pendingRegistration.findUnique({ where: { id: regCookie } })
      : user?.email
      ? await prisma.pendingRegistration.findFirst({ where: { email: user.email, status: "PENDING" }, orderBy: { createdAt: "desc" } })
      : null;

    const slug = `t-${userId.slice(0,6)}-${Date.now().toString(36)}`;
    const tenantName = pendingReg?.businessName || (user?.name ? `${user.name}'s Restaurant` : `Restaurant ${slug}`);
    const businessType = pendingReg?.restaurantType || "Restaurant";
    const phone = pendingReg?.phone || "+91 90000 00000";

    const tenant = await prisma.tenant.create({
      data:{
        name: tenantName,
        slug,
        businessType,
        email: user?.email || pendingReg?.email || "owner@restronex.app",
        phone,
        country:"IN",
        timeZone:"Asia/Kolkata",
        currency:"INR",
        onboardingStep: 1,
      }
    });
    await prisma.membership.create({ data:{ userId, tenantId: tenant.id, role:"OWNER" }});
    await prisma.restaurantSetting.create({ data:{ tenantId: tenant.id, receiptHeader: tenant.name }});
    await prisma.taxConfig.createMany({ data:[{ tenantId: tenant.id, name:"CGST", rateBps:900 }, { tenantId: tenant.id, name:"SGST", rateBps:900 }]});
    tenantId = tenant.id;
    await setActiveOrgId(tenant.id);

    if (pendingReg) {
      await prisma.pendingRegistration.update({
        where: { id: pendingReg.id },
        data: {
          status: "ACTIVATED",
          clerkUserId: userId,
          tenantId: tenant.id,
        }
      });
    }
  }

  // Check existing trial — only one trial per tenant
  const existing = await prisma.subscription.findFirst({ where:{ tenantId, status:{ in:["TRIALING","ACTIVE"] }}});
  if (existing && existing.trialEndsAt && existing.trialEndsAt > new Date()) {
    return NextResponse.json({ ok:true, subscriptionId: existing.id, trialEndsAt: existing.trialEndsAt, deduped:true });
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14*24*60*60*1000);
  const periodEnd = trialEndsAt;
  const sub = await prisma.subscription.create({
    data:{
      tenantId: tenantId!,
      planId: plan.id,
      status:"TRIALING",
      billingCycle: billingCycle || "MONTHLY",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt,
    }
  });
  await prisma.auditLog.create({ data:{ tenantId: tenantId!, userId, action:"TRIAL_STARTED", entity:"Subscription", entityId: sub.id, metadataJson: JSON.stringify({ planSlug, billingCycle }) }});

  return NextResponse.json({ ok:true, subscriptionId: sub.id, trialEndsAt, status:"TRIALING" });
}
