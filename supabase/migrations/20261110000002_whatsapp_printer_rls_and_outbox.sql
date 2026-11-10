-- Additive Non-Destructive Schema Extensions & Multi-Tenant RLS Policies
-- for Automatic WhatsApp Invoice Delivery & Automatic Thermal Printing

ALTER TABLE "RestaurantSetting"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappDisplayPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappConnectionMode" TEXT DEFAULT 'META_CLOUD_API',
  ADD COLUMN IF NOT EXISTS "whatsappConnectionStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  ADD COLUMN IF NOT EXISTS "whatsappOnboardingSkipped" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "printerOnboardingSkipped" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "qrFooterEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "OutletWhatsAppConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "outletId" TEXT NOT NULL UNIQUE REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "phoneNumberId" TEXT,
  "wabaId" TEXT,
  "displayPhone" TEXT,
  "accessTokenEnc" TEXT,
  "templateName" TEXT DEFAULT 'order_invoice_utility',
  "connectionMode" TEXT DEFAULT 'META_CLOUD_API',
  "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "OutletWhatsAppConfig_tenantId_idx" ON "OutletWhatsAppConfig"("tenantId");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "printStatus" TEXT;
DROP INDEX IF EXISTS "Order_idempotencyKey_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenantId_idempotencyKey_key" ON "Order"("tenantId", "idempotencyKey");

ALTER TABLE "PrinterDevice"
  ADD COLUMN IF NOT EXISTS "bridgeUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "autoPrintEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "compatibilityNote" TEXT;

ALTER TABLE "PrintJob"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "paperWidth" TEXT NOT NULL DEFAULT '80mm',
  ADD COLUMN IF NOT EXISTS "maxRetries" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "printedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "PrintJob_tenantId_idempotencyKey_key" ON "PrintJob"("tenantId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "PrintJob_status_nextRetryAt_idx" ON "PrintJob"("status", "nextRetryAt");

ALTER TABLE "CustomerConsent"
  ADD COLUMN IF NOT EXISTS "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Strict Supabase Row Level Security Policies
ALTER TABLE "OutletWhatsAppConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrinterDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrinterRoutingRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrintJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppDeliveryLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppMessageQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceRecord" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_outlet_whatsapp ON "OutletWhatsAppConfig";
CREATE POLICY tenant_isolation_outlet_whatsapp ON "OutletWhatsAppConfig"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_printer_device ON "PrinterDevice";
CREATE POLICY tenant_isolation_printer_device ON "PrinterDevice"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_printer_routing ON "PrinterRoutingRule";
CREATE POLICY tenant_isolation_printer_routing ON "PrinterRoutingRule"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_print_job ON "PrintJob";
CREATE POLICY tenant_isolation_print_job ON "PrintJob"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_customer_consent ON "CustomerConsent";
CREATE POLICY tenant_isolation_customer_consent ON "CustomerConsent"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_whatsapp_log ON "WhatsAppDeliveryLog";
CREATE POLICY tenant_isolation_whatsapp_log ON "WhatsAppDeliveryLog"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_whatsapp_queue ON "WhatsAppMessageQueue";
CREATE POLICY tenant_isolation_whatsapp_queue ON "WhatsAppMessageQueue"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_invoice_record ON "InvoiceRecord";
CREATE POLICY tenant_isolation_invoice_record ON "InvoiceRecord"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());
