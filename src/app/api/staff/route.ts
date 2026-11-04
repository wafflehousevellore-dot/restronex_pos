import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!currentMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [memberships, outlets] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true } },
        outlet: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.outlet.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ memberships, outlets, currentRole: currentMembership.role });
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
  if (!currentMembership || (currentMembership.role !== "OWNER" && currentMembership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Only owners or head office can add staff" }, { status: 403 });
  }

  const { email, name, role, outletId } = body;
  if (!email || !name || !role) {
    return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
  }

  // Find or create user
  let targetUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: role,
      },
    });
  }

  // Check if already member of tenant
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
      role,
      outletId: outletId || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      outlet: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "STAFF_INVITED",
      entity: "Membership",
      entityId: newMembership.id,
      metadataJson: JSON.stringify({ email, name, role, outletId }),
    },
  });

  return NextResponse.json({ ok: true, membership: newMembership });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { membershipId, role, outletId } = body;
  if (!membershipId) return NextResponse.json({ error: "membershipId required" }, { status: 400 });

  const targetMembership = await prisma.membership.findUnique({
    where: { id: membershipId },
  });
  if (!targetMembership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId: targetMembership.tenantId },
  });
  if (!currentMembership || (currentMembership.role !== "OWNER" && currentMembership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Insufficient permissions to update staff" }, { status: 403 });
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      ...(role ? { role } : {}),
      ...(outletId !== undefined ? { outletId: outletId || null } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      outlet: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: targetMembership.tenantId,
      userId,
      action: "STAFF_UPDATED",
      entity: "Membership",
      entityId: membershipId,
      metadataJson: JSON.stringify({ role, outletId }),
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
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
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

  return NextResponse.json({ ok: true });
}
