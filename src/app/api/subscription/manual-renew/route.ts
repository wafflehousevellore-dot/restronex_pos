import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcCheckoutTotals } from "@/lib/checkout";
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

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem || mem.role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can renew subscriptions" }, { status: 403 });
  }

  const currentSub = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (!currentSub || !currentSub.plan) {
    return NextResponse.json({ error: "No active or existing subscription found to renew" }, { status: 404 });
  }

  const billingCycle: "MONTHLY" | "ANNUAL" =
    body.billingCycle === "ANNUAL" || currentSub.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const outletsCount = await prisma.outlet.count({ where: { tenantId } });

  const totals = calcCheckoutTotals({
    planSlug: currentSub.plan.slug,
    billingCycle,
    outletCount: Math.max(1, outletsCount),
  });

  const receipt = `rnw_${tenantId.slice(0, 8)}_${Date.now().toString(36)}`;
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
          amount: totals.totalPaise,
          currency: "INR",
          receipt,
          notes: {
            tenantId,
            userId,
            planSlug: currentSub.plan.slug,
            billingCycle,
            type: "SUBSCRIPTION_MANUAL_RENEWAL",
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.description || `Razorpay order creation failed (${r.status})`);
      razorpayOrder = { id: j.id, amount: j.amount, currency: j.currency };
    } catch (e: any) {
      console.warn("Razorpay API order error, falling back to mock:", e.message);
      razorpayOrder = createMockOrder({ amountPaise: totals.totalPaise, receipt });
    }
  } else {
    razorpayOrder = createMockOrder({ amountPaise: totals.totalPaise, receipt });
  }

  // Create pending payment record
  const paymentRecord = await prisma.subscriptionPayment.create({
    data: {
      subscriptionId: currentSub.id,
      tenantId,
      amountPaise: totals.totalPaise,
      status: "PENDING",
      provider: "RAZORPAY",
      providerPaymentId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      invoiceNumber: `INV-RNW-${Date.now().toString(36).toUpperCase()}`,
    },
  });

  return NextResponse.json({
    ok: true,
    renewalType: "MANUAL_ONE_TIME",
    subscriptionId: currentSub.id,
    paymentRecordId: paymentRecord.id,
    orderId: razorpayOrder.id,
    amountPaise: totals.totalPaise,
    currency: "INR",
    keyId: getRazorpayKeyId(),
    plan: {
      name: currentSub.plan.name,
      slug: currentSub.plan.slug,
      billingCycle,
      subtotal: totals.subtotal,
      gst: totals.gstPaise,
      total: totals.totalPaise,
    },
  });
}
