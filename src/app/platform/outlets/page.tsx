export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import OutletsAdminClient from "./OutletsAdminClient";

export default async function PlatformOutletsPage() {
  const outlets = await prisma.outlet.findMany({
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

  return <OutletsAdminClient initialOutlets={outlets} />;
}
