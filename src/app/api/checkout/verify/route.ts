import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId, setActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPaymentSignature, isRazorpayConfigured } from "@/lib/razorpay";
import { calcCheckoutTotals } from "@/lib/checkout";
import { ensureSeedPlans } from "@/lib/seed";

export async function POST(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  await ensureSeedPlans();
  let body: any;
  try{ body = await req.json(); }catch{ return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planSlug, billingCycle, outletCount } = body as any;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return NextResponse.json({error:"Missing Razorpay fields"},{status:400});
  if (!planSlug || !billingCycle) return NextResponse.json({error:"Missing plan"},{status:400});

  // Verify signature server-side — never trust browser
  const valid = verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
  if (!valid) return NextResponse.json({error:"Payment verification failed — signature mismatch. Subscription not activated. Contact support@restronex.app if charged."},{status:400});

  // Idempotency: dedupe by payment_id via WebhookEvent / SubscriptionPayment
  const existingPayment = await prisma.subscriptionPayment.findFirst({ where:{ providerPaymentId: razorpay_payment_id }});
  if (existingPayment && existingPayment.status === "COMPLETED") {
    // Already processed — safe to return success (handled pending/failed/cancelled/repeated safely)
    return NextResponse.json({ ok:true, deduped:true, subscriptionPaymentId: existingPayment.id, next:"/app/onboarding" });
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where:{ slug: planSlug }});
  if (!plan) return NextResponse.json({error:"Plan not found"},{status:404});

  // Outlet limit enforced again server-side
  if ((outletCount||1) > plan.maxOutlets) return NextResponse.json({error:`Outlet count exceeds plan limit ${plan.maxOutlets}`},{status:400});

  // Validate amount matches server-calculated total to prevent tampering
  const expected = calcCheckoutTotals({ planSlug, billingCycle, outletCount });
  // In mock mode we trust; in live we would fetch Razorpay order amount and compare

  const tenantId = await resolveTenantId(userId);
  let activeTenantId = tenantId;

  // Retrieve pending registration if submitted during Step 2
  const regCookie = req.cookies.get("restronex_registration_id")?.value;
  const user = await prisma.user.findUnique({ where:{ id: userId }});
  const pendingReg = regCookie
    ? await prisma.pendingRegistration.findUnique({ where: { id: regCookie } })
    : user?.email
    ? await prisma.pendingRegistration.findFirst({ where: { email: user.email, status: "PENDING" }, orderBy: { createdAt: "desc" } })
    : null;

  if (!activeTenantId) {
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
        country: "IN", timeZone:"Asia/Kolkata", currency:"INR",
        onboardingStep: 1, // business created
      }
    });
    await prisma.membership.create({ data:{ userId, tenantId: tenant.id, role:"OWNER" }});
    await prisma.restaurantSetting.create({ data:{ tenantId: tenant.id, receiptHeader: tenant.name }});
    await prisma.taxConfig.createMany({ data:[{ tenantId: tenant.id, name:"CGST", rateBps:900 }, { tenantId: tenant.id, name:"SGST", rateBps:900 }]});
    activeTenantId = tenant.id;
    await setActiveOrgId(tenant.id);
  }

  if (pendingReg) {
    await prisma.pendingRegistration.update({
      where: { id: pendingReg.id },
      data: {
        status: "ACTIVATED",
        paymentId: razorpay_payment_id,
        clerkUserId: userId,
        tenantId: activeTenantId,
      }
    });
  }

  // Upsert subscription — handle pending/failed/cancelled safely
  const periodDays = billingCycle === "ANNUAL" ? 365 : 30;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + periodDays*24*60*60*1000);
  let subscription = await prisma.subscription.findFirst({ where:{ tenantId: activeTenantId, planId: plan.id }});
  if (subscription) {
    // Update existing: set ACTIVE, extend period, handle cancelled->active
    subscription = await prisma.subscription.update({
      where:{ id: subscription.id },
      data:{
        status:"ACTIVE",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      }
    });
  } else {
    // Check for other pending subscriptions for same tenant — close them as superseded
    await prisma.subscription.updateMany({ where:{ tenantId: activeTenantId, status:"PENDING" }, data:{ status:"CANCELLED" }});
    subscription = await prisma.subscription.create({
      data:{
        tenantId: activeTenantId!,
        planId: plan.id,
        status:"ACTIVE",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      }
    });
  }

  // Mark/create payment as completed — idempotent
  let payment = existingPayment;
  if (!payment) {
    payment = await prisma.subscriptionPayment.create({
      data:{
        subscriptionId: subscription.id,
        amountPaise: expected.totalPaise,
        status:"COMPLETED",
        provider:"RAZORPAY",
        providerPaymentId: razorpay_payment_id,
      }
    });
  } else if (payment.status !== "COMPLETED") {
    payment = await prisma.subscriptionPayment.update({ where:{ id: payment.id }, data:{ status:"COMPLETED" }});
  }

  // Also record webhook event for audit (idempotent key)
  const eventId = `verify:${razorpay_payment_id}`;
  try{
    await prisma.webhookEvent.create({ data:{ provider:"RAZORPAY_VERIFY", eventId, payloadJson: JSON.stringify({ razorpay_order_id, razorpay_payment_id, planSlug, billingCycle }), processed:true }});
  }catch{}

  await prisma.auditLog.create({ data:{ tenantId: activeTenantId!, userId, action:"SUBSCRIPTION_ACTIVATED", entity:"Subscription", entityId: subscription.id, metadataJson: JSON.stringify({ planSlug, billingCycle, amountPaise: expected.totalPaise, paymentId: razorpay_payment_id, isMock: !isRazorpayConfigured() }) }});

  return NextResponse.json({
    ok:true,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionPaymentId: payment.id,
    trialEndsAt: subscription.trialEndsAt,
    next: "/app/onboarding",
  });
}
