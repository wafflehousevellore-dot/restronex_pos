import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  logPlatformAdminAction,
  PRIMARY_PLATFORM_OWNER_EMAIL,
  requirePlatformOwnerApi,
} from "@/lib/platform-auth";

export async function GET() {
  const guard = await requirePlatformOwnerApi();
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
      memberships: {
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          outlet: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { action, membershipId, role } = body as {
      action?: "UPDATE_MEMBERSHIP_ROLE" | "REMOVE_MEMBERSHIP";
      membershipId?: string;
      role?: string;
    };

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

    // Never allow platform admin privilege assignment via membership or arbitrary user mutations
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
      },
    });

    return NextResponse.json({ ok: true, membership: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
