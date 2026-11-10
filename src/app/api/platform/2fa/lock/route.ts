import { NextResponse } from "next/server";
import { logPlatformAdminAction, requirePlatformOwnerApi } from "@/lib/platform-auth";
import { clearPlatformMfaCookie } from "@/lib/platform-totp";

export async function POST() {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  await clearPlatformMfaCookie();
  await logPlatformAdminAction({
    userId: guard.auth.user.id,
    action: "PLATFORM_MFA_SESSION_LOCKED",
    entity: "PlatformMfaCredential",
    entityId: guard.auth.user.id,
  });

  return NextResponse.json({ ok: true });
}

