import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logPlatformAdminAction, requirePlatformOwnerApi } from "@/lib/platform-auth";
import { verifyStoredPlatformMfaChallenge } from "@/lib/platform-mfa-service";
import { clearPlatformMfaCookie } from "@/lib/platform-totp";

export async function POST(req: NextRequest) {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const rawCode = String(body?.code || "").trim();
    if (!rawCode) {
      return NextResponse.json(
        { error: "Enter a current 6-digit Authenticator code (or backup code) to disable 2FA." },
        { status: 400 }
      );
    }

    const res = await verifyStoredPlatformMfaChallenge(guard.auth.user.id, rawCode, "DISABLE");
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    await prisma.platformMfaCredential.update({
      where: { userId: guard.auth.user.id },
      data: {
        enabled: false,
        secretEnc: null,
        pendingSecretEnc: null,
        pendingCreatedAt: null,
        backupCodesHashJson: null,
        enrolledAt: null,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await clearPlatformMfaCookie();

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      action: "PLATFORM_MFA_DISABLED",
      entity: "PlatformMfaCredential",
      entityId: guard.auth.user.id,
      metadata: { methodUsed: res.method },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to disable 2FA" }, { status: 500 });
  }
}
