-- RestroNex Staff Authentication, Profiles, Multi-Outlet Scoping & Invitations Migration
-- Safe, additive migration preserving all existing tenants, memberships, and users

-- 1. Enhance Membership table
ALTER TABLE "Membership"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "permissionsJson" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Create StaffProfile table
CREATE TABLE IF NOT EXISTS "StaffProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "membershipId" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "employeeCode" TEXT,
  "jobTitle" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Create OutletMember table (for multi-outlet assignments per employee)
CREATE TABLE IF NOT EXISTS "OutletMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "membershipId" TEXT NOT NULL,
  "outletId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutletMember_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutletMember_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutletMember_membershipId_outletId_unique" UNIQUE ("membershipId", "outletId")
);

-- 4. Create StaffInvitation table
CREATE TABLE IF NOT EXISTS "StaffInvitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "fullName" TEXT,
  "phone" TEXT,
  "role" TEXT NOT NULL,
  "outletId" TEXT,
  "outletIdsJson" TEXT,
  "permissionsJson" TEXT,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "invitedBy" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffInvitation_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS "Membership_tenantId_status_idx" ON "Membership"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "StaffProfile_membershipId_idx" ON "StaffProfile"("membershipId");
CREATE INDEX IF NOT EXISTS "OutletMember_membershipId_idx" ON "OutletMember"("membershipId");
CREATE INDEX IF NOT EXISTS "OutletMember_outletId_idx" ON "OutletMember"("outletId");
CREATE INDEX IF NOT EXISTS "StaffInvitation_tenantId_idx" ON "StaffInvitation"("tenantId");
CREATE INDEX IF NOT EXISTS "StaffInvitation_email_idx" ON "StaffInvitation"("email");
CREATE INDEX IF NOT EXISTS "StaffInvitation_tokenHash_idx" ON "StaffInvitation"("tokenHash");

