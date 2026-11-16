export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, getOrganizationMembership } from "@/lib/server-auth";
import { StaffShell } from "@/components/staff/StaffShell";

export const metadata = {
  title: "RestroNex Staff Workspace",
  description: "Secure role-based staff application for restaurant operations.",
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/staff/login");
  }

  const membership = await getOrganizationMembership(user.id);
  if (!membership) {
    redirect("/staff/login?error=no_membership");
  }

  if (membership.status !== "ACTIVE") {
    redirect("/staff/login?error=suspended");
  }

  // Fetch all user's active memberships for multi-org switcher
  const allMemberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const c = await cookies();
  const activeOutletCookie = c.get("restronex_outlet")?.value;
  const activeOutletId = membership.authorizedOutlets.some((o) => o.id === activeOutletCookie)
    ? activeOutletCookie
    : membership.authorizedOutlets[0]?.id || null;

  return (
    <StaffShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }}
      membership={{
        id: membership.id,
        role: membership.role,
        permissions: membership.permissions,
        tenant: {
          id: membership.tenant.id,
          name: membership.tenant.name,
        },
        authorizedOutlets: membership.authorizedOutlets,
      }}
      activeOutletId={activeOutletId}
      allMemberships={allMemberships.map((m) => ({
        id: m.id,
        role: m.role,
        tenant: {
          id: m.tenant.id,
          name: m.tenant.name,
        },
      }))}
    >
      {children}
    </StaffShell>
  );
}
