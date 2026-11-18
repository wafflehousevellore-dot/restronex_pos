import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logPlatformAdminAction, requirePlatformPermissionApi } from "@/lib/platform-auth";

export async function GET(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.payments.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const tenantId = url.searchParams.get("tenantId");

  const payments = await prisma.subscriptionPayment.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      subscription: {
        include: {
          tenant: { select: { id: true, name: true, email: true, slug: true } },
          plan: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  const totals = await prisma.subscriptionPayment.aggregate({
    _sum: { amountPaise: true },
    _count: true,
  });

  const completedTotals = await prisma.subscriptionPayment.aggregate({
    where: { status: "COMPLETED" },
    _sum: { amountPaise: true },
    _count: true,
  });

  const failedCount = await prisma.subscriptionPayment.count({
    where: { status: "FAILED" },
  });

  return NextResponse.json({
    payments,
    summary: {
      totalCount: totals._count || 0,
      totalPaise: totals._sum.amountPaise || 0,
      completedCount: completedTotals._count || 0,
      completedPaise: completedTotals._sum.amountPaise || 0,
      failedCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.refunds.manage");
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { action, paymentId, refundAmountPaise, reason } = body as {
      action: "PROCESS_REFUND";
      paymentId: string;
      refundAmountPaise?: number;
      reason: string;
    };

    if (action !== "PROCESS_REFUND" || !paymentId) {
      return NextResponse.json({ error: "Invalid refund action or paymentId" }, { status: 400 });
    }

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { subscription: { include: { tenant: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Subscription payment record not found" }, { status: 404 });
    }

    if (payment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Cannot refund payment with status '${payment.status}'` },
        { status: 400 }
      );
    }

    const refundAmount = refundAmountPaise || payment.amountPaise;

    const updated = await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        failureReason: `Refunded by platform admin: ${reason || "Support concession"}`,
      },
    });

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      tenantId: payment.tenantId,
      action: "PLATFORM_SUBSCRIPTION_REFUNDED",
      entity: "SubscriptionPayment",
      entityId: payment.id,
      metadata: {
        paymentId: payment.id,
        amountPaise: refundAmount,
        originalAmountPaise: payment.amountPaise,
        tenantName: payment.subscription?.tenant?.name,
        reason: reason || "Platform admin refund",
      },
    });

    return NextResponse.json({ ok: true, payment: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process refund" }, { status: 500 });
  }
}
