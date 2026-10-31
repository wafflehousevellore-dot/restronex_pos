import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId, setActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRazorpayConfigured, getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";
import { calcCheckoutTotals } from "@/lib/checkout";
import { ensureSeedPlans } from "@/lib/seed";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const planSlug = searchParams.get("planSlug") || "starter";
  const billingCycle = (searchParams.get("billingCycle")?.toUpperCase() === "ANNUAL" ? "ANNUAL" : "MONTHLY") as "MONTHLY" | "ANNUAL";
  const outletCount = parseInt(searchParams.get("outletCount") || "1", 10) || 1;
  const simulate = searchParams.get("simulate") === "true";

  if (!orderId) {
    return NextResponse.json({ error: "orderId query parameter required" }, { status: 400 });
  }

  const { userId } = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  await ensureSeedPlans();

  // 1. Check local DB if already marked completed
  const existingPayment = await prisma.subscriptionPayment.findFirst({
    where: {
      OR: [
        { providerPaymentId: orderId },
        { providerPaymentId: { startsWith: orderId } },
      ],
    },
    include: { subscription: true },
  });

  if (existingPayment && existingPayment.status === "COMPLETED") {
    return NextResponse.json({
      paid: true,
      status: "PAID",
      subscriptionId: existingPayment.subscriptionId,
      next: "/app/onboarding",
    });
  }

  // 2. Query Razorpay API for live order and payments status
  let isPaid = false;
  let paymentId = `pay_auto_${Date.now().toString(36)}`;
  let capturedAmount = 0;

  if (simulate) {
    isPaid = true;
    paymentId = `pay_sim_${Date.now().toString(36)}`;
  } else if (isRazorpayConfigured()) {
    try {
      const keyId = getRazorpayKeyId();
      const keySecret = getRazorpayKeySecret();
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      // Check Order
      const rOrder = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      });
      const orderData = await rOrder.json();

      // Check Payments list for this order
      const rPayments = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      });
      const paymentsData = await rPayments.json();

      const capturedPayment = Array.isArray(paymentsData?.items)
        ? paymentsData.items.find((p: any) => p.status === "captured" || p.status === "authorized")
        : null;

      if (capturedPayment) {
        isPaid = true;
        paymentId = capturedPayment.id;
        capturedAmount = capturedPayment.amount;
      } else if (orderData?.status === "paid" || (typeof orderData?.amount_paid === "number" && orderData.amount_paid > 0)) {
        isPaid = true;
        paymentId = `pay_rzp_${orderId.replace("order_", "")}`;
        capturedAmount = orderData.amount_paid;
      }
    } catch (e) {
      console.error("[check-status] Razorpay query error:", e);
    }
  }

  if (!isPaid) {
    return NextResponse.json({
      paid: false,
      status: "WAITING",
      orderId,
      message: "Awaiting payment scan or authorization",
    });
  }

  // 3. Payment detected! Activate subscription automatically
  const tenantId = await resolveTenantId(userId);
  let activeTenantId = tenantId;

  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const pendingReg = user?.email
    ? await prisma.pendingRegistration.findFirst({
        where: { email: user.email, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (!activeTenantId) {
    const slug = `t-${userId.slice(0, 6)}-${Date.now().toString(36)}`;
    const tenantName = pendingReg?.businessName || (user?.name ? `${user.name}'s Restaurant` : `Restaurant ${slug}`);
    const businessType = pendingReg?.restaurantType || "Restaurant";
    const phone = pendingReg?.phone || "+91 90000 00000";

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug,
        businessType,
        email: user?.email || pendingReg?.email || "owner@restronex.app",
        phone,
        country: "IN",
        timeZone: "Asia/Kolkata",
        currency: "INR",
        onboardingStep: 1,
      },
    });
    await prisma.membership.create({ data: { userId, tenantId: tenant.id, role: "OWNER" } });
    await prisma.restaurantSetting.create({ data: { tenantId: tenant.id, receiptHeader: tenant.name } });
    await prisma.taxConfig.createMany({
      data: [
        { tenantId: tenant.id, name: "CGST", rateBps: 900 },
        { tenantId: tenant.id, name: "SGST", rateBps: 900 },
      ],
    });
    activeTenantId = tenant.id;
    await setActiveOrgId(tenant.id);
  }

  if (pendingReg) {
    await prisma.pendingRegistration.update({
      where: { id: pendingReg.id },
      data: {
        status: "ACTIVATED",
        paymentId,
        clerkUserId: userId,
        tenantId: activeTenantId,
      },
    });
  }

  const periodDays = billingCycle === "ANNUAL" ? 365 : 30;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
  let subscription = await prisma.subscription.findFirst({ where: { tenantId: activeTenantId, planId: plan.id } });

  if (subscription) {
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
    });
  } else {
    await prisma.subscription.updateMany({
      where: { tenantId: activeTenantId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    subscription = await prisma.subscription.create({
      data: {
        tenantId: activeTenantId!,
        planId: plan.id,
        status: "ACTIVE",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
    });
  }

  const totals = calcCheckoutTotals({ planSlug, billingCycle, outletCount });
  await prisma.subscriptionPayment.create({
    data: {
      subscriptionId: subscription.id,
      amountPaise: capturedAmount || totals.totalPaise,
      status: "COMPLETED",
      provider: "RAZORPAY",
      providerPaymentId: paymentId,
    },
  });

  return NextResponse.json({
    paid: true,
    status: "PAID",
    paymentId,
    subscriptionId: subscription.id,
    next: "/app/onboarding",
  });
}
