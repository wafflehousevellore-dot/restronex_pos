import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GST_BPS } from "@/lib/checkout";
import { isRazorpayConfigured, isRazorpayLiveMode, isWebhookConfigured } from "@/lib/razorpay";
import { ensureSeedPlans } from "@/lib/seed";
import {
  logPlatformAdminAction,
  PRIMARY_PLATFORM_OWNER_EMAIL,
  requirePlatformOwnerApi,
} from "@/lib/platform-auth";

export async function GET() {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  const [tenantCount, outletCount, userCount, activeSubCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.outlet.count(),
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
  ]);

  return NextResponse.json({
    primaryOwnerEmail: PRIMARY_PLATFORM_OWNER_EMAIL,
    mfaEnrolled: guard.auth.mfaEnrolled,
    mfaVerifiedInSession: guard.auth.mfaVerifiedInSession,
    totpEnabled: guard.auth.totpEnabled,
    clerkMfaEnrolled: guard.auth.clerkMfaEnrolled,
    remainingBackupCodes: guard.auth.remainingBackupCodes,
    gstBps: GST_BPS,
    razorpayConfigured: isRazorpayConfigured(),
    razorpayLiveMode: isRazorpayLiveMode(),
    webhookConfigured: isWebhookConfigured(),
    clerkConfigured: Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    stats: {
      tenantCount,
      outletCount,
      userCount,
      activeSubCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { action, demoRequestId, demoStatus } = body as {
      action?: "SYNC_PLANS" | "UPDATE_DEMO_STATUS";
      demoRequestId?: string;
      demoStatus?: string;
    };

    if (action === "SYNC_PLANS") {
      await ensureSeedPlans();
      await logPlatformAdminAction({
        userId: guard.auth.user.id,
        action: "PLATFORM_PLANS_SYNCED",
        entity: "SubscriptionPlan",
      });
      return NextResponse.json({ ok: true, message: "Plans synchronized with central pricing config." });
    }

    if (action === "UPDATE_DEMO_STATUS") {
      if (!demoRequestId || !demoStatus) {
        return NextResponse.json({ error: "demoRequestId and demoStatus required" }, { status: 400 });
      }
      const allowed = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
      if (!allowed.includes(demoStatus)) {
        return NextResponse.json({ error: "Invalid demo status" }, { status: 400 });
      }
      const updated = await prisma.demoRequest.update({
        where: { id: demoRequestId },
        data: { status: demoStatus },
      });
      await logPlatformAdminAction({
        userId: guard.auth.user.id,
        action: "PLATFORM_DEMO_REQUEST_UPDATED",
        entity: "DemoRequest",
        entityId: demoRequestId,
        metadata: { status: demoStatus },
      });
      return NextResponse.json({ ok: true, demoRequest: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 });
  }
}

