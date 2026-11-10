import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcCheckoutTotals, resolveCouponDiscount } from "@/lib/checkout";
import { getRazorpayKeyId, isRazorpayConfigured } from "@/lib/razorpay";
import { ensureSeedPlans } from "@/lib/seed";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Sign in required — preserve plan and retry" }, { status: 401 });
  await ensureSeedPlans();
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { planSlug, billingCycle, outletCount, coupon } = body as { planSlug: string; billingCycle: "MONTHLY" | "ANNUAL"; outletCount?: number; coupon?: string };
  if (!planSlug || !billingCycle) return NextResponse.json({ error: "planSlug and billingCycle required" }, { status: 400 });

  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
  if (!plan) return NextResponse.json({ error: "Plan not found in DB" }, { status: 404 });

  // Enforce outlet limit server-side
  if ((outletCount || 1) > plan.maxOutlets) {
    return NextResponse.json({ error: `Outlet count ${outletCount} exceeds plan limit ${plan.maxOutlets} for ${plan.name}. Choose Growth/Business or reduce outlets.` }, { status: 400 });
  }

  let totals;
  try {
    const baseTotals = calcCheckoutTotals({ planSlug, billingCycle, outletCount, planPricingOverride: plan });
    const cRes = resolveCouponDiscount(coupon, baseTotals.subtotal);
    totals = calcCheckoutTotals({
      planSlug,
      billingCycle,
      outletCount,
      couponDiscountPaise: cRes.discountPaise,
      fixedTotalPaise: cRes.fixedTotalPaise,
      planPricingOverride: plan,
    });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }

  const tenantId = await resolveTenantId(userId);
  const receipt = `rcpt_${userId.slice(0, 8)}_${planSlug}_${Date.now().toString(36)}`;

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay payment gateway credentials are not configured on the server. Please contact system administrator." },
      { status: 503 }
    );
  }

  let order: { id: string; amount: number; currency: string; receipt: string; status: string };
  try {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
      body: JSON.stringify({
        amount: totals.totalPaise,
        currency: "INR",
        receipt,
        notes: { tenantId: tenantId || "", userId, planSlug, billingCycle, outletCount: String(outletCount || 1) },
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      throw new Error(j.error?.description || `Razorpay order creation returned HTTP ${r.status}`);
    }
    order = { id: j.id, amount: j.amount, currency: j.currency, receipt: j.receipt, status: "created" };
  } catch (e: any) {
    return NextResponse.json(
      { error: `Payment gateway error: ${e.message || "Failed to create Razorpay order"}` },
      { status: 502 }
    );
  }

  // Persist pending payment record if tenant exists
  if (tenantId) {
    const existingSub = await prisma.subscription.findFirst({ where: { tenantId, planId: plan.id, status: { in: ["PENDING", "TRIALING", "ACTIVE"] } } });
    const subId = existingSub?.id || (await prisma.subscription.create({
      data: {
        tenantId, planId: plan.id, status: "PENDING", billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === "ANNUAL" ? 365 : 30) * 24 * 60 * 60 * 1000),
      }
    })).id;
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subId,
        amountPaise: totals.totalPaise,
        status: "PENDING",
        provider: "RAZORPAY",
        providerPaymentId: order.id,
      }
    });
  }

  return NextResponse.json({
    orderId: order.id,
    amountPaise: totals.totalPaise,
    currency: "INR",
    receipt: order.receipt,
    keyId: getRazorpayKeyId(),
    planSlug,
    billingCycle,
    totals: { subtotal: totals.subtotal, gst: totals.gstPaise, total: totals.totalPaise },
  });
}
