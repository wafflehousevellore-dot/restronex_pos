import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { createSession } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, clerkUserId, email: bodyEmail } = body;

    let user = await getAuthenticatedUser();

    // Strategy 1: Clerk verifyToken from Authorization header
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!user && bearerToken) {
      try {
        const { verifyToken } = await import("@clerk/nextjs/server");
        const payload: any = await verifyToken(bearerToken, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        if (payload?.sub) {
          const clerkId = payload.sub;
          const userEmail = (payload.email || payload.primary_email || bodyEmail || "").toLowerCase();
          const userName = payload.name || (userEmail ? userEmail.split("@")[0] : "Staff Member");

          let dbUser = await prisma.user.findFirst({
            where: { OR: [{ clerkId }, ...(userEmail ? [{ email: userEmail }] : [])] },
          });
          if (dbUser) {
            if (!dbUser.clerkId) {
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: { clerkId, name: userName },
              });
            }
          } else {
            dbUser = await prisma.user.create({
              data: {
                clerkId,
                email: userEmail || `${clerkId}@clerk.local`,
                name: userName,
                role: "STAFF",
              },
            });
          }
          user = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            clerkUserId: clerkId,
            isPlatformAdmin: Boolean(dbUser.isPlatformAdmin),
          };
        }
      } catch (jwtErr) {
        console.warn("[Accept Invitation] verifyToken notice:", jwtErr);
      }
    }

    // Strategy 2: Authenticate via Clerk request state from Authorization header or cookies
    if (!user) {
      try {
        const client = await clerkClient();
        const reqState = await client.authenticateRequest(req);
        if (reqState.isSignedIn) {
          const authedClerkId = reqState.toAuth().userId;
          if (authedClerkId) {
            const clerkUser = await client.users.getUser(authedClerkId);
            const userEmail = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() || "";
            const userName = clerkUser.fullName || userEmail.split("@")[0] || "Staff Member";

            let dbUser = await prisma.user.findFirst({
              where: { OR: [{ clerkId: authedClerkId }, ...(userEmail ? [{ email: userEmail }] : [])] },
            });
            if (dbUser) {
              if (!dbUser.clerkId) {
                dbUser = await prisma.user.update({
                  where: { id: dbUser.id },
                  data: { clerkId: authedClerkId, name: userName },
                });
              }
            } else {
              dbUser = await prisma.user.create({
                data: {
                  clerkId: authedClerkId,
                  email: userEmail || `${authedClerkId}@clerk.local`,
                  name: userName,
                  role: "STAFF",
                },
              });
            }
            user = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              clerkUserId: authedClerkId,
              isPlatformAdmin: Boolean(dbUser.isPlatformAdmin),
            };
          }
        }
      } catch (authErr) {
        console.warn("[Accept Invitation] Clerk authenticateRequest notice:", authErr);
      }
    }

    // Strategy 3: Verify clerkUserId directly via Clerk API if provided by authenticated client
    if (!user && clerkUserId) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(clerkUserId);
        if (clerkUser) {
          const userEmail = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() || bodyEmail?.toLowerCase() || "";
          const userName = clerkUser.fullName || userEmail.split("@")[0] || "Staff Member";

          let dbUser = await prisma.user.findFirst({
            where: { OR: [{ clerkId: clerkUser.id }, ...(userEmail ? [{ email: userEmail }] : [])] },
          });
          if (dbUser) {
            if (!dbUser.clerkId) {
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: { clerkId: clerkUser.id, name: userName },
              });
            }
          } else {
            dbUser = await prisma.user.create({
              data: {
                clerkId: clerkUser.id,
                email: userEmail || `${clerkUser.id}@clerk.local`,
                name: userName,
                role: "STAFF",
              },
            });
          }
          user = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            clerkUserId: clerkUser.id,
            isPlatformAdmin: Boolean(dbUser.isPlatformAdmin),
          };
        }
      } catch (clerkErr) {
        console.warn("[Accept Invitation] Clerk direct user verification notice:", clerkErr);
      }
    }

    // Strategy 4: If clerkUserId and bodyEmail are provided and match a pending invitation or existing user
    if (!user && clerkUserId && bodyEmail) {
      const normalizedEmail = bodyEmail.toLowerCase().trim();
      let dbUser = await prisma.user.findFirst({
        where: { OR: [{ clerkId: clerkUserId }, { email: normalizedEmail }] },
      });
      if (dbUser) {
        if (!dbUser.clerkId) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { clerkId: clerkUserId },
          });
        }
      } else {
        dbUser = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            email: normalizedEmail,
            name: normalizedEmail.split("@")[0] || "Staff Member",
            role: "STAFF",
          },
        });
      }
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        clerkUserId,
        isPlatformAdmin: Boolean(dbUser.isPlatformAdmin),
      };
    }

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to your Clerk account before accepting an invitation" },
        { status: 401 }
      );
    }

    let invitation = null;
    if (token) {
      const tokenHash = hashToken(token.trim());
      invitation = await prisma.staffInvitation.findUnique({
        where: { tokenHash },
        include: {
          tenant: true,
          outlet: true,
        },
      });
    }

    // Fallback: If token is missing/stripped by Clerk redirect, find active pending invitation for this user
    if (!invitation && (user.email || bodyEmail)) {
      const targetEmail = (user.email || bodyEmail).toLowerCase().trim();
      invitation = await prisma.staffInvitation.findFirst({
        where: {
          email: targetEmail,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
        include: {
          tenant: true,
          outlet: true,
        },
      });
    }

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

    // Set active organization cookie & session
    const c = await cookies();
    c.set("restronex_org", invitation.tenantId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    try {
      await createSession({
        id: user.id,
        email: user.email,
        name: user.name,
        isPlatformAdmin: user.isPlatformAdmin,
      });
    } catch (sessionErr) {
      console.warn("[Accept Invitation] createSession notice:", sessionErr);
    }

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

