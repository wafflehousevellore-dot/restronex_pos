export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export default async function StaffAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/staff/login");
  }

  const c = await cookies();
  const selectedOrgParam = sp.org || c.get("restronex_org")?.value;

  // 1. Fetch all active memberships for this authenticated user
  const allActiveMemberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      tenant: { select: { id: true, name: true, slug: true, clerkOrgId: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Handle zero active memberships
  if (allActiveMemberships.length === 0) {
    // Check if user is an OWNER (redirect to owner flow)
    const ownerMembership = await prisma.membership.findFirst({
      where: { userId: user.id, role: "OWNER" },
    });
    if (ownerMembership) {
      redirect("/app/auth-callback");
    }

    // Check if user has an unaccepted pending invitation
    const pendingInvite = await prisma.staffInvitation.findFirst({
      where: {
        email: user.email.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (pendingInvite) {
      redirect(`/staff/accept-invitation?token=${pendingInvite.rawToken || ""}`);
    }

    redirect("/staff/login?error=no_membership");
  }

  // 3. Handle multiple active memberships (require explicit selection if none selected in URL)
  if (allActiveMemberships.length > 1 && !sp.org) {
    redirect("/staff/choose-organization");
  }

  // 4. Resolve the target membership: explicitly selected org param -> cookie -> single active membership
  const targetMembership = (selectedOrgParam
    ? allActiveMemberships.find((m) => m.tenantId === selectedOrgParam)
    : null) || allActiveMemberships[0];

  if (!targetMembership) {
    redirect("/staff/choose-organization");
  }

  if (targetMembership.status !== "ACTIVE" || targetMembership.tenant.status !== "ACTIVE") {
    redirect("/staff/login?error=suspended");
  }

  // 5. Securely persist active organization cookie
  c.set("restronex_org", targetMembership.tenantId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  // 6. Retroactive synchronization with Clerk Organization
  if (targetMembership.tenant.clerkOrgId && user.clerkUserId) {
    try {
      const client = await clerkClient();
      await client.organizations.createOrganizationMembership({
        organizationId: targetMembership.tenant.clerkOrgId,
        userId: user.clerkUserId,
        role: "org:member",
      }).catch(() => null);
    } catch {
      // non-blocking
    }
  }

  // 7. Respect safe next redirect parameter
  const nextParam = sp.next;
  if (
    nextParam &&
    nextParam.startsWith("/staff") &&
    nextParam !== "/staff/login" &&
    nextParam !== "/staff/auth-callback" &&
    nextParam !== "/staff/choose-organization"
  ) {
    redirect(nextParam);
  }

  // 8. Role-based immediate landing station routing
  const role = targetMembership.role.toUpperCase();
  if (role === "CASHIER") {
    redirect("/staff/pos");
  } else if (role === "KITCHEN_STAFF") {
    redirect("/staff/kitchen");
  } else if (role === "WAITER") {
    redirect("/staff/tables");
  } else if (role === "INVENTORY_MANAGER") {
    redirect("/staff/inventory");
  }

  redirect("/staff/dashboard");
}
