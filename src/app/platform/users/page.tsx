export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PRIMARY_PLATFORM_OWNER_EMAIL } from "@/lib/platform-auth";
import UsersAdminClient from "./UsersAdminClient";

export default async function PlatformUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isPlatformAdmin: true,
      clerkId: true,
      createdAt: true,
      memberships: {
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  return (
    <UsersAdminClient
      initialUsers={JSON.parse(JSON.stringify(users))}
      primaryOwnerEmail={PRIMARY_PLATFORM_OWNER_EMAIL}
    />
  );
}
