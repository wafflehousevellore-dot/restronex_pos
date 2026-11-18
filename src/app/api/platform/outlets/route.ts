import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformPermissionApi } from "@/lib/platform-auth";

export async function GET(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.organizations.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase() || "";
  const status = url.searchParams.get("status");

  const outlets = await prisma.outlet.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
              { tenant: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      _count: {
        select: {
          tables: true,
          orders: true,
          memberships: true,
        },
      },
    },
  });

  return NextResponse.json({ outlets });
}
