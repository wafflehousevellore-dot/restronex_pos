import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireStaffContext } from "@/lib/server-auth";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Hash a plain invitation token using SHA-256 for secure database storage.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * GET /api/staff/invitations?token=... or ?email=...
 * Validates an invitation token or retrieves active pending invitation for an authenticated email.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const email = req.nextUrl.searchParams.get("email");

  if (!token && !email) {
    return NextResponse.json({ error: "Invitation token or email required" }, { status: 400 });
  }

  let invitation = null;
  if (token) {
    const tokenHash = hashToken(token.trim());
    invitation = await prisma.staffInvitation.findUnique({
      where: { tokenHash },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        outlet: { select: { id: true, name: true } },
      },
    });
  } else if (email) {
    invitation = await prisma.staffInvitation.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        outlet: { select: { id: true, name: true } },
      },
    });
  }

  if (!invitation) {
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await prisma.user.findFirst({
        where: { email: normalizedEmail },
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
          },
        },
      });

      if (existingUser && existingUser.memberships.length > 0) {
        const m = existingUser.memberships[0];
        return NextResponse.json({
          valid: true,
          alreadyMember: true,
          tenantName: m.tenant.name,
          role: m.role,
          redirectTo: "/staff/auth-callback",
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid invitation token or link not found" },
      { status: 404 }
    );
  }

  if (invitation.revokedAt) {
    return NextResponse.json(
      { error: "This invitation has been revoked by the restaurant owner" },
      { status: 410 }
    );
  }

  if (invitation.acceptedAt) {
    const activeMembership = await prisma.membership.findFirst({
      where: {
        tenantId: invitation.tenantId,
        user: { email: invitation.email.toLowerCase().trim() },
        status: "ACTIVE",
      },
    });

    if (activeMembership) {
      return NextResponse.json({
        valid: true,
        alreadyMember: true,
        tenantName: invitation.tenant.name,
        role: activeMembership.role,
        redirectTo: "/staff/auth-callback",
      });
    }

    return NextResponse.json(
      { error: "This invitation has already been accepted" },
      { status: 409 }
    );
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json(
      { error: "This invitation has expired. Please ask your manager for a new invite." },
      { status: 410 }
    );
  }

  const outletNames: string[] = [];
  if (invitation.outlet) {
    outletNames.push(invitation.outlet.name);
  }
  if (invitation.outletIdsJson) {
    try {
      const ids: string[] = JSON.parse(invitation.outletIdsJson);
      const extraOutlets = await prisma.outlet.findMany({
        where: { id: { in: ids } },
        select: { name: true },
      });
      for (const o of extraOutlets) {
        if (!outletNames.includes(o.name)) outletNames.push(o.name);
      }
    } catch {
      // ignore parse err
    }
  }

  return NextResponse.json({
    valid: true,
    token: invitation.rawToken || token || null,
    email: invitation.email,
    fullName: invitation.fullName,
    role: invitation.role,
    tenantName: invitation.tenant.name,
    tenantSlug: invitation.tenant.slug,
    tenantLogoUrl: invitation.tenant.logoUrl,
    outlets: outletNames,
    expiresAt: invitation.expiresAt,
  });
}

