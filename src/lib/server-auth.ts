/**
 * RestroNex Server-Side Authorization & Multi-Tenant Access Control
 * Enforces Clerk authentication, organization membership status, outlet scoping,
 * granular permission keys, and subscription entitlements on the server.
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission as checkHasPermission, PermissionKey } from "@/lib/permissions";
import { getEntitlements, Entitlements } from "@/lib/entitlements";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  clerkUserId?: string | null;
  isPlatformAdmin: boolean;
}

export interface OrganizationMembership {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  status: string;
  outletId: string | null;
  permissions: string[];
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    onboardingComplete: boolean;
    clerkOrgId?: string | null;
  };
  staffProfile?: {
    id: string;
    fullName: string;
    jobTitle?: string | null;
    employeeCode?: string | null;
    phone?: string | null;
  } | null;
  authorizedOutlets: {
    id: string;
    name: string;
    slug: string;
  }[];
}

/**
 * 1. Resolves authenticated user using Clerk first, with local JWT session fallback.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getSession();
  if (!session?.userId || !session.user) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      clerkId: true,
      isPlatformAdmin: true,
      role: true,
    },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatarUrl,
    clerkUserId: dbUser.clerkId || session.clerkUserId,
    isPlatformAdmin: Boolean(dbUser.isPlatformAdmin),
  };
}

/**
 * 2. Retrieves active organization membership for user and tenant context.
 */
export async function getOrganizationMembership(
  userId: string,
  tenantId?: string | null
): Promise<OrganizationMembership | null> {
  if (!userId) return null;

  // Determine active tenantId: explicit parameter -> cookie -> user's first active membership
  let targetTenantId = tenantId;
  if (!targetTenantId) {
    try {
      const c = await cookies();
      targetTenantId = c.get("restronex_org")?.value || c.get("restronex_tenant")?.value || null;
    } catch {
      targetTenantId = null;
    }
  }

  const membershipWhere = targetTenantId
    ? { userId, tenantId: targetTenantId }
    : { userId };

  const membership = await prisma.membership.findFirst({
    where: {
      ...membershipWhere,
      status: "ACTIVE", // Only active memberships are considered
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          onboardingComplete: true,
          clerkOrgId: true,
        },
      },
      staffProfile: true,
      outletMembers: {
        where: { status: "ACTIVE" },
        include: {
          outlet: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership || membership.tenant.status !== "ACTIVE") {
    return null;
  }

  // Parse permissions
  let permissions: string[] = [];
  if (membership.permissionsJson) {
    try {
      permissions = JSON.parse(membership.permissionsJson);
    } catch {
      permissions = [];
    }
  }

  // Collect authorized outlets: primary assigned outlet + any multi-outlet assignments
  const outletMap = new Map<string, { id: string; name: string; slug: string }>();

  // If role is OWNER or MANAGER without specific outlet restrictions, they have access to all tenant outlets
  if (membership.role === "OWNER" || (membership.role === "MANAGER" && !membership.outletId && membership.outletMembers.length === 0)) {
    const allOutlets = await prisma.outlet.findMany({
      where: { tenantId: membership.tenantId, status: "ACTIVE" },
      select: { id: true, name: true, slug: true },
    });
    for (const o of allOutlets) {
      outletMap.set(o.id, o);
    }
  } else {
    if (membership.outletId) {
      const primaryOutlet = await prisma.outlet.findUnique({
        where: { id: membership.outletId },
        select: { id: true, name: true, slug: true, status: true },
      });
      if (primaryOutlet && primaryOutlet.status === "ACTIVE") {
        outletMap.set(primaryOutlet.id, primaryOutlet);
      }
    }
    for (const om of membership.outletMembers) {
      if (om.outlet && om.outlet.status === "ACTIVE") {
        outletMap.set(om.outlet.id, om.outlet);
      }
    }
  }

  return {
    id: membership.id,
    userId: membership.userId,
    tenantId: membership.tenantId,
    role: membership.role,
    status: membership.status,
    outletId: membership.outletId,
    permissions,
    tenant: membership.tenant,
    staffProfile: membership.staffProfile,
    authorizedOutlets: Array.from(outletMap.values()),
  };
}

/**
 * 3. Returns array of authorized outlet IDs for the current membership.
 */
export async function getAuthorizedOutlets(membership: OrganizationMembership): Promise<string[]> {
  return membership.authorizedOutlets.map((o) => o.id);
}

/**
 * 4. Checks if current membership possesses a specific permission.
 */
export function hasPermission(
  membership: OrganizationMembership,
  permission: PermissionKey
): boolean {
  if (membership.status !== "ACTIVE") return false;
  return checkHasPermission(membership.role, membership.permissions, permission);
}

/**
 * 5. Requires specific permission; throws 403 error response or error if forbidden.
 */
export function requirePermission(
  membership: OrganizationMembership,
  permission: PermissionKey
): void {
  if (!hasPermission(membership, permission)) {
    const err: any = new Error(`Forbidden: missing required permission '${permission}'`);
    err.status = 403;
    throw err;
  }
}

/**
 * 6. Validates that the user has an active membership in the target organization.
 */
export async function requireOrganizationAccess(
  userId: string,
  tenantId: string
): Promise<OrganizationMembership> {
  const membership = await getOrganizationMembership(userId, tenantId);
  if (!membership || membership.tenantId !== tenantId) {
    const err: any = new Error("Forbidden: unauthorized organization access");
    err.status = 403;
    throw err;
  }
  return membership;
}

/**
 * 7. Validates that the user has authorized access to the requested outlet.
 */
export async function requireOutletAccess(
  membership: OrganizationMembership,
  outletId: string
): Promise<void> {
  if (!outletId) {
    const err: any = new Error("Bad Request: outletId is required");
    err.status = 400;
    throw err;
  }

  const authorized = membership.authorizedOutlets.some((o) => o.id === outletId);
  if (!authorized) {
    const err: any = new Error(`Forbidden: unauthorized outlet access for outlet '${outletId}'`);
    err.status = 403;
    throw err;
  }
}

/**
 * 8. Checks subscription entitlements for the organization.
 */
export async function checkSubscriptionEntitlement(
  tenantId: string
): Promise<Entitlements> {
  return getEntitlements(tenantId);
}

/**
 * Combined high-level server-side guard for Staff Route Handlers & Server Actions.
 */
export async function requireStaffContext(options?: {
  tenantId?: string | null;
  outletId?: string | null;
  permission?: PermissionKey;
  requireSubscription?: boolean;
}): Promise<{
  user: AuthenticatedUser;
  membership: OrganizationMembership;
  entitlements: Entitlements;
}> {
  const user = await getAuthenticatedUser();
  if (!user) {
    const err: any = new Error("Unauthorized: please sign in");
    err.status = 401;
    throw err;
  }

  const membership = await getOrganizationMembership(user.id, options?.tenantId);
  if (!membership) {
    const err: any = new Error("Forbidden: no active organization membership found");
    err.status = 403;
    throw err;
  }

  if (membership.status !== "ACTIVE") {
    const err: any = new Error(`Forbidden: your account is ${membership.status.toLowerCase()}`);
    err.status = 403;
    throw err;
  }

  if (options?.permission) {
    requirePermission(membership, options.permission);
  }

  if (options?.outletId) {
    await requireOutletAccess(membership, options.outletId);
  }

  const entitlements = await checkSubscriptionEntitlement(membership.tenantId);
  if (options?.requireSubscription && !entitlements.hasActiveSubscription) {
    const err: any = new Error("Payment Required: organization subscription is inactive or expired");
    err.status = 402;
    throw err;
  }

  return { user, membership, entitlements };
}
