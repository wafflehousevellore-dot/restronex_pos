import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformPermissionApi } from "@/lib/platform-auth";

export async function GET(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.dashboard.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const [notifications, totalCount] = await Promise.all([
    prisma.subscriptionNotification.findMany({
      where: {
        ...(status && status !== "ALL" ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        tenant: {
          select: { id: true, name: true, email: true },
        },
        subscription: {
          include: { plan: { select: { name: true, slug: true } } },
        },
      },
    }),
    prisma.subscriptionNotification.count(),
  ]);

  return NextResponse.json({
    notifications,
    totalCount,
  });
}
