import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logPlatformAdminAction, requirePlatformOwnerApi } from "@/lib/platform-auth";
import {
  decryptTotpSecret,
  generateBackupCodes,
  serializeBackupCodes,
  setPlatformMfaCookie,
  verifyTotpToken,
} from "@/lib/platform-totp";

export async function POST(req: NextRequest) {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code.replace(/\s+/g, ""))) {
      return NextResponse.json(
        { error: "Enter the 6-digit code displayed in your Authenticator app." },
        { status: 400 }
      );
    }

    const cred = await prisma.platformMfaCredential.findUnique({
      where: { userId: guard.auth.user.id },
    });

    if (!cred?.pendingSecretEnc) {
      return NextResponse.json(
        { error: "No pending Authenticator setup found. Start setup again." },
        { status: 400 }
      );
    }

    if (cred.pendingCreatedAt && Date.now() - cred.pendingCreatedAt.getTime() > 15 * 60 * 1000) {
      return NextResponse.json(
        { error: "Setup QR expired after 15 minutes. Generate a fresh QR code." },
        { status: 400 }
      );
    }

    const plainSecret = decryptTotpSecret(cred.pendingSecretEnc);
    const verified = verifyTotpToken(plainSecret, code, -1);
    if (!verified.valid || verified.matchedStep === undefined) {
      return NextResponse.json(
        { error: "Incorrect 6-digit code. Ensure your device clock is accurate and try again." },
        { status: 400 }
      );
    }

    const plainBackupCodes = generateBackupCodes(8);
    const backupCodesHashJson = serializeBackupCodes(plainBackupCodes);
    const now = new Date();

    await prisma.platformMfaCredential.update({
      where: { userId: guard.auth.user.id },
      data: {
        enabled: true,
        secretEnc: cred.pendingSecretEnc,
        pendingSecretEnc: null,
        pendingCreatedAt: null,
        backupCodesHashJson,
        lastUsedStep: verified.matchedStep,
        failedAttempts: 0,
        lockedUntil: null,
        enrolledAt: now,
        lastVerifiedAt: now,
      },
    });

    const { sessionId } = await auth();
    await setPlatformMfaCookie({
      userId: guard.auth.user.id,
      clerkUserId: guard.auth.user.clerkId,
      sessionId: sessionId || "",
    });

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      action: "PLATFORM_MFA_TOTP_ENROLLED",
      entity: "PlatformMfaCredential",
      entityId: guard.auth.user.id,
      metadata: { backupCodesIssued: plainBackupCodes.length },
    });

    return NextResponse.json({
      ok: true,
      backupCodes: plainBackupCodes,
      enrolledAt: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to enable 2FA" }, { status: 500 });
  }
}

