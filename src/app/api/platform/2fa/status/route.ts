import { NextResponse } from "next/server";
import { requirePlatformOwnerApi } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  return NextResponse.json({
    totpEnabled: guard.auth.totpEnabled,
    clerkMfaEnrolled: guard.auth.clerkMfaEnrolled,
    mfaEnrolled: guard.auth.mfaEnrolled,
    enrolledAt: guard.auth.totpEnrolledAt,
    lastVerifiedAt: guard.auth.totpLastVerifiedAt,
    remainingBackupCodes: guard.auth.remainingBackupCodes,
    email: guard.auth.user.email,
  });
}

