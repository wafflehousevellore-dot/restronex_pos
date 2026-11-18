import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { getComplaints, saveComplaint, CrmComplaint } from "@/lib/crm-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [feedbacks, complaints] = await Promise.all([
    prisma.feedback.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getComplaints(tenantId),
  ]);

  // Enrich feedbacks with order and customer phone if orderId present
  const orderIds = feedbacks.map((f) => f.orderId).filter(Boolean) as string[];
  const orders = orderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true, customerName: true, customerPhone: true, totalPaise: true },
      })
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const enrichedFeedbacks = feedbacks.map((f) => {
    const o = f.orderId ? orderMap.get(f.orderId) : null;
    return {
      ...f,
      orderNumber: o?.orderNumber || null,
      customerName: o?.customerName || "Diner",
      customerPhone: o?.customerPhone || null,
      totalPaise: o?.totalPaise || null,
    };
  });

  // Calculate metrics
  const total = feedbacks.length;
  const avgRating = total ? (feedbacks.reduce((s, f) => s + f.rating, 0) / total).toFixed(1) : "5.0";
  const promoters = feedbacks.filter((f) => f.rating >= 4).length;
  const passives = feedbacks.filter((f) => f.rating === 3).length;
  const detractors = feedbacks.filter((f) => f.rating <= 2).length;
  const npsScore = total ? Math.round(((promoters - detractors) / total) * 100) : 100;
  const csatPercent = total ? Math.round((promoters / total) * 100) : 100;

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: feedbacks.filter((f) => f.rating === s).length,
    percentage: total ? Math.round((feedbacks.filter((f) => f.rating === s).length / total) * 100) : 0,
  }));

  const unresolvedComplaints = complaints.filter((c) => c.status !== "RESOLVED");

  return NextResponse.json({
    feedbacks: enrichedFeedbacks,
    complaints,
    metrics: {
      total,
      avgRating,
      npsScore,
      csatPercent,
      promoters,
      passives,
      detractors,
      starCounts,
      unresolvedCount: unresolvedComplaints.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { customerName, customerPhone, rating, comment, assignedStaff } = body;

  const newComplaint: CrmComplaint = {
    id: `comp-${Date.now()}`,
    customerName: customerName?.trim() || "Guest Diner",
    customerPhone: customerPhone?.trim() || "",
    rating: Number(rating || 1),
    comment: comment?.trim() || "",
    status: "OPEN",
    assignedStaff: assignedStaff?.trim() || "Floor Manager",
    createdAt: new Date().toISOString(),
  };

  const saved = await saveComplaint(tenantId, newComplaint);
  return NextResponse.json({ success: true, complaint: saved });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { complaintId, status, assignedStaff, resolutionNotes } = body;

  if (!complaintId) {
    return NextResponse.json({ error: "Complaint ID required" }, { status: 400 });
  }

  const complaints = await getComplaints(tenantId);
  const complaint = complaints.find((c) => c.id === complaintId);

  if (!complaint) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  const updated: CrmComplaint = {
    ...complaint,
    status: status || complaint.status,
    assignedStaff: assignedStaff !== undefined ? assignedStaff : complaint.assignedStaff,
    resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : complaint.resolutionNotes,
    resolvedAt: status === "RESOLVED" ? new Date().toISOString() : complaint.resolvedAt,
  };

  await saveComplaint(tenantId, updated);
  return NextResponse.json({ success: true, complaint: updated });
}
