import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const outletId = searchParams.get("outletId");
    const channel = searchParams.get("channel");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));

    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { tenantId: true },
    });
    if (!membership) return NextResponse.json({ error: "No active membership" }, { status: 403 });

    const where: any = { tenantId: membership.tenantId };
    if (outletId) where.outletId = outletId;
    if (channel) where.channel = channel.toUpperCase();

    const logs = await prisma.customerMessageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalPaise: true,
          },
        },
      },
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
