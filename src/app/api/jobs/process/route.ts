import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processDueBackgroundJobs } from "@/lib/background-jobs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const result = await processDueBackgroundJobs({ limit: 50 });
    return NextResponse.json({ ok: true, ...result });
  }

  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tenantId = await resolveTenantId(userId, body?.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await processDueBackgroundJobs({ tenantId, limit: 25 });
  return NextResponse.json({ ok: true, ...result });
}
