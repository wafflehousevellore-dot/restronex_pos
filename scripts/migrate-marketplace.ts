import "dotenv/config";
import pg from "pg";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL in environment.");
  }

  const pool = new pg.Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 15000,
  });
  const client = await pool.connect();

  console.log("Connected to PostgreSQL database for Marketplace schema migration.");

  try {
    await client.query("BEGIN");

    // 1. Create MarketplaceService Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MarketplaceService" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "iconName" TEXT NOT NULL DEFAULT 'Plug',
        "badge" TEXT,
        "implementationStatus" TEXT NOT NULL DEFAULT 'OPERATIONAL',
        "requiredPlanTier" TEXT NOT NULL DEFAULT 'STARTER',
        "targetRoute" TEXT,
        "configRoute" TEXT,
        "isCoreDefault" BOOLEAN NOT NULL DEFAULT false,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create OrganizationServiceActivation Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "OrganizationServiceActivation" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "serviceId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "applicableOutletId" TEXT,
        "configJson" TEXT,
        "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "activatedByUserId" TEXT,
        "deactivatedAt" TIMESTAMP(3),
        CONSTRAINT "OrganizationServiceActivation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "OrganizationServiceActivation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MarketplaceService"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Unique index on [tenantId, serviceId]
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationServiceActivation_tenantId_serviceId_key"
      ON "OrganizationServiceActivation"("tenantId", "serviceId");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "OrganizationServiceActivation_tenantId_status_idx"
      ON "OrganizationServiceActivation"("tenantId", "status");
    `);

    // 3. Create ServiceActivationEvent Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ServiceActivationEvent" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "serviceId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "actorUserId" TEXT,
        "actorEmail" TEXT,
        "detailsJson" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ServiceActivationEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "ServiceActivationEvent_tenantId_createdAt_idx"
      ON "ServiceActivationEvent"("tenantId", "createdAt");
    `);

    await client.query("COMMIT");
    console.log("✅ Successfully created MarketplaceService, OrganizationServiceActivation, and ServiceActivationEvent tables.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
