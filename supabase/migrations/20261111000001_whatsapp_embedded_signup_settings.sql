-- Safe, Additive Schema Migration for OTP / Meta Embedded Signup WhatsApp Connection & Delivery Preferences
-- Preserves all existing tenant, outlet, order, invoice, and payment data.

ALTER TABLE "RestaurantSetting"
  ADD COLUMN IF NOT EXISTS "whatsappSendPdfTaxInvoice" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "whatsappSendPaymentConfirm" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "whatsappSendOrderConfirm" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "defaultWhatsAppOutletId" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappCoexistence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "whatsappConnectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "whatsappLastVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "whatsappVerificationError" TEXT;

ALTER TABLE "OutletWhatsAppConfig"
  ADD COLUMN IF NOT EXISTS "isDefaultSender" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isCoexistence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verificationError" TEXT,
  ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3);

-- Backfill connectedAt cleanly for any already verified connections without modifying existing records
UPDATE "RestaurantSetting"
SET "whatsappConnectedAt" = CURRENT_TIMESTAMP
WHERE "whatsappConnectionStatus" = 'CONNECTED'
  AND "whatsappConnectedAt" IS NULL;

UPDATE "OutletWhatsAppConfig"
SET "connectedAt" = COALESCE("lastVerifiedAt", "createdAt")
WHERE "status" = 'CONNECTED'
  AND "connectedAt" IS NULL;

