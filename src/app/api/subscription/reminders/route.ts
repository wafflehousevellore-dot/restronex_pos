import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processSubscriptionRenewalReminders } from "@/lib/renewal-reminders";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, user } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ notifications: [] });

  const notifications = await prisma.subscriptionNotification.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  const { user } = await getSession();
  // Allow super admin or authorized webhook/cron key
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "restronex-cron-secret-2026";
  const isCron = authHeader === `Bearer ${cronSecret}`;
  const isAdmin = user?.isPlatformAdmin === true;

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin or Cron key required" }, { status: 403 });
  }

  const result = await processSubscriptionRenewalReminders();
  return NextResponse.json({ ok: true, result });
}
