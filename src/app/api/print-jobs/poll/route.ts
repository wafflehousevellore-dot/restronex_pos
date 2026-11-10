import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Allows a counter POS terminal or Local Print Bridge agent belonging to the active tenant
 * to pull pending QUEUED print jobs strictly scoped to tenant & outlet.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");

  const jobs = await prisma.printJob.findMany({
    where: {
      tenantId,
      ...(outletId ? { outletId } : {}),
      status: "QUEUED",
    },
    include: {
      printer: {
        select: { id: true, name: true, type: true, paperWidth: true, connectionString: true, bridgeUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  return NextResponse.json({
    ok: true,
    jobs: jobs.map((j) => ({
      id: j.id,
      orderId: j.orderId,
      outletId: j.outletId,
      jobType: j.jobType,
      paperWidth: j.paperWidth,
      printer: j.printer,
      payload: j.contentJson ? JSON.parse(j.contentJson) : {},
      createdAt: j.createdAt,
    })),
  });
}
