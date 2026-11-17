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
  let user = await getAuthenticatedUser();

  // Robust Clerk session fallback if local session cookie is not yet initialized
  if (!user) {
    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const { userId: clerkUserId } = await auth();
      if (clerkUserId) {
        const clerkUser = await currentUser();
        const email =
          clerkUser?.emailAddresses?.[0]?.emailAddress ||
          clerkUser?.primaryEmailAddress?.emailAddress ||
          "";
        const name = clerkUser?.fullName || (email ? email.split("@")[0] : "Staff Member");
        let dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { clerkId: clerkUserId },
              ...(email ? [{ email: email.toLowerCase() }] : []),
            ],
          },
        });
        if (!dbUser && email) {
          dbUser = await prisma.user.create({
            data: {
              clerkId: clerkUserId,
              email: email.toLowerCase(),
              name,
              role: "STAFF",
            },
          });
        } else if (dbUser && !dbUser.clerkId) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { clerkId: clerkUserId },
          });
        }
        if (dbUser) {
          user = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            avatarUrl: dbUser.avatarUrl,
            clerkUserId: clerkUserId,
            isPlatformAdmin: Boolean(dbUser.isPlatformAdmin),
          };
        }
      }
    } catch (clerkErr) {
      console.warn("[Staff Auth Callback] Clerk session fallback notice:", clerkErr);
    }
  }

  if (!user) {
    redirect("/staff/login");
  }

  const c = await cookies();
  const selectedOrgParam = sp.org || c.get("restronex_org")?.value;

  // 1. Fetch all active memberships for this authenticated user
  let allActiveMemberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      tenant: { select: { id: true, name: true, slug: true, clerkOrgId: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // 1b. If no active memberships found by userId, check by user email to ensure mapping
  if (allActiveMemberships.length === 0 && user.email) {
    const emailMembership = await prisma.membership.findFirst({
      where: {
        user: { email: user.email.toLowerCase() },
        status: "ACTIVE",
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, clerkOrgId: true, status: true } },
      },
    });
    if (emailMembership) {
      if (emailMembership.userId !== user.id) {
        await prisma.membership.update({
          where: { id: emailMembership.id },
          data: { userId: user.id },
        });
      }
      allActiveMemberships = [emailMembership];
    }
  }

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
  const targetMembership =
    (selectedOrgParam
      ? allActiveMemberships.find((m) => m.tenantId === selectedOrgParam)
      : null) || allActiveMemberships[0];

  if (!targetMembership) {
    redirect("/staff/choose-organization");
  }

  if (targetMembership.status !== "ACTIVE" || targetMembership.tenant.status !== "ACTIVE") {
    redirect("/staff/login?error=suspended");
  }

  // 5. Retroactive synchronization with Clerk Organization (safe, non-blocking)
  if (targetMembership.tenant.clerkOrgId && user.clerkUserId) {
    try {
      const client = await clerkClient();
      await client.organizations
        .createOrganizationMembership({
          organizationId: targetMembership.tenant.clerkOrgId,
          userId: user.clerkUserId,
          role: "org:member",
        })
        .catch(() => null);
    } catch {
      // non-blocking
    }
  }

  // 6. Role-based immediate landing station routing
  const role = targetMembership.role.toUpperCase();
  let destination = "/staff/dashboard";
  if (role === "CASHIER") {
    destination = "/staff/pos";
  } else if (role === "KITCHEN_STAFF" || role === "KITCHEN") {
    destination = "/staff/kitchen";
  } else if (role === "WAITER") {
    destination = "/staff/tables";
  } else if (role === "INVENTORY_MANAGER" || role === "INVENTORY") {
    destination = "/staff/inventory";
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
    destination = nextParam;
  }

  redirect(destination);
}
