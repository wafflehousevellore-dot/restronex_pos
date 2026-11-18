import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  logPlatformAdminAction,
  PRIMARY_PLATFORM_OWNER_EMAIL,
  requirePlatformPermissionApi,
} from "@/lib/platform-auth";
import { ALL_PLATFORM_ROLES, PlatformRole } from "@/lib/platform-roles";

export async function GET() {
  const guard = await requirePlatformPermissionApi("platform.admins.manage");
  if (!guard.ok) return guard.response;

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
      updatedAt: true,
      platformMfa: {
        select: {
          enabled: true,
          enrolledAt: true,
          lastVerifiedAt: true,
        },
      },
      memberships: {
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          outlet: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ users, availableRoles: ALL_PLATFORM_ROLES });
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.admins.manage");
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { action, userId, role, isPlatformAdmin, membershipId, reason } = body as {
      action?: "UPDATE_PLATFORM_USER" | "UPDATE_MEMBERSHIP_ROLE" | "REMOVE_MEMBERSHIP";
      userId?: string;
      role?: string;
      isPlatformAdmin?: boolean;
      membershipId?: string;
      reason?: string;
    };

    // Platform user role update
    if (action === "UPDATE_PLATFORM_USER") {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // Protect primary owner
      if (
        targetUser.email.toLowerCase() === PRIMARY_PLATFORM_OWNER_EMAIL &&
        (isPlatformAdmin === false || role !== "PLATFORM_OWNER")
      ) {
        return NextResponse.json(
          { error: "Cannot revoke or change primary Platform Owner status." },
          { status: 400 }
        );
      }

      if (role && !ALL_PLATFORM_ROLES.includes(role as PlatformRole)) {
        return NextResponse.json({ error: "Invalid platform role" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(role ? { role } : {}),
          ...(typeof isPlatformAdmin === "boolean" ? { isPlatformAdmin } : {}),
        },
      });

      await logPlatformAdminAction({
        userId: guard.auth.user.id,
        action: "PLATFORM_ADMIN_ROLE_UPDATED",
        entity: "User",
        entityId: userId,
        metadata: {
          targetEmail: targetUser.email,
          previousRole: targetUser.role,
          newRole: updated.role,
          previousAdminStatus: targetUser.isPlatformAdmin,
          newAdminStatus: updated.isPlatformAdmin,
          reason: reason || "Administrative staff assignment",
        },
      });

      return NextResponse.json({ ok: true, user: updated });
    }

    // Tenant membership update
    if (!membershipId) {
      return NextResponse.json({ error: "membershipId required" }, { status: 400 });
    }

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { user: true, tenant: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    const allowedTenantRoles = ["OWNER", "HEAD_OFFICE", "OUTLET_MANAGER", "CASHIER", "WAITER", "KITCHEN_STAFF"];

    if (action === "REMOVE_MEMBERSHIP") {
      if (membership.user.email.toLowerCase() === PRIMARY_PLATFORM_OWNER_EMAIL && membership.role === "OWNER") {
        return NextResponse.json(
          { error: "Cannot remove primary owner membership from platform control." },
          { status: 400 }
        );
      }

      await prisma.membership.delete({ where: { id: membershipId } });
      await logPlatformAdminAction({
        userId: guard.auth.user.id,
        tenantId: membership.tenantId,
        action: "PLATFORM_MEMBERSHIP_REMOVED",
        entity: "Membership",
        entityId: membershipId,
        metadata: {
          targetUserEmail: membership.user.email,
          tenantName: membership.tenant.name,
          previousRole: membership.role,
          reason: reason || "Administrative cleanup",
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (!role || !allowedTenantRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid organization role" }, { status: 400 });
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { role },
    });

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      tenantId: membership.tenantId,
      action: "PLATFORM_USER_MEMBERSHIP_UPDATED",
      entity: "Membership",
      entityId: membershipId,
      metadata: {
        targetUserEmail: membership.user.email,
        tenantName: membership.tenant.name,
        previousRole: membership.role,
        newRole: updated.role,
        reason: reason || "Administrative role change",
      },
    });

    return NextResponse.json({ ok: true, membership: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
