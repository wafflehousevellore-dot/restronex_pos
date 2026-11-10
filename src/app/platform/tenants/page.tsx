export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import TenantsAdminClient from "./TenantsAdminClient";

export default async function TenantsAdmin() {
  const tenants = await prisma.tenant.findMany({
    include: {
      outlets: { orderBy: { createdAt: "asc" } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { memberships: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <TenantsAdminClient initialTenants={JSON.parse(JSON.stringify(tenants))} />;
}
