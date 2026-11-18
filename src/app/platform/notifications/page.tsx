export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import NotificationsAdminClient from "./NotificationsAdminClient";

export default async function PlatformNotificationsPage() {
  const [notifications, totalCount] = await Promise.all([
    prisma.subscriptionNotification.findMany({
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

  return <NotificationsAdminClient initialNotifications={notifications} totalCount={totalCount} />;
}