/**
 * POST /api/staff/invitations
 * Creates and dispatches a secure single-use staff invitation or resends an existing one.
 * Requires 'staff.invite' permission.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = req.nextUrl.searchParams.get("action") || body.action;

    // Require staff.invite permission
    const { user, membership } = await requireStaffContext({
      permission: "staff.invite",
    });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "www.restronexpos.com";
    const proto = req.headers.get("x-forwarded-proto") || "https";

    // Handle RESEND action
    if (action === "resend") {
      const invitationId = body.id || req.nextUrl.searchParams.get("id");
      if (!invitationId) {
        return NextResponse.json({ error: "Invitation ID required to resend" }, { status: 400 });
      }

      const inv = await prisma.staffInvitation.findFirst({
        where: { id: invitationId, tenantId: membership.tenantId, acceptedAt: null, revokedAt: null },
      });

      if (!inv) {
        return NextResponse.json({ error: "Active invitation not found" }, { status: 404 });
      }

      // Generate a fresh raw token if none exists
      let tokenToUse = inv.rawToken;
      if (!tokenToUse) {
        tokenToUse = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(tokenToUse);
        await prisma.staffInvitation.update({
          where: { id: inv.id },
          data: { rawToken: tokenToUse, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });
      }

      const inviteUrl = `${proto}://${host}/staff/accept-invitation/${tokenToUse}`;

      let emailSent = false;
      try {
        const client = await clerkClient();
        await client.invitations.createInvitation({
          emailAddress: inv.email,
          redirectUrl: inviteUrl,
          ignoreExisting: true,
        });
        emailSent = true;
      } catch (clerkErr: any) {
        console.warn("[POST /api/staff/invitations/resend] Clerk notice:", clerkErr?.errors || clerkErr?.message);
      }

      if (membership.tenant.clerkOrgId) {
        try {
          const client = await clerkClient();
          await client.organizations.createOrganizationInvitation({
            organizationId: membership.tenant.clerkOrgId,
            emailAddress: inv.email,
            role: "org:member",
            redirectUrl: inviteUrl,
          });
        } catch (orgInvErr: any) {
          console.warn("[POST /api/staff/invitations/resend] Clerk org invitation notice:", orgInvErr?.errors || orgInvErr?.message);
        }
      }

      return NextResponse.json({
        ok: true,
        emailSent,
        inviteUrl,
        message: emailSent
          ? `Invitation email successfully resent to ${inv.email}`
          : `Invitation link regenerated for ${inv.email}`,
      });
    }

    const { email, fullName, phone, role, outletId, outletIds, permissions } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and staff role are required" },
        { status: 400 }
      );
    }

    // Managers cannot grant OWNER role
    if (role.toUpperCase() === "OWNER" && membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the primary owner can assign the Owner role" },
        { status: 403 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate single-use unguessable cryptographically random token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    // 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.staffInvitation.create({
      data: {
        tenantId: membership.tenantId,
        email: normalizedEmail,
        fullName: fullName?.trim() || null,
        phone: phone?.trim() || null,
        role: role.toUpperCase(),
        outletId: outletId || null,
        outletIdsJson: Array.isArray(outletIds) ? JSON.stringify(outletIds) : null,
        permissionsJson: Array.isArray(permissions) ? JSON.stringify(permissions) : null,
        tokenHash,
        rawToken,
        invitedBy: user.id,
        expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: user.id,
        action: "STAFF_INVITATION_SENT",
        entity: "StaffInvitation",
        entityId: invitation.id,
        metadataJson: JSON.stringify({
          recipientEmail: normalizedEmail,
          role,
          invitedBy: user.email,
        }),
      },
    });

    const inviteUrl = `${proto}://${host}/staff/accept-invitation/${rawToken}`;

    // Dispatch official email invitation via Clerk
    let emailSent = false;
    try {
      const client = await clerkClient();
      await client.invitations.createInvitation({
        emailAddress: normalizedEmail,
        redirectUrl: inviteUrl,
        ignoreExisting: true,
      });
      emailSent = true;
    } catch (clerkErr: any) {
      console.warn("[POST /api/staff/invitations] Clerk email dispatch notice:", clerkErr?.errors || clerkErr?.message);
    }

    if (membership.tenant.clerkOrgId) {
      try {
        const client = await clerkClient();
        await client.organizations.createOrganizationInvitation({
          organizationId: membership.tenant.clerkOrgId,
          emailAddress: normalizedEmail,
          role: "org:member",
          redirectUrl: inviteUrl,
        });
      } catch (orgInvErr: any) {
        console.warn("[POST /api/staff/invitations] Clerk org invitation notice:", orgInvErr?.errors || orgInvErr?.message);
      }
    }

    return NextResponse.json({
      ok: true,
      invitationId: invitation.id,
      inviteUrl,
      rawToken,
      emailSent,
      expiresAt,
      message: emailSent
        ? `Invitation email successfully sent to ${normalizedEmail}`
        : `Invitation generated successfully for ${normalizedEmail}`,
    });
  } catch (err: any) {
    console.error("[POST /api/staff/invitations] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create staff invitation" },
      { status: err.status || 500 }
    );
  }
}

/**
 * DELETE /api/staff/invitations?id=...
 * Revokes an existing invitation.
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
    }

    const { user, membership } = await requireStaffContext({
      permission: "staff.manage",
    });

    const invitation = await prisma.staffInvitation.findFirst({
      where: { id, tenantId: membership.tenantId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    await prisma.staffInvitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: user.id,
        action: "STAFF_INVITATION_REVOKED",
        entity: "StaffInvitation",
        entityId: id,
        metadataJson: JSON.stringify({ email: invitation.email, role: invitation.role }),
      },
    });

    return NextResponse.json({ ok: true, message: "Invitation revoked successfully" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to revoke invitation" },
      { status: err.status || 500 }
    );
  }
}
