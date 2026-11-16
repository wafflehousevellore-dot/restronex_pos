import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { cookies } from "next/headers";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to your Clerk account before accepting an invitation" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: "Invitation token required" }, { status: 400 });
    }

    const tokenHash = hashToken(token.trim());

    const invitation = await prisma.staffInvitation.findUnique({
      where: { tokenHash },
      include: {
        tenant: true,
        outlet: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token or link not found" },
        { status: 404 }
      );
    }

    if (invitation.revokedAt) {
      return NextResponse.json(
        { error: "This invitation was revoked by the restaurant administrator" },
        { status: 410 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 409 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation has expired. Please ask your administrator to send a new invite." },
        { status: 410 }
      );
    }

    // Execute atomic transaction to accept invitation and link membership
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert membership
      const membership = await tx.membership.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: invitation.tenantId,
          },
        },
        create: {
          userId: user.id,
          tenantId: invitation.tenantId,
          role: invitation.role,
          outletId: invitation.outletId,
          status: "ACTIVE",
          permissionsJson: invitation.permissionsJson,
        },
        update: {
          role: invitation.role,
          outletId: invitation.outletId,
          status: "ACTIVE",
          permissionsJson: invitation.permissionsJson,
        },
      });

      // 2. Upsert StaffProfile
      await tx.staffProfile.upsert({
        where: { membershipId: membership.id },
        create: {
          membershipId: membership.id,
          fullName: invitation.fullName || user.name || "Staff Member",
          phone: invitation.phone || null,
          status: "ACTIVE",
        },
        update: {
          fullName: invitation.fullName || user.name || undefined,
          phone: invitation.phone || undefined,
          status: "ACTIVE",
        },
      });

      // 3. Multi-outlet assignments
      if (invitation.outletIdsJson) {
        try {
          const outletIds: string[] = JSON.parse(invitation.outletIdsJson);
          for (const oid of outletIds) {
            await tx.outletMember.upsert({
              where: {
                membershipId_outletId: {
                  membershipId: membership.id,
                  outletId: oid,
                },
              },
              create: {
                membershipId: membership.id,
                outletId: oid,
                status: "ACTIVE",
              },
              update: { status: "ACTIVE" },
            });
          }
        } catch {
          // ignore parse error
        }
      }

      // 4. Mark invitation accepted
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          userId: user.id,
          action: "STAFF_INVITATION_ACCEPTED",
          entity: "StaffInvitation",
          entityId: invitation.id,
          metadataJson: JSON.stringify({
            acceptedByUserId: user.id,
            acceptedByEmail: user.email,
            role: invitation.role,
            tenantName: invitation.tenant.name,
          }),
        },
      });

      return membership;
    });

    // Set active organization cookie
    const c = await cookies();
    c.set("restronex_org", invitation.tenantId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    let redirectTo = "/staff/dashboard";
    const role = invitation.role.toUpperCase();
    if (role === "CASHIER") redirectTo = "/staff/pos";
    else if (role === "KITCHEN_STAFF") redirectTo = "/staff/kitchen";
    else if (role === "WAITER") redirectTo = "/staff/tables";
    else if (role === "INVENTORY_MANAGER") redirectTo = "/staff/inventory";

    return NextResponse.json({
      ok: true,
      membershipId: result.id,
      tenantName: invitation.tenant.name,
      role: invitation.role,
      redirectTo,
      message: `Welcome to ${invitation.tenant.name}! Your staff workspace is active.`,
    });
  } catch (err: any) {
    console.error("[POST /api/staff/invitations/accept] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to accept staff invitation" },
      { status: 500 }
    );
  }
}

