export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production-32chars!!";
const COOKIE_NAME = "restronex_session";
const ORG_COOKIE = "restronex_org";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const selectedOrgParam = searchParams.get("org") || req.cookies.get(ORG_COOKIE)?.value;
    const nextParam = searchParams.get("next");

    let userId: string | null = null;
    let userEmail: string = "";
    let userName: string = "";
    let isPlatformAdmin = false;
    let clerkUserId: string | null = null;

    // 1. Authenticate via Clerk first
    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const { userId: clerkId } = await auth();
      if (clerkId) {
        clerkUserId = clerkId;
        const clerkUser = await currentUser();
        const email =
          clerkUser?.emailAddresses?.[0]?.emailAddress ||
          clerkUser?.primaryEmailAddress?.emailAddress ||
          "";
        const name = clerkUser?.fullName || (email ? email.split("@")[0] : "Staff Member");
        const normalizedEmail = email ? email.toLowerCase() : "";

        let dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { clerkId: clerkUserId },
              ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ],
          },
        });

        if (!dbUser && normalizedEmail) {
          dbUser = await prisma.user.create({
            data: {
              clerkId: clerkUserId,
              email: normalizedEmail,
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
          userId = dbUser.id;
          userEmail = dbUser.email;
          userName = dbUser.name;
          isPlatformAdmin = Boolean(dbUser.isPlatformAdmin);
        }
      }
    } catch (clerkErr) {
      console.warn("[Staff Auth Callback] Clerk lookup:", clerkErr);
    }

    // 2. JWT fallback if no Clerk user
    if (!userId) {
      const existingToken = req.cookies.get(COOKIE_NAME)?.value;
      if (existingToken) {
        try {
          const decoded = jwt.verify(existingToken, JWT_SECRET) as any;
          if (decoded?.sub) {
            const dbUser = await prisma.user.findUnique({ where: { id: decoded.sub } });
            if (dbUser) {
              userId = dbUser.id;
              userEmail = dbUser.email;
              userName = dbUser.name;
              isPlatformAdmin = Boolean(dbUser.isPlatformAdmin);
            }
          }
        } catch {}
      }
    }

    // If still unauthenticated, redirect to staff login
    if (!userId) {
      const loginUrl = new URL("/staff/login", req.url);
      if (nextParam) loginUrl.searchParams.set("next", nextParam);
      return NextResponse.redirect(loginUrl);
    }

    // 3. Fetch all active memberships for this authenticated user
    let allActiveMemberships = await prisma.membership.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        tenant: { select: { id: true, name: true, slug: true, clerkOrgId: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 4. If no active memberships found by userId, check by user email to link pre-created invitations
    if (allActiveMemberships.length === 0 && userEmail) {
      const normalizedEmail = userEmail.toLowerCase();
      const emailMembership = await prisma.membership.findFirst({
        where: {
          user: { email: normalizedEmail },
          status: "ACTIVE",
        },
        include: {
          tenant: { select: { id: true, name: true, slug: true, clerkOrgId: true, status: true } },
        },
      });

      if (emailMembership) {
        if (emailMembership.userId !== userId) {
          const existingForUser = await prisma.membership.findUnique({
            where: {
              userId_tenantId: { userId, tenantId: emailMembership.tenantId },
            },
          }).catch(() => null);

          if (!existingForUser) {
            await prisma.membership.update({
              where: { id: emailMembership.id },
              data: { userId },
            }).catch(() => null);
          }
        }
        allActiveMemberships = [emailMembership];
      }
    }

    // 5. Handle zero active memberships
    if (allActiveMemberships.length === 0) {
      const ownerMembership = await prisma.membership.findFirst({
        where: { userId, role: "OWNER" },
      });
      if (ownerMembership || isPlatformAdmin) {
        return NextResponse.redirect(new URL("/app/auth-callback", req.url));
      }

      if (userEmail) {
        const pendingInvite = await prisma.staffInvitation.findFirst({
          where: {
            email: userEmail.toLowerCase(),
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });
        if (pendingInvite) {
          return NextResponse.redirect(new URL(`/staff/accept-invitation?token=${pendingInvite.rawToken || ""}`, req.url));
        }
      }

      return NextResponse.redirect(new URL("/staff/login?error=no_membership", req.url));
    }

    // 6. Handle multiple active memberships
    if (allActiveMemberships.length > 1 && !searchParams.get("org")) {
      return NextResponse.redirect(new URL("/staff/choose-organization", req.url));
    }

    // 7. Resolve target membership
    const targetMembership =
      (selectedOrgParam
        ? allActiveMemberships.find((m) => m.tenantId === selectedOrgParam)
        : null) || allActiveMemberships[0];

    if (!targetMembership) {
      return NextResponse.redirect(new URL("/staff/choose-organization", req.url));
    }

    if (
      targetMembership.status !== "ACTIVE" ||
      (targetMembership.tenant && targetMembership.tenant.status !== "ACTIVE")
    ) {
      return NextResponse.redirect(new URL("/staff/login?error=suspended", req.url));
    }

    // 8. Role-based immediate landing station routing
    const role = (targetMembership.role || "").toUpperCase();
    let destination = "/staff/dashboard";
    if (role === "CASHIER") {
      destination = "/staff/pos";
    } else if (role === "KITCHEN_STAFF" || role === "KITCHEN") {
      destination = "/staff/kitchen";
    } else if (role === "WAITER") {
      destination = "/staff/tables";
    } else if (role === "INVENTORY_MANAGER" || role === "INVENTORY") {
      destination = "/staff/inventory";
    } else if (role === "OWNER" || role === "PLATFORM_OWNER") {
      destination = nextParam || "/staff/dashboard";
    }

    if (
      nextParam &&
      nextParam.startsWith("/staff") &&
      nextParam !== "/staff/login" &&
      nextParam !== "/staff/auth-callback" &&
      nextParam !== "/staff/choose-organization"
    ) {
      destination = nextParam;
    }

    // 9. Retroactive Clerk Org link (safe, non-blocking)
    if (targetMembership.tenant?.clerkOrgId && clerkUserId) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        await client.organizations.createOrganizationMembership({
          organizationId: targetMembership.tenant.clerkOrgId,
          userId: clerkUserId,
          role: "org:member",
        }).catch(() => null);
      } catch {}
    }

    // 10. Generate JWT session token
    const token = jwt.sign(
      { sub: userId, email: userEmail, name: userName, isPlatformAdmin },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 11. Create response and safely set both session and org cookies
    const redirectUrl = new URL(destination, req.url);
    const res = NextResponse.redirect(redirectUrl);

    const isSecure = process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https";

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set(ORG_COOKIE, targetMembership.tenantId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: isSecure,
    });

    return res;
  } catch (error) {
    console.error("[Staff Auth Callback Error]", error);
    return NextResponse.redirect(new URL("/staff/login?error=sync_delay", req.url));
  }
}
