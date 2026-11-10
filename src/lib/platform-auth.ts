import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export const PRIMARY_PLATFORM_OWNER_EMAIL = "wafflehousevellore@gmail.com";

export type PlatformAuthFailureReason =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "EMAIL_UNVERIFIED"
  | "MFA_REQUIRED"
  | "REVERIFICATION_REQUIRED";

export type PlatformOwnerAuthResult =
  | {
      authorized: true;
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        isPlatformAdmin: boolean;
        clerkId: string;
      };
      mfaEnrolled: boolean;
      mfaVerifiedInSession: boolean;
    }
  | {
      authorized: false;
      reason: PlatformAuthFailureReason;
      status: 401 | 403;
      message: string;
      userId?: string;
    };

/**
 * Verifies Platform Owner authorization using Clerk session, verified primary email,
 * DB role === PLATFORM_OWNER & isPlatformAdmin === true, and MFA / reverification state.
 */
export async function getPlatformOwnerSession(): Promise<PlatformOwnerAuthResult> {
  try {
    const { userId: clerkUserId, factorVerificationAge } = await auth();
    if (!clerkUserId) {
      return {
        authorized: false,
        reason: "UNAUTHENTICATED",
        status: 401,
        message: "Clerk authentication is required for Platform Admin access.",
      };
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return {
        authorized: false,
        reason: "UNAUTHENTICATED",
        status: 401,
        message: "Active Clerk session not found.",
      };
    }

    const primaryEmailObj =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ||
      clerkUser.emailAddresses[0];
    const verifiedEmail = primaryEmailObj?.emailAddress?.toLowerCase() || "";
    const isEmailVerified = primaryEmailObj?.verification?.status === "verified";

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (
      !dbUser ||
      !dbUser.isPlatformAdmin ||
      dbUser.role !== "PLATFORM_OWNER" ||
      dbUser.email.toLowerCase() !== PRIMARY_PLATFORM_OWNER_EMAIL ||
      verifiedEmail !== PRIMARY_PLATFORM_OWNER_EMAIL
    ) {
      if (dbUser) {
        await prisma.auditLog
          .create({
            data: {
              userId: dbUser.id,
              action: "UNAUTHORIZED_PLATFORM_ACCESS_ATTEMPT",
              entity: "PlatformAdmin",
              entityId: dbUser.id,
              metadataJson: JSON.stringify({
                attemptedEmail: verifiedEmail || dbUser.email,
                clerkUserId,
                timestamp: new Date().toISOString(),
              }),
            },
          })
          .catch(() => {});
      }

      return {
        authorized: false,
        reason: "FORBIDDEN",
        status: 403,
        message: "Forbidden: Restricted strictly to the verified RestroNex Platform Owner.",
        userId: dbUser?.id,
      };
    }

    if (!isEmailVerified) {
      return {
        authorized: false,
        reason: "EMAIL_UNVERIFIED",
        status: 403,
        message: "Email verification in Clerk is required to access Platform Admin.",
        userId: dbUser.id,
      };
    }

    const mfaEnrolled = Boolean(clerkUser.twoFactorEnabled);
    const factor1Age = Array.isArray(factorVerificationAge) ? factorVerificationAge[0] : -1;
    const factor2Age = Array.isArray(factorVerificationAge) ? factorVerificationAge[1] : -1;
    const mfaVerifiedInSession = mfaEnrolled && factor2Age >= 0 && factor2Age < 480;

    if (mfaEnrolled && !mfaVerifiedInSession) {
      return {
        authorized: false,
        reason: "MFA_REQUIRED",
        status: 403,
        message: "Multi-Factor Authentication (2FA) verification is required for Platform Admin.",
        userId: dbUser.id,
      };
    }

    // Even before Clerk TOTP MFA is toggled on in Clerk Dashboard, require an active recent Clerk verification factor
    if (!mfaEnrolled && (factor1Age < 0 || factor1Age > 480)) {
      return {
        authorized: false,
        reason: "REVERIFICATION_REQUIRED",
        status: 403,
        message: "Fresh Clerk identity verification is required for Platform Admin.",
        userId: dbUser.id,
      };
    }

    return {
      authorized: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        isPlatformAdmin: dbUser.isPlatformAdmin,
        clerkId: clerkUserId,
      },
      mfaEnrolled,
      mfaVerifiedInSession,
    };
  } catch (err) {
    console.error("[platform-auth] verification error:", err);
    return {
      authorized: false,
      reason: "UNAUTHENTICATED",
      status: 401,
      message: "Authentication check failed.",
    };
  }
}

/**
 * Helper for /api/platform/* and sensitive platform admin API routes.
 */
export async function requirePlatformOwnerApi() {
  const result = await getPlatformOwnerSession();
  if (!result.authorized && "reason" in result) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: result.message, code: result.reason },
        { status: result.status }
      ),
    };
  }
  if (!("user" in result)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Authentication required", code: "UNAUTHENTICATED" },
        { status: 401 }
      ),
    };
  }
  return {
    ok: true as const,
    auth: result,
  };
}

/**
 * Records sensitive Platform Owner administrative operations in immutable AuditLog.
 */
export async function logPlatformAdminAction(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        metadataJson: JSON.stringify({
          ...(params.metadata || {}),
          actorRole: "PLATFORM_OWNER",
          recordedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (err) {
    console.error("[platform-auth] Failed to record audit log:", err);
  }
}
