import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processSubscriptionRenewalReminders } from "@/lib/renewal-reminders";
import { logPlatformAdminAction, requirePlatformOwnerApi } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await getSession();
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
  // Allow verified Platform Owner via Clerk or authorized Cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "restronex-cron-secret-2026";
  const isCron = authHeader === `Bearer ${cronSecret}`;

  let adminUserId: string | null = null;
  if (!isCron) {
    const guard = await requirePlatformOwnerApi();
    if (!guard.ok) return guard.response;
    adminUserId = guard.auth.user.id;
  }

  const result = await processSubscriptionRenewalReminders();
  if (adminUserId) {
    await logPlatformAdminAction({
      userId: adminUserId,
      action: "PLATFORM_RENEWAL_REMINDERS_TRIGGERED",
      entity: "Subscription",
      metadata: {
        processedCount: result.processedCount,
        remindersSentCount: result.remindersSent.length,
        statusUpdatesCount: result.statusUpdates.length,
      },
    });
  }
  return NextResponse.json({ ok: true, result });
}

