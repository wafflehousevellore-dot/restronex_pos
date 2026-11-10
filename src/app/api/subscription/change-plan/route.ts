import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculatePlanChange } from "@/lib/subscription";
import { createMockOrder, getRazorpayKeyId, isRazorpayConfigured } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { newPlanSlug, billingCycle = "MONTHLY" } = body;
  if (!newPlanSlug) return NextResponse.json({ error: "Target planSlug is required" }, { status: 400 });

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem || mem.role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can change subscription plans" }, { status: 403 });
  }

  const currentSub = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (!currentSub || !currentSub.plan) {
    return NextResponse.json({ error: "No active subscription found to modify" }, { status: 404 });
  }

  const newPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: newPlanSlug } });
  if (!newPlan) return NextResponse.json({ error: `Target plan '${newPlanSlug}' not found` }, { status: 404 });

  // Validate limits if downgrading
  const outletsCount = await prisma.outlet.count({ where: { tenantId } });
  const staffCount = await prisma.membership.count({ where: { tenantId } });

  if (outletsCount > newPlan.maxOutlets) {
    return NextResponse.json(
      {
        error: `Cannot change to ${newPlan.name}. You currently have ${outletsCount} outlets, but ${newPlan.name} allows a maximum of ${newPlan.maxOutlets}.`,
      },
      { status: 400 }
    );
  }

  if (staffCount > newPlan.maxUsers) {
    return NextResponse.json(
      {
        error: `Cannot change to ${newPlan.name}. You currently have ${staffCount} staff members, but ${newPlan.name} allows a maximum of ${newPlan.maxUsers}.`,
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const periodEnd = new Date(currentSub.currentPeriodEnd);
  const totalDays = currentSub.billingCycle === "ANNUAL" ? 365 : 30;
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const changeCalc = calculatePlanChange({
    currentPlanPriceMonthlyPaise: currentSub.plan.priceMonthlyPaise,
    newPlanPriceMonthlyPaise: newPlan.priceMonthlyPaise,
    currentPlanPriceAnnualPaise: currentSub.plan.priceAnnualPaise,
    newPlanPriceAnnualPaise: newPlan.priceAnnualPaise,
    billingCycle: (billingCycle as "MONTHLY" | "ANNUAL") || "MONTHLY",
    daysRemainingInPeriod: daysRemaining,
    totalDaysInPeriod: totalDays,
  });

  // If upgrade requires immediate proration payment
  if (changeCalc.isUpgrade && changeCalc.payablePaise > 0) {
    const receipt = `upg_${tenantId.slice(0, 8)}_${Date.now().toString(36)}`;
    let razorpayOrder: any;

    if (isRazorpayConfigured()) {
      try {
        const auth = Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString("base64");
        const r = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
          body: JSON.stringify({
            amount: changeCalc.payablePaise,
            currency: "INR",
            receipt,
            notes: {
              tenantId,
              userId,
              planSlug: newPlan.slug,
              billingCycle,
              type: "SUBSCRIPTION_PLAN_UPGRADE",
            },
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error?.description || "Razorpay upgrade order failed");
        razorpayOrder = { id: j.id, amount: j.amount, currency: j.currency };
      } catch {
        razorpayOrder = createMockOrder({ amountPaise: changeCalc.payablePaise, receipt });
      }
    } else {
      razorpayOrder = createMockOrder({ amountPaise: changeCalc.payablePaise, receipt });
    }

    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: currentSub.id,
        tenantId,
        amountPaise: changeCalc.payablePaise,
        status: "PENDING",
        provider: "RAZORPAY",
        providerPaymentId: razorpayOrder.id,
        razorpayOrderId: razorpayOrder.id,
        invoiceNumber: `INV-UPG-${Date.now().toString(36).toUpperCase()}`,
      },
    });

    return NextResponse.json({
      actionRequired: "PAYMENT_REQUIRED",
      isUpgrade: true,
      orderId: razorpayOrder.id,
      amountPaise: changeCalc.payablePaise,
      currency: "INR",
      keyId: getRazorpayKeyId(),
      proratedCreditPaise: changeCalc.proratedCreditPaise,
      targetPlan: newPlan.name,
    });
  }

  // If downgrade or no extra payment required: switch plan
  await prisma.subscription.update({
    where: { id: currentSub.id },
    data: {
      planId: newPlan.id,
      billingCycle,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "SUBSCRIPTION_PLAN_CHANGED",
      entity: "Subscription",
      entityId: currentSub.id,
      metadataJson: JSON.stringify({
        fromPlan: currentSub.plan.slug,
        toPlan: newPlan.slug,
        isUpgrade: changeCalc.isUpgrade,
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    actionRequired: "NONE",
    message: `Plan changed successfully to ${newPlan.name}.`,
    newPlan: newPlan.name,
  });
}

