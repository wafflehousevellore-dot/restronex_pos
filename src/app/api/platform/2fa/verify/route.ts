import { NextRequest, NextResponse } from "next/server";
import { logPlatformAdminAction, verifyPlatformOwnerClerkIdentity } from "@/lib/platform-auth";
import { verifyStoredPlatformMfaChallenge } from "@/lib/platform-mfa-service";
import { setPlatformMfaCookie } from "@/lib/platform-totp";

export async function POST(req: NextRequest) {
  const idRes = await verifyPlatformOwnerClerkIdentity();
  if ("reason" in idRes) {
    return NextResponse.json({ error: idRes.message, code: idRes.reason }, { status: idRes.status });
  }

  try {
    const body = await req.json();
    const rawCode = String(body?.code || "").trim();
    if (!rawCode) {
      return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
    }

    const res = await verifyStoredPlatformMfaChallenge(idRes.dbUser.id, rawCode, "UNLOCK");
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    await setPlatformMfaCookie({
      userId: idRes.dbUser.id,
      clerkUserId: idRes.clerkUserId,
      sessionId: idRes.sessionId,
    });

    await logPlatformAdminAction({
      userId: idRes.dbUser.id,
      action: res.method === "BACKUP" ? "PLATFORM_MFA_BACKUP_CODE_USED" : "PLATFORM_MFA_VERIFIED",
      entity: "PlatformMfaCredential",
      entityId: idRes.dbUser.id,
      metadata: {
        method: res.method,
        ...(res.remainingBackupCodes !== undefined ? { remainingBackupCodes: res.remainingBackupCodes } : {}),
      },
    });

    return NextResponse.json({ ok: true, method: res.method });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "2FA verification failed" }, { status: 500 });
  }
}
