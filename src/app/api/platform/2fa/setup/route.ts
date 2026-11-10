import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logPlatformAdminAction, requirePlatformOwnerApi } from "@/lib/platform-auth";
import {
  buildOtpAuthUri,
  encryptTotpSecret,
  formatBase32Secret,
  generateBase32Secret,
  PLATFORM_TOTP_ISSUER,
} from "@/lib/platform-totp";

export async function POST() {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  const user = guard.auth.user;
  const plainSecret = generateBase32Secret(20);
  const pendingSecretEnc = encryptTotpSecret(plainSecret);

  await prisma.platformMfaCredential.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      enabled: false,
      pendingSecretEnc,
      pendingCreatedAt: new Date(),
    },
    update: {
      pendingSecretEnc,
      pendingCreatedAt: new Date(),
    },
  });

  await logPlatformAdminAction({
    userId: user.id,
    action: "PLATFORM_MFA_SETUP_INITIATED",
    entity: "PlatformMfaCredential",
    entityId: user.id,
  });

  return NextResponse.json({
    otpauthUrl: buildOtpAuthUri(user.email, plainSecret, PLATFORM_TOTP_ISSUER),
    manualKey: formatBase32Secret(plainSecret),
    issuer: PLATFORM_TOTP_ISSUER,
    accountEmail: user.email,
  });
}

