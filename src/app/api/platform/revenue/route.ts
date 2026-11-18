import { NextResponse } from "next/server";
import { requirePlatformPermissionApi } from "@/lib/platform-auth";
import { calculatePlatformFinancialMetrics } from "@/lib/platform-revenue";

export async function GET() {
  const guard = await requirePlatformPermissionApi("platform.analytics.view");
  if (!guard.ok) return guard.response;

  try {
    const metrics = await calculatePlatformFinancialMetrics();
    return NextResponse.json({ ok: true, metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to calculate revenue metrics" }, { status: 500 });
  }
}
