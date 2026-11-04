import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const list = await prisma.feedback.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  let tenantId = body.tenantId;
  let outletId = body.outletId;

  // Resolve from orderId if present
  if (body.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: { tenantId: true, outletId: true },
    });
    if (order) {
      tenantId = order.tenantId;
      outletId = outletId || order.outletId;
    }
  }

  // Fallback to first active tenant if demo mode
  if (!tenantId || tenantId === "default") {
    const firstTenant = await prisma.tenant.findFirst({ where: { status: "ACTIVE" } });
    if (firstTenant) tenantId = firstTenant.id;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context required for feedback" }, { status: 400 });
  }

  const f = await prisma.feedback.create({
    data: {
      tenantId,
      outletId: outletId || null,
      orderId: body.orderId || null,
      rating: Math.max(1, Math.min(5, parseInt(String(body.rating || 5), 10))),
      comment: body.comment?.trim() || null,
    },
  });

  return NextResponse.json(f);
}
