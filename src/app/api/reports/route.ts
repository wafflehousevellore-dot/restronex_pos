import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache, getOrSetCache } from "@/lib/cache";
import { computeTenantInsightsReport } from "@/lib/reports-analytics";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const requestedTenantId = req.nextUrl.searchParams.get("tenantId");
  const tenantId = await resolveTenantId(userId, requestedTenantId);
  if (!tenantId) return NextResponse.json({ error: "Missing tenant" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rawOutletId = req.nextUrl.searchParams.get("outletId")?.trim() || null;
  const outletId = rawOutletId && rawOutletId !== "ALL" ? rawOutletId : null;

  if (outletId) {
    const outletOwned = await prisma.outlet.findFirst({
      where: { id: outletId, tenantId },
      select: { id: true },
    });
    if (!outletOwned) {
      return NextResponse.json({ error: "Invalid outlet for tenant" }, { status: 403 });
    }
  }

  const daysParam = Number(req.nextUrl.searchParams.get("days") || "30");
  const days = Number.isFinite(daysParam)
    ? Math.max(1, Math.min(90, Math.floor(daysParam)))
    : 30;
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  const cacheKey = `report_${tenantId}_${outletId || "ALL"}_${days}`;
  if (forceRefresh) {
    appCache.del(cacheKey);
  }

  const report = await getOrSetCache(
    cacheKey,
    () => computeTenantInsightsReport({ tenantId, outletId, days }),
    30
  );

  return NextResponse.json(report);
}
