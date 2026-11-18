import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import {
  getLoyaltyConfig,
  saveLoyaltyConfig,
  getOffersConfig,
  determineMembershipTier,
} from "@/lib/crm-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [config, customers, recentTxns] = await Promise.all([
    getLoyaltyConfig(tenantId),
    prisma.customer.findMany({
      where: { tenantId },
      select: { loyaltyPoints: true },
    }),
    prisma.loyaltyTxn.findMany({
      where: { customer: { tenantId } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  // Aggregate program figures
  const totalBalance = customers.reduce((sum, c) => sum + Math.max(0, c.loyaltyPoints), 0);
  const activeMembers = customers.filter((c) => c.loyaltyPoints > 0).length;

  let totalIssued = 0;
  let totalRedeemed = 0;
  for (const t of recentTxns) {
    if (t.points > 0) totalIssued += t.points;
    else totalRedeemed += Math.abs(t.points);
  }

  return NextResponse.json({
    config,
    stats: {
      totalBalance,
      activeMembers,
      recentIssued: totalIssued,
      recentRedeemed: totalRedeemed,
    },
    transactions: recentTxns,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  const config = await getLoyaltyConfig(tenantId);

  // 1. Update program rules
  if (action === "UPDATE_CONFIG") {
    const updated = await saveLoyaltyConfig(tenantId, body.config);
    return NextResponse.json({ success: true, config: updated });
  }

  // 2. Points Earn on Order
  if (action === "EARN") {
    if (!config.enabled) {
      return NextResponse.json({ error: "Loyalty rewards program is currently disabled." }, { status: 400 });
    }

    const { customerId, customerPhone, orderId, eligibleAmountPaise } = body;
    if (!customerId && !customerPhone) {
      return NextResponse.json({ error: "Customer identification required." }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        ...(customerId ? { id: customerId } : { phone: customerPhone }),
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // Idempotency: Prevent awarding points twice for the exact same order
    if (orderId) {
      const existingTxn = await prisma.loyaltyTxn.findFirst({
        where: {
          customerId: customer.id,
          reference: { contains: orderId },
          type: "EARNED",
        },
      });
      if (existingTxn) {
        return NextResponse.json({
          success: true,
          pointsEarned: existingTxn.points,
          balance: customer.loyaltyPoints,
          alreadyProcessed: true,
        });
      }
    }

    // Tier multiplier calculation
    const offers = await getOffersConfig(tenantId);
    const tier = determineMembershipTier(customer.totalSpentPaise, offers.membershipTiers);

    const eligibleRs = Math.floor((eligibleAmountPaise || 0) / 100);
    const basePoints = Math.floor((eligibleRs / 100) * config.pointsPerHundredRupees);
    const pointsEarned = Math.max(1, Math.round(basePoints * (tier.pointsMultiplier || 1.0)));

    if (pointsEarned <= 0) {
      return NextResponse.json({ success: true, pointsEarned: 0, balance: customer.loyaltyPoints });
    }

    // Atomic update
    const [updatedCust, txn] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: { loyaltyPoints: { increment: pointsEarned } },
      }),
      prisma.loyaltyTxn.create({
        data: {
          customerId: customer.id,
          points: pointsEarned,
          type: "EARNED",
          reference: orderId ? `Order #${orderId} (${tier.name} ${tier.pointsMultiplier}x)` : "Bill Earn",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pointsEarned,
      newBalance: updatedCust.loyaltyPoints,
      transaction: txn,
    });
  }

  // 3. Points Redemption at POS
  if (action === "REDEEM") {
    if (!config.enabled) {
      return NextResponse.json({ error: "Loyalty rewards program is currently disabled." }, { status: 400 });
    }

    const { customerId, customerPhone, pointsToRedeem, orderId, orderSubtotalPaise } = body;
    const pts = parseInt(String(pointsToRedeem || 0), 10);

    if (pts <= 0) {
      return NextResponse.json({ error: "Invalid points amount specified." }, { status: 400 });
    }

    if (pts < config.minRedemptionPoints) {
      return NextResponse.json(
        { error: `Minimum ${config.minRedemptionPoints} points required for redemption.` },
        { status: 400 }
      );
    }

    if (config.maxRedemptionPoints > 0 && pts > config.maxRedemptionPoints) {
      return NextResponse.json(
        { error: `Maximum ${config.maxRedemptionPoints} points can be redeemed per bill.` },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        ...(customerId ? { id: customerId } : { phone: customerPhone }),
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    if (customer.loyaltyPoints < pts) {
      return NextResponse.json(
        { error: `Insufficient loyalty balance. Available: ${customer.loyaltyPoints} points.` },
        { status: 400 }
      );
    }

    // Calculate discount
    const discountPaise = pts * config.rupeesPerPoint * 100;
    if (orderSubtotalPaise && config.maxDiscountPercentage > 0) {
      const maxAllowedDiscountPaise = Math.round(orderSubtotalPaise * (config.maxDiscountPercentage / 100));
      if (discountPaise > maxAllowedDiscountPaise) {
        return NextResponse.json(
          {
            error: `Points discount exceeds max allowed ${config.maxDiscountPercentage}% cap of bill (Max: ₹${Math.round(
              maxAllowedDiscountPaise / 100
            )}).`,
          },
          { status: 400 }
        );
      }
    }

    // Atomic update
    const [updatedCust, txn] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: { loyaltyPoints: { decrement: pts } },
      }),
      prisma.loyaltyTxn.create({
        data: {
          customerId: customer.id,
          points: -pts,
          type: "REDEEMED",
          reference: orderId ? `Redemption for Order #${orderId}` : "Bill Redemption",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pointsRedeemed: pts,
      discountPaise,
      newBalance: updatedCust.loyaltyPoints,
      transaction: txn,
    });
  }

  // 4. Manual Adjustment with reason
  if (action === "ADJUST") {
    const { customerId, points, reason } = body;
    const pts = parseInt(String(points || 0), 10);

    if (!pts) {
      return NextResponse.json({ error: "Non-zero adjustment points required." }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const newBalance = customer.loyaltyPoints + pts;
    if (newBalance < 0) {
      return NextResponse.json(
        { error: `Cannot debit points below 0. Current balance: ${customer.loyaltyPoints}.` },
        { status: 400 }
      );
    }

    const [updatedCust, txn] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: { loyaltyPoints: newBalance },
      }),
      prisma.loyaltyTxn.create({
        data: {
          customerId: customer.id,
          points: pts,
          type: "MANUAL_ADJUSTMENT",
          reference: reason || "Manual Staff Adjustment",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pointsAdjusted: pts,
      newBalance: updatedCust.loyaltyPoints,
      transaction: txn,
    });
  }

  // 5. Points Reversal on Refund / Cancellation
  if (action === "REVERSE") {
    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: "OrderId required for loyalty reversal." }, { status: 400 });
    }

    // Find all txns referencing this order
    const txns = await prisma.loyaltyTxn.findMany({
      where: {
        reference: { contains: orderId },
        type: { in: ["EARNED", "REDEEMED"] },
      },
    });

    if (txns.length === 0) {
      return NextResponse.json({ success: true, message: "No loyalty transactions associated with order." });
    }

    for (const t of txns) {
      // If points were earned, reverse by deducting them
      // If points were redeemed, restore by crediting them back
      const reversePoints = -t.points;
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: t.customerId },
          data: { loyaltyPoints: { increment: reversePoints } },
        }),
        prisma.loyaltyTxn.create({
          data: {
            customerId: t.customerId,
            points: reversePoints,
            type: "REFUND_REVERSAL",
            reference: `Reversal for Order #${orderId}`,
          },
        }),
      ]);
    }

    return NextResponse.json({ success: true, reversedCount: txns.length });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
