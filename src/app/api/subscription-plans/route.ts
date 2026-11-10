import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedPlans } from "@/lib/seed";
import { logPlatformAdminAction, requirePlatformOwnerApi } from "@/lib/platform-auth";

export async function GET() {
  await ensureSeedPlans();
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(plans);
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requirePlatformOwnerApi();
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const { id, priceMonthlyPaise, priceAnnualPaise, maxOutlets, maxUsers } = body;

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(priceMonthlyPaise !== undefined ? { priceMonthlyPaise: Number(priceMonthlyPaise) } : {}),
        ...(priceAnnualPaise !== undefined ? { priceAnnualPaise: Number(priceAnnualPaise) } : {}),
        ...(maxOutlets !== undefined ? { maxOutlets: Number(maxOutlets) } : {}),
        ...(maxUsers !== undefined ? { maxUsers: Number(maxUsers) } : {}),
      },
    });

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      action: "PLATFORM_PLAN_UPDATED",
      entity: "SubscriptionPlan",
      entityId: id,
      metadata: {
        slug: existing.slug,
        previousMonthlyPaise: existing.priceMonthlyPaise,
        newMonthlyPaise: updated.priceMonthlyPaise,
        previousAnnualPaise: existing.priceAnnualPaise,
        newAnnualPaise: updated.priceAnnualPaise,
        maxOutlets: updated.maxOutlets,
        maxUsers: updated.maxUsers,
      },
    });

    return NextResponse.json({ ok: true, plan: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update plan" }, { status: 500 });
  }
}
