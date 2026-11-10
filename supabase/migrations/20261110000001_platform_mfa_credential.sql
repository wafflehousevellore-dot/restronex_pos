-- Free built-in RFC 6238 TOTP MFA store for verified Platform Owner accounts
CREATE TABLE IF NOT EXISTS "PlatformMfaCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pendingSecretEnc" TEXT,
    "pendingCreatedAt" TIMESTAMPTZ,
    "secretEnc" TEXT,
    "backupCodesHashJson" TEXT,
    "lastUsedStep" INTEGER NOT NULL DEFAULT -1,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ,
    "enrolledAt" TIMESTAMPTZ,
    "lastVerifiedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Strictly isolate from Supabase anon/authenticated API keys (server/Prisma postgres only)
ALTER TABLE "PlatformMfaCredential" ENABLE ROW LEVEL SECURITY;

