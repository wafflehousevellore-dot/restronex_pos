-- Migration: 20261116000001_kds_automatic_order_system.sql
-- Description: Automatic KDS order reception, aggregator tracking, and acknowledgement

ALTER TABLE "KitchenTicket"
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "acknowledgedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "reprintCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "aggregatorOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "aggregatorStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "channel" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

CREATE INDEX IF NOT EXISTS "Order_tenantId_aggregatorOrderId_idx" ON "Order"("tenantId", "aggregatorOrderId");
CREATE INDEX IF NOT EXISTS "KitchenTicket_tenantId_outletId_status_idx" ON "KitchenTicket"("tenantId", "outletId", "status");
