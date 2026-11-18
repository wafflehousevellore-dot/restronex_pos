import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { computeEnterpriseReport, DateRangePreset } from "@/lib/enterprise-reporting";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const requestedTenantId = req.nextUrl.searchParams.get("tenantId");
  const tenantId = await resolveTenantId(userId, requestedTenantId);
  if (!tenantId) return NextResponse.json({ error: "Missing organization context" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId")?.trim() || null;
  const rangePreset = (req.nextUrl.searchParams.get("rangePreset") || "LAST_30_DAYS") as DateRangePreset;
  const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = req.nextUrl.searchParams.get("endDate") || undefined;
  const orderType = req.nextUrl.searchParams.get("orderType") || "ALL";
  const paymentMethod = req.nextUrl.searchParams.get("paymentMethod") || "ALL";
  const categoryId = req.nextUrl.searchParams.get("categoryId") || null;
  const staffId = req.nextUrl.searchParams.get("staffId") || null;

  try {
    const report = await computeEnterpriseReport({
      tenantId,
      outletId,
      rangePreset,
      startDate,
      endDate,
      orderType,
      paymentMethod,
      categoryId,
      staffId,
    });

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Enterprise report generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
