import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";
import {
  countRemainingBackupCodes,
  getPlatformMfaCookie,
  verifyPlatformMfaSessionToken,
} from "./platform-totp";

export const PRIMARY_PLATFORM_OWNER_EMAIL = "wafflehousevellore@gmail.com";

export type PlatformAuthFailureReason =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "EMAIL_UNVERIFIED"
  | "TOTP_REQUIRED"
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
      totpEnabled: boolean;
      clerkMfaEnrolled: boolean;
      totpEnrolledAt: string | null;
      totpLastVerifiedAt: string | null;
      remainingBackupCodes: number;
    }
  | {
      authorized: false;
      reason: PlatformAuthFailureReason;
      status: 401 | 403;
      message: string;
      userId?: string;
    };

export type PlatformOwnerIdentityResult =
  | {
      ok: true;
      dbUser: {
        id: string;
        email: string;
        name: string;
        role: string;
        isPlatformAdmin: boolean;
        clerkId: string;
      };
      clerkUserId: string;
      sessionId: string;
      clerkMfaEnrolled: boolean;
      factor1Age: number;
      factor2Age: number;
    }
  | {
      ok: false;
      reason: Exclude<PlatformAuthFailureReason, "TOTP_REQUIRED" | "MFA_REQUIRED" | "REVERIFICATION_REQUIRED">;
      status: 401 | 403;
      message: string;
      userId?: string;
    };

/**
 * Verifies primary Clerk authentication, verified owner email, and DB PLATFORM_OWNER privileges.
 */
export async function verifyPlatformOwnerClerkIdentity(): Promise<PlatformOwnerIdentityResult> {
  try {
    const { userId: clerkUserId, sessionId, factorVerificationAge } = await auth();
    if (!clerkUserId) {
      return {
        ok: false,
        reason: "UNAUTHENTICATED",
        status: 401,
        message: "Clerk authentication is required for Platform Admin access.",
      };
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return {
        ok: false,
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
        ok: false,
        reason: "FORBIDDEN",
        status: 403,
        message: "Forbidden: Restricted strictly to the verified RestroNex Platform Owner.",
        userId: dbUser?.id,
      };
    }

    if (!isEmailVerified) {
      return {
        ok: false,
        reason: "EMAIL_UNVERIFIED",
        status: 403,
        message: "Email verification in Clerk is required to access Platform Admin.",
        userId: dbUser.id,
      };
    }

    const factor1Age = Array.isArray(factorVerificationAge) ? factorVerificationAge[0] : -1;
    const factor2Age = Array.isArray(factorVerificationAge) ? factorVerificationAge[1] : -1;

    return {
      ok: true,
      dbUser: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        isPlatformAdmin: dbUser.isPlatformAdmin,
        clerkId: clerkUserId,
      },
      clerkUserId,
      sessionId: sessionId || "",
      clerkMfaEnrolled: Boolean(clerkUser.twoFactorEnabled),
      factor1Age,
      factor2Age,
    };
  } catch (err) {
    console.error("[platform-auth] identity check error:", err);
    return {
      ok: false,
      reason: "UNAUTHENTICATED",
      status: 401,
      message: "Authentication check failed.",
    };
  }
}

/**
 * Verifies Platform Owner authorization using Clerk session, verified primary email,
 * DB role === PLATFORM_OWNER & isPlatformAdmin === true, and free RestroNex TOTP / Clerk MFA state.
 */
export async function getPlatformOwnerSession(): Promise<PlatformOwnerAuthResult> {
  try {
    const idResult = await verifyPlatformOwnerClerkIdentity();
    if ("reason" in idResult) {
      return {
        authorized: false,
        reason: idResult.reason,
        status: idResult.status,
        message: idResult.message,
        userId: idResult.userId,
      };
    }

    const { dbUser, clerkUserId, sessionId, clerkMfaEnrolled, factor1Age, factor2Age } = idResult;

    const mfaCred = await prisma.platformMfaCredential.findUnique({
      where: { userId: dbUser.id },
    });

    const totpEnabled = Boolean(mfaCred?.enabled && mfaCred?.secretEnc);
    const mfaEnrolled = totpEnabled || clerkMfaEnrolled;

    if (totpEnabled) {
      const mfaCookie = await getPlatformMfaCookie();
      const totpVerified = verifyPlatformMfaSessionToken(mfaCookie, {
        userId: dbUser.id,
        clerkUserId,
        sessionId,
      });
      if (!totpVerified) {
        return {
          authorized: false,
          reason: "TOTP_REQUIRED",
          status: 403,
          message: "Enter the 6-digit code from your Authenticator App (or a backup recovery code) to unlock Platform Admin.",
          userId: dbUser.id,
        };
      }
    } else if (clerkMfaEnrolled) {
      const clerkMfaVerified = factor2Age >= 0 && factor2Age < 480;
      if (!clerkMfaVerified) {
        return {
          authorized: false,
          reason: "MFA_REQUIRED",
          status: 403,
          message: "Multi-Factor Authentication (2FA) verification is required for Platform Admin.",
          userId: dbUser.id,
        };
      }
    } else if (factor1Age < 0 || factor1Age > 480) {
      // Before TOTP 2FA is enrolled, require a fresh Clerk first-factor verification (password / email OTP)
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
      user: dbUser,
      mfaEnrolled,
      mfaVerifiedInSession: totpEnabled || clerkMfaEnrolled,
      totpEnabled,
      clerkMfaEnrolled,
      totpEnrolledAt: mfaCred?.enrolledAt?.toISOString() ?? null,
      totpLastVerifiedAt: mfaCred?.lastVerifiedAt?.toISOString() ?? null,
      remainingBackupCodes: countRemainingBackupCodes(mfaCred?.backupCodesHashJson),
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
