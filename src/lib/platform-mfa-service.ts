import { prisma } from "./db";
import { logPlatformAdminAction } from "./platform-auth";
import {
  evaluateMfaChallenge,
  PLATFORM_MFA_LOCKOUT_MINUTES,
  PLATFORM_MFA_MAX_FAILURES,
} from "./platform-totp";

export type VerifyChallengeResult =
  | { ok: true; method: "TOTP" | "BACKUP"; remainingBackupCodes?: number }
  | { ok: false; status: number; error: string };

/**
 * Verifies a submitted TOTP or backup code against the user's enrolled PlatformMfaCredential
 * with brute-force lockout, TOTP replay prevention, and AuditLog recording.
 */
export async function verifyStoredPlatformMfaChallenge(
  userId: string,
  rawCode: string,
  context: "UNLOCK" | "DISABLE"
): Promise<VerifyChallengeResult> {
  const cred = await prisma.platformMfaCredential.findUnique({ where: { userId } });
  if (!cred?.enabled || !cred.secretEnc) {
    return { ok: false, status: 400, error: "Authenticator App 2FA is not currently enabled." };
  }

  const now = new Date();
  if (cred.lockedUntil && cred.lockedUntil > now) {
    const secs = Math.max(1, Math.ceil((cred.lockedUntil.getTime() - now.getTime()) / 1000));
    return {
      ok: false,
      status: 429,
      error: `Too many failed attempts. Try again in ${secs} seconds.`,
    };
  }

  const challenge = evaluateMfaChallenge({
    secretEnc: cred.secretEnc,
    backupCodesHashJson: cred.backupCodesHashJson,
    lastUsedStep: cred.lastUsedStep,
    rawCode,
  });

  if (!challenge.ok) {
    const replayRejected = "replayRejected" in challenge ? Boolean(challenge.replayRejected) : false;
    const nextFailures = cred.failedAttempts + 1;
    const lockedUntil =
      nextFailures >= PLATFORM_MFA_MAX_FAILURES
        ? new Date(now.getTime() + PLATFORM_MFA_LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await prisma.platformMfaCredential.update({
      where: { userId },
      data: {
        failedAttempts: lockedUntil ? 0 : nextFailures,
        lockedUntil,
      },
    });

    await logPlatformAdminAction({
      userId,
      action: lockedUntil ? "PLATFORM_MFA_LOCKED_OUT" : "PLATFORM_MFA_FAILED_ATTEMPT",
      entity: "PlatformMfaCredential",
      entityId: userId,
      metadata: {
        context,
        replayRejected,
        attemptCount: nextFailures,
      },
    });

    if (lockedUntil) {
      return {
        ok: false,
        status: 429,
        error: `Too many failed codes. Locked for ${PLATFORM_MFA_LOCKOUT_MINUTES} minutes.`,
      };
    }
    if (replayRejected) {
      return {
        ok: false,
        status: 400,
        error: "That code was already used. Wait for the next 6-digit code in your Authenticator app.",
      };
    }
    return {
      ok: false,
      status: 400,
      error: "Invalid verification code or backup code.",
    };
  }

  if (challenge.method === "TOTP") {
    await prisma.platformMfaCredential.update({
      where: { userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastUsedStep: challenge.matchedStep,
        lastVerifiedAt: now,
      },
    });
    return { ok: true, method: "TOTP" };
  }

  await prisma.platformMfaCredential.update({
    where: { userId },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      backupCodesHashJson: challenge.updatedBackupJson,
      lastVerifiedAt: now,
    },
  });
  return { ok: true, method: "BACKUP", remainingBackupCodes: challenge.remainingCount };
}
