import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!currentMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [memberships, outlets, pendingInvitations] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true } },
        outlet: { select: { id: true, name: true } },
        staffProfile: true,
        outletMembers: {
          include: { outlet: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.outlet.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.staffInvitation.findMany({
      where: { tenantId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { outlet: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    memberships,
    outlets,
    pendingInvitations,
    currentRole: currentMembership.role,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!currentMembership || (currentMembership.role !== "OWNER" && currentMembership.role !== "MANAGER" && currentMembership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Only owners or managers can add staff" }, { status: 403 });
  }

  const { email, name, role, outletId, outletIds, permissions, sendInvitation } = body;
  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // If sendInvitation requested, generate single-use invite token
  if (sendInvitation !== false) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.staffInvitation.create({
      data: {
        tenantId,
        email: normalizedEmail,
        fullName: name?.trim() || null,
        role: role.toUpperCase(),
        outletId: outletId || null,
        outletIdsJson: Array.isArray(outletIds) ? JSON.stringify(outletIds) : null,
        permissionsJson: Array.isArray(permissions) ? JSON.stringify(permissions) : null,
        tokenHash,
        invitedBy: userId,
        expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "STAFF_INVITATION_SENT",
        entity: "StaffInvitation",
        entityId: invitation.id,
        metadataJson: JSON.stringify({ email: normalizedEmail, role }),
      },
    });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "www.restronexpos.com";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const inviteUrl = `${proto}://${host}/staff/accept-invitation?token=${rawToken}`;

    return NextResponse.json({
      ok: true,
      invitation,
      inviteUrl,
      rawToken,
      message: `Invitation generated successfully for ${normalizedEmail}`,
    });
  }

  // Direct user provisioning fallback (for tests or manual administration)
  let targetUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: (name || normalizedEmail.split("@")[0]).trim(),
        role: role.toUpperCase(),
      },
    });
  }

  const existingMember = await prisma.membership.findFirst({
    where: { userId: targetUser.id, tenantId },
  });

  if (existingMember) {
    return NextResponse.json({ error: "This user is already a member of this organization" }, { status: 400 });
  }

  const newMembership = await prisma.membership.create({
    data: {
      userId: targetUser.id,
      tenantId,
      role: role.toUpperCase(),
      outletId: outletId || null,
      status: "ACTIVE",
      permissionsJson: Array.isArray(permissions) ? JSON.stringify(permissions) : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      outlet: { select: { id: true, name: true } },
    },
  });

  await prisma.staffProfile.create({
    data: {
      membershipId: newMembership.id,
      fullName: (name || targetUser.name).trim(),
      status: "ACTIVE",
    },
  });

  if (Array.isArray(outletIds)) {
    for (const oid of outletIds) {
      await prisma.outletMember.create({
        data: {
          membershipId: newMembership.id,
          outletId: oid,
          status: "ACTIVE",
        },
      }).catch(() => {});
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "STAFF_CREATED",
      entity: "Membership",
      entityId: newMembership.id,
      metadataJson: JSON.stringify({ email: normalizedEmail, name, role, outletId }),
    },
  });

  return NextResponse.json({ ok: true, membership: newMembership });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { membershipId, role, outletId, outletIds, status, permissions } = body;
  if (!membershipId) return NextResponse.json({ error: "membershipId required" }, { status: 400 });

  const targetMembership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });
  if (!targetMembership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId: targetMembership.tenantId },
  });
  if (!currentMembership || (currentMembership.role !== "OWNER" && currentMembership.role !== "MANAGER" && currentMembership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Insufficient permissions to update staff" }, { status: 403 });
  }

  // Prevent a non-owner from suspending or demoting an owner
  if (targetMembership.role === "OWNER" && currentMembership.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can modify owner accounts" }, { status: 403 });
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      ...(role ? { role: role.toUpperCase() } : {}),
      ...(status ? { status } : {}),
      ...(outletId !== undefined ? { outletId: outletId || null } : {}),
      ...(permissions !== undefined ? { permissionsJson: Array.isArray(permissions) ? JSON.stringify(permissions) : null } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      outlet: { select: { id: true, name: true } },
      staffProfile: true,
      outletMembers: { include: { outlet: true } },
    },
  });

  if (Array.isArray(outletIds)) {
    await prisma.outletMember.deleteMany({ where: { membershipId } });
    for (const oid of outletIds) {
      await prisma.outletMember.create({
        data: { membershipId, outletId: oid, status: "ACTIVE" },
      }).catch(() => {});
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId: targetMembership.tenantId,
      userId,
      action: status ? `STAFF_STATUS_${status}` : "STAFF_UPDATED",
      entity: "Membership",
      entityId: membershipId,
      metadataJson: JSON.stringify({ role, status, outletId }),
    },
  });

  return NextResponse.json({ ok: true, membership: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const membershipId = req.nextUrl.searchParams.get("membershipId");
  if (!membershipId) return NextResponse.json({ error: "membershipId required" }, { status: 400 });

  const targetMembership = await prisma.membership.findUnique({
    where: { id: membershipId },
  });
  if (!targetMembership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId: targetMembership.tenantId },
  });
  if (!currentMembership || currentMembership.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can remove staff members" }, { status: 403 });
  }

  if (targetMembership.userId === userId) {
    return NextResponse.json({ error: "You cannot remove your own primary owner account" }, { status: 400 });
  }

  await prisma.membership.delete({
    where: { id: membershipId },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: targetMembership.tenantId,
      userId,
      action: "STAFF_REMOVED",
      entity: "Membership",
      entityId: membershipId,
    },
  });

  return NextResponse.json({ ok: true, message: "Staff member removed successfully" });
}
