export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Link from "next/link";
import { AlertCircle, LogIn, ArrowRight } from "lucide-react";

export default async function StaffAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  try {
    const sp = (await searchParams) || {};
    let user = await getAuthenticatedUser();

    // 1. Clerk session fallback if local session cookie is not yet initialized
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

    // 2. Persist local JWT session cookie for all downstream staff pages
    try {
      await createSession({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isPlatformAdmin: user.isPlatformAdmin,
      });
    } catch (sessionErr) {
      console.warn("[Staff Auth Callback] Session token warning:", sessionErr);
    }

    const c = await cookies();
    const selectedOrgParam = sp?.org || c.get("restronex_org")?.value;

    // 3. Fetch all active memberships for this authenticated user
    let allActiveMemberships = await prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        tenant: { select: { id: true, name: true, slug: true, clerkOrgId: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 4. If no active memberships found by userId, check by user email to link pre-created invitations
    if (allActiveMemberships.length === 0 && user.email) {
      const normalizedEmail = user.email.toLowerCase();
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
        if (emailMembership.userId !== user.id) {
          const existingForUser = await prisma.membership.findUnique({
            where: {
              userId_tenantId: { userId: user.id, tenantId: emailMembership.tenantId },
            },
          }).catch(() => null);

          if (!existingForUser) {
            await prisma.membership.update({
              where: { id: emailMembership.id },
              data: { userId: user.id },
            }).catch(() => null);
          }
        }
        allActiveMemberships = [emailMembership];
      }
    }

    // 5. Handle zero active memberships
    if (allActiveMemberships.length === 0) {
      // Check if user is an OWNER / PLATFORM_ADMIN or has an OWNER membership -> route to owner app
      const ownerMembership = await prisma.membership.findFirst({
        where: { userId: user.id, role: "OWNER" },
      });
      if (ownerMembership || user.isPlatformAdmin) {
        redirect("/app/auth-callback");
      }

      // Check if user has an unaccepted pending invitation
      if (user.email) {
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
      }

      redirect("/staff/login?error=no_membership");
    }

    // 6. Handle multiple active memberships (require explicit selection if none selected in URL)
    if (allActiveMemberships.length > 1 && !sp?.org) {
      redirect("/staff/choose-organization");
    }

    // 7. Resolve the target membership: explicitly selected org param -> cookie -> single active membership
    const targetMembership =
      (selectedOrgParam
        ? allActiveMemberships.find((m) => m.tenantId === selectedOrgParam)
        : null) || allActiveMemberships[0];

    if (!targetMembership) {
      redirect("/staff/choose-organization");
    }

    if (
      targetMembership.status !== "ACTIVE" ||
      (targetMembership.tenant && targetMembership.tenant.status !== "ACTIVE")
    ) {
      redirect("/staff/login?error=suspended");
    }

    // 8. Safely set active organization cookie
    try {
      c.set("restronex_org", targetMembership.tenantId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } catch {
      // non-blocking
    }

    // 9. Retroactive synchronization with Clerk Organization (safe, non-blocking)
    if (targetMembership.tenant?.clerkOrgId && user.clerkUserId) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
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

    // 10. Role-based immediate landing station routing
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
      destination = sp?.next || "/staff/dashboard";
    }

    // 11. Respect safe next redirect parameter
    const nextParam = sp?.next;
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
  } catch (error: any) {
    // If Next.js redirect exception, allow normal navigation
    if (
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.message === "NEXT_REDIRECT"
    ) {
      throw error;
    }

    console.error("[Staff Auth Callback Error]", error);

    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#E3EBE6] shadow-xl shadow-black/5 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#0F1E19]">Authentication Verification Notice</h2>
          <p className="text-sm text-[#4A5D55] mt-2">
            We encountered a temporary session synchronization delay while verifying your staff access.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/staff/login"
              className="inline-flex items-center justify-center gap-2 bg-[#16845B] hover:bg-[#126B49] text-white font-semibold py-2.5 px-4 rounded-xl transition text-sm shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              Return to Staff Login
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 bg-[#E8F5EE] hover:bg-[#D5EFE2] text-[#16845B] font-semibold py-2.5 px-4 rounded-xl transition text-sm"
            >
              Go to Owner Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
