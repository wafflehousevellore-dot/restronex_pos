import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(plans);
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await getSession();
    // Allow platform admins to update plans
    if (!user?.isPlatformAdmin && user?.email !== "admin@restronex.app") {
      return NextResponse.json({ error: "FORBIDDEN: Platform admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, priceMonthlyPaise, priceAnnualPaise, maxOutlets, maxUsers } = body;

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
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

    await prisma.auditLog.create({
      data: {
        action: "PLAN_UPDATED_BY_ADMIN",
        entity: "SubscriptionPlan",
        entityId: id,
        metadataJson: JSON.stringify({ priceMonthlyPaise, maxOutlets, maxUsers }),
      },
    });

    return NextResponse.json({ ok: true, plan: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update plan" }, { status: 500 });
  }
}
