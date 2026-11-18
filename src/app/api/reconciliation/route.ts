import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export interface ReconciliationItem {
  id: string; // Order ID
  orderNumber: string;
  date: string;
  outletId: string;
  outletName: string;
  channel: string; // POS, SWIGGY, ZOMATO, QR, ONLINE
  billAmountPaise: number;
  totalPaidPaise: number;
  refundedPaise: number;
  variancePaise: number;
  reconciliationStatus: "MATCHED" | "DISCREPANCY" | "PENDING_GATEWAY" | "REFUNDED" | "UNPAID";
  primaryMethod: string;
  payments: Array<{
    id: string;
    method: string;
    amountPaise: number;
    status: string;
    reference?: string | null;
    razorpayPaymentId?: string | null;
    cardLast4?: string | null;
  }>;
  resolutionNotes?: string | null;
}

/**
 * GET /api/reconciliation?outletId=...&status=...&limit=50
 * Reconciles orders against tender records and payment attempts.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const rawOutletId = req.nextUrl.searchParams.get("outletId")?.trim() || null;
  const outletId = rawOutletId && rawOutletId !== "ALL" ? rawOutletId : null;
  const statusFilter = req.nextUrl.searchParams.get("status");
  const limit = Math.min(100, Math.max(10, parseInt(req.nextUrl.searchParams.get("limit") || "60", 10)));

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      ...(outletId ? { outletId } : {}),
      status: { not: "CANCELLED" },
    },
    include: {
      outlet: { select: { id: true, name: true } },
      payments: {
        select: {
          id: true,
          method: true,
          amountPaise: true,
          status: true,
          reference: true,
          razorpayPaymentId: true,
          cardLast4: true,
          refundedPaise: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const reconciliationLogs = await prisma.paymentReconciliationLog.findMany({
    where: { tenantId },
    orderBy: { reconciledAt: "desc" },
    take: 100,
  });
  const logMap = new Map(reconciliationLogs.map((l) => [l.referenceId, l]));

  let matchedPaise = 0;
  let discrepancyPaise = 0;
  const pendingGatewayPaise = 0;
  let aggregatorVolumePaise = 0;

  const items: ReconciliationItem[] = orders.map((order) => {
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amountPaise, 0);
    const totalRefunded = order.payments.reduce((sum, p) => sum + (p.refundedPaise || 0), 0);
    const netPaid = totalPaid - totalRefunded;
    const variance = netPaid - order.totalPaise;

    const isAggregator = (order.channel === "SWIGGY" || order.channel === "ZOMATO" || order.aggregatorOrderId);
    if (isAggregator) {
      aggregatorVolumePaise += order.totalPaise;
    }

    let status: ReconciliationItem["reconciliationStatus"] = "MATCHED";

    if (totalRefunded > 0 && netPaid === 0) {
      status = "REFUNDED";
    } else if (order.payments.length === 0) {
      status = "UNPAID";
      discrepancyPaise += order.totalPaise;
    } else if (Math.abs(variance) > 100) { // Discrepancy > ₹1
      status = "DISCREPANCY";
      discrepancyPaise += Math.abs(variance);
    } else {
      status = "MATCHED";
      matchedPaise += order.totalPaise;
    }

    const primaryMethod = order.payments[0]?.method || (isAggregator ? order.channel || "AGGREGATOR" : "UNPAID");
    const existingLog = logMap.get(order.id);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      date: order.createdAt.toISOString(),
      outletId: order.outletId,
      outletName: order.outlet.name,
      channel: isAggregator ? (order.channel || "AGGREGATOR") : (order.serviceMode || "POS"),
      billAmountPaise: order.totalPaise,
      totalPaidPaise: totalPaid,
      refundedPaise: totalRefunded,
      variancePaise: variance,
      reconciliationStatus: existingLog?.status === "RESOLVED" ? "MATCHED" : status,
      primaryMethod,
      payments: order.payments,
      resolutionNotes: existingLog?.notes || null,
    };
  });

  const filteredItems = statusFilter && statusFilter !== "ALL"
    ? items.filter((i) => i.reconciliationStatus === statusFilter)
    : items;

  return NextResponse.json({
    ok: true,
    items: filteredItems,
    summary: {
      totalAuditedOrders: items.length,
      matchedPaise,
      discrepancyPaise,
      pendingGatewayPaise,
      aggregatorVolumePaise,
      matchedCount: items.filter((i) => i.reconciliationStatus === "MATCHED").length,
      discrepancyCount: items.filter((i) => i.reconciliationStatus === "DISCREPANCY" || i.reconciliationStatus === "UNPAID").length,
    },
  });
}

/**
 * POST /api/reconciliation
 * Sign off and resolve payment discrepancies with audit stamping.
 */
export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const { orderId, status = "RESOLVED", notes } = body;
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const log = await prisma.paymentReconciliationLog.create({
    data: {
      tenantId,
      source: "ORDER",
      referenceId: orderId,
      status,
      notes: notes?.trim() || "Manually reconciled and authorized by manager.",
      metadataJson: JSON.stringify({ userId, resolvedAt: new Date().toISOString() }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "PAYMENT_RECONCILIATION_RESOLVED",
      entity: "Order",
      entityId: orderId,
      metadataJson: JSON.stringify({ status, notes }),
    },
  });

  return NextResponse.json({ ok: true, log });
}
