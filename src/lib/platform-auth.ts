import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";
import {
  countRemainingBackupCodes,
  getPlatformMfaCookie,
  verifyPlatformMfaSessionToken,
} from "./platform-totp";
import {
  ALL_PLATFORM_ROLES,
  hasPlatformPermission,
  PlatformPermission,
  PlatformRole,
} from "./platform-roles";

export const PRIMARY_PLATFORM_OWNER_EMAIL = "wafflehousevellore@gmail.com";

export type PlatformAuthFailureReason =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "EMAIL_UNVERIFIED"
  | "TOTP_REQUIRED"
  | "MFA_REQUIRED"
  | "REVERIFICATION_REQUIRED";

export interface PlatformAdminUser {
  id: string;
  email: string;
  name: string;
  role: PlatformRole;
  isPlatformAdmin: boolean;
  clerkId: string;
}

export type PlatformOwnerAuthResult =
  | {
      authorized: true;
      user: PlatformAdminUser;
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
      dbUser: PlatformAdminUser;
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
 * Verifies Clerk authentication and platform-admin privileges.
 * Strictly guarantees that PLATFORM_OWNER role is restricted to verified wafflehousevellore@gmail.com.
 */
export async function verifyPlatformAdminClerkIdentity(): Promise<PlatformOwnerIdentityResult> {
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

    const isRecognizedPlatformRole =
      dbUser &&
      dbUser.isPlatformAdmin &&
      ALL_PLATFORM_ROLES.includes(dbUser.role as PlatformRole);

    const isPlatformOwnerRole = dbUser?.role === "PLATFORM_OWNER";
    const isOwnerEmailMatch =
      dbUser?.email.toLowerCase() === PRIMARY_PLATFORM_OWNER_EMAIL &&
      verifiedEmail === PRIMARY_PLATFORM_OWNER_EMAIL;

    // Platform Owner is strictly restricted to wafflehousevellore@gmail.com
    if (!isRecognizedPlatformRole || (isPlatformOwnerRole && !isOwnerEmailMatch)) {
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
                role: dbUser.role,
                isPlatformAdmin: dbUser.isPlatformAdmin,
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
        message: "Forbidden: Restricted strictly to authorized RestroNex Platform Administrators.",
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
        role: dbUser.role as PlatformRole,
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

// Backward compatibility alias
export const verifyPlatformOwnerClerkIdentity = verifyPlatformAdminClerkIdentity;

/**
 * Verifies Platform Admin session, checking Clerk identity and 2FA/MFA.
 */
export async function getPlatformAdminSession(): Promise<PlatformOwnerAuthResult> {
  try {
    const idResult = await verifyPlatformAdminClerkIdentity();
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

// Backward compatibility alias
export const getPlatformOwnerSession = getPlatformAdminSession;

/**
 * Server-side API guard with granular platform capability checking.
 */
export async function requirePlatformPermissionApi(requiredPermission?: PlatformPermission) {
  const result = await getPlatformAdminSession();
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

  // Check granular capability if specified
  if (requiredPermission && !hasPlatformPermission(result.user.role, requiredPermission)) {
    await prisma.auditLog
      .create({
        data: {
          userId: result.user.id,
          action: "PLATFORM_PERMISSION_DENIED",
          entity: "PlatformPermission",
          metadataJson: JSON.stringify({
            userEmail: result.user.email,
            userRole: result.user.role,
            requiredPermission,
            timestamp: new Date().toISOString(),
          }),
        },
      })
      .catch(() => {});

    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: `Forbidden: Your platform role '${result.user.role}' lacks capability '${requiredPermission}'.`,
          code: "PLATFORM_FORBIDDEN",
          requiredPermission,
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    auth: result,
  };
}

/**
 * Helper strictly requiring PLATFORM_OWNER role.
 */
export async function requirePlatformOwnerApi() {
  const guard = await requirePlatformPermissionApi();
  if (!guard.ok) return guard;
  if (guard.auth.user.role !== "PLATFORM_OWNER") {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Forbidden: This action requires primary Platform Owner privileges.",
          code: "PLATFORM_OWNER_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }
  return guard;
}

/**
 * Records sensitive Platform administrative operations in immutable AuditLog.
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
          recordedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (err) {
    console.error("[platform-auth] Failed to record audit log:", err);
  }
}
