const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const sql = `
-- 1. AggregatorConnection
CREATE TABLE IF NOT EXISTS "AggregatorConnection" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "credentialsEncrypted" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "autoAccept" BOOLEAN NOT NULL DEFAULT true,
    "defaultPrepMinutes" INTEGER NOT NULL DEFAULT 15,
    "pricingStrategy" TEXT NOT NULL DEFAULT 'MASTER_EQUAL',
    "priceHikeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorConnection_tenantId_provider_key" ON "AggregatorConnection"("tenantId", "provider");
CREATE INDEX IF NOT EXISTS "AggregatorConnection_tenantId_idx" ON "AggregatorConnection"("tenantId");
CREATE INDEX IF NOT EXISTS "AggregatorConnection_provider_status_idx" ON "AggregatorConnection"("provider", "status");

-- 2. AggregatorOutletMapping
CREATE TABLE IF NOT EXISTS "AggregatorOutletMapping" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE,
    "provider" TEXT NOT NULL,
    "providerStoreId" TEXT NOT NULL,
    "providerStoreName" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isRushMode" BOOLEAN NOT NULL DEFAULT false,
    "autoOfflineOnClose" BOOLEAN NOT NULL DEFAULT true,
    "defaultStationId" TEXT,
    "posBillPrinting" BOOLEAN NOT NULL DEFAULT true,
    "kotPrinting" BOOLEAN NOT NULL DEFAULT true,
    "notificationAudio" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorOutletMapping_tenantId_provider_providerStoreId_key" ON "AggregatorOutletMapping"("tenantId", "provider", "providerStoreId");
CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorOutletMapping_outletId_provider_key" ON "AggregatorOutletMapping"("outletId", "provider");
CREATE INDEX IF NOT EXISTS "AggregatorOutletMapping_tenantId_outletId_idx" ON "AggregatorOutletMapping"("tenantId", "outletId");
CREATE INDEX IF NOT EXISTS "AggregatorOutletMapping_provider_providerStoreId_idx" ON "AggregatorOutletMapping"("provider", "providerStoreId");

-- 3. AggregatorMenuMapping
CREATE TABLE IF NOT EXISTS "AggregatorMenuMapping" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "provider" TEXT NOT NULL,
    "menuItemId" TEXT REFERENCES "MenuItem"("id") ON DELETE CASCADE,
    "addonOptionId" TEXT REFERENCES "AddonOption"("id") ON DELETE CASCADE,
    "providerItemId" TEXT NOT NULL,
    "providerItemName" TEXT NOT NULL,
    "categoryName" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "foodType" TEXT NOT NULL DEFAULT 'VEG',
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorMenuMapping_tenantId_provider_providerItemId_key" ON "AggregatorMenuMapping"("tenantId", "provider", "providerItemId");
CREATE INDEX IF NOT EXISTS "AggregatorMenuMapping_tenantId_provider_menuItemId_idx" ON "AggregatorMenuMapping"("tenantId", "provider", "menuItemId");

-- 4. AggregatorOrderReference
CREATE TABLE IF NOT EXISTS "AggregatorOrderReference" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE,
    "orderId" TEXT NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE CASCADE,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "displayOrderId" TEXT,
    "providerStoreId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerMaskedPhone" TEXT,
    "deliveryAddressMasked" TEXT,
    "orderStatus" TEXT NOT NULL,
    "prepTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "rawPayloadJson" TEXT,
    "riderName" TEXT,
    "riderPhone" TEXT,
    "riderStatus" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 1,
    "grossAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "deliveryFeePaise" INTEGER NOT NULL DEFAULT 0,
    "taxesPaise" INTEGER NOT NULL DEFAULT 0,
    "netPayoutPaise" INTEGER NOT NULL DEFAULT 0,
    "commissionPaise" INTEGER NOT NULL DEFAULT 0,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorOrderReference_tenantId_provider_providerOrderId_key" ON "AggregatorOrderReference"("tenantId", "provider", "providerOrderId");
CREATE INDEX IF NOT EXISTS "AggregatorOrderReference_tenantId_provider_createdAt_idx" ON "AggregatorOrderReference"("tenantId", "provider", "createdAt");
CREATE INDEX IF NOT EXISTS "AggregatorOrderReference_outletId_orderStatus_idx" ON "AggregatorOrderReference"("outletId", "orderStatus");

-- 5. AggregatorWebhookEvent
CREATE TABLE IF NOT EXISTS "AggregatorWebhookEvent" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payloadJson" TEXT NOT NULL,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AggregatorWebhookEvent_provider_eventId_key" ON "AggregatorWebhookEvent"("provider", "eventId");
CREATE INDEX IF NOT EXISTS "AggregatorWebhookEvent_provider_eventType_status_idx" ON "AggregatorWebhookEvent"("provider", "eventType", "status");
CREATE INDEX IF NOT EXISTS "AggregatorWebhookEvent_createdAt_idx" ON "AggregatorWebhookEvent"("createdAt");

-- 6. AggregatorSyncJob
CREATE TABLE IF NOT EXISTS "AggregatorSyncJob" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "outletId" TEXT,
    "provider" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payloadJson" TEXT,
    "responseJson" TEXT,
    "errorLog" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AggregatorSyncJob_tenantId_provider_status_idx" ON "AggregatorSyncJob"("tenantId", "provider", "status");
CREATE INDEX IF NOT EXISTS "AggregatorSyncJob_status_nextRetryAt_idx" ON "AggregatorSyncJob"("status", "nextRetryAt");

-- 7. AggregatorExceptionQueue
CREATE TABLE IF NOT EXISTS "AggregatorExceptionQueue" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "outletId" TEXT,
    "provider" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "errorType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AggregatorExceptionQueue_tenantId_provider_isResolved_idx" ON "AggregatorExceptionQueue"("tenantId", "provider", "isResolved");
`;

async function run() {
  console.log('Connecting to PostgreSQL via DIRECT_URL...');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected. Running migration SQL...');
  await client.query(sql);
  console.log('All 7 Aggregator tables and indexes successfully created / verified in PostgreSQL!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
