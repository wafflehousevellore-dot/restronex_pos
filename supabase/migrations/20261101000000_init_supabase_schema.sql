-- ============================================================================
-- RestroNex Official Supabase PostgreSQL Architecture Migration
-- Stack: Supabase PostgreSQL 15+ | Supavisor Pooling | Clerk Native Auth | RLS
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Core Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clerkId" TEXT UNIQUE,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clerkOrgId" TEXT UNIQUE,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "businessType" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'OUTLET_MANAGER',
    "outletId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Membership_userId_tenantId_key" UNIQUE ("userId", "tenantId")
);

CREATE TABLE IF NOT EXISTS "Outlet" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "serviceModes" TEXT NOT NULL DEFAULT 'DINE_IN,TAKEAWAY,DELIVERY',
    "openingHours" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Outlet_tenantId_slug_key" UNIQUE ("tenantId", "slug")
);

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_outletId_fkey" 
    FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "RestaurantSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL UNIQUE REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "receiptHeader" TEXT,
    "receiptFooter" TEXT,
    "gstNumber" TEXT,
    "fssaiNumber" TEXT,
    "serviceChargePct" INTEGER NOT NULL DEFAULT 0,
    "enableKOT" BOOLEAN NOT NULL DEFAULT true,
    "enableTableMgmt" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "TaxConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "MenuCategory" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT REFERENCES "MenuCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    CONSTRAINT "MenuCategory_tenantId_slug_key" UNIQUE ("tenantId", "slug")
);

CREATE TABLE IF NOT EXISTS "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "categoryId" TEXT NOT NULL REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "taxConfigId" TEXT,
    "sku" TEXT,
    "prepTimeMin" INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS "MenuVariant" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "itemId" TEXT NOT NULL REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "MenuModifier" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "itemId" TEXT NOT NULL REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "Table" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "number" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT 'Main Hall',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentOrderId" TEXT,
    CONSTRAINT "Table_outletId_number_key" UNIQUE ("outletId", "number")
);

CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "orderNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "tableId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "subtotalPaise" INTEGER NOT NULL DEFAULT 0,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "serviceChargePaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "kotStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Order_tenantId_orderNumber_key" UNIQUE ("tenantId", "orderNumber")
);

CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "menuItemId" TEXT NOT NULL REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "modifiersJson" TEXT,
    "variantName" TEXT,
    "notes" TEXT,
    "kotStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "totalPaise" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "KitchenTicket" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "station" TEXT NOT NULL DEFAULT 'MAIN',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "method" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CashierShift" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "openedById" TEXT NOT NULL,
    "openingPaise" INTEGER NOT NULL DEFAULT 0,
    "closingPaise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "closedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "costPerUnitPaise" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "menuItemId" TEXT NOT NULL UNIQUE REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "yieldQty" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "recipeId" TEXT NOT NULL REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "inventoryItemId" TEXT NOT NULL REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "quantity" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "RecipeIngredient_recipeId_inventoryItemId_key" UNIQUE ("recipeId", "inventoryItemId")
);

CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT
);

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "supplierId" TEXT NOT NULL REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "poNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalPaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "PurchaseOrder_tenantId_poNumber_key" UNIQUE ("tenantId", "poNumber")
);

CREATE TABLE IF NOT EXISTS "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "inventoryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpentPaise" INTEGER NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Customer_tenantId_phone_key" UNIQUE ("tenantId", "phone")
);

CREATE TABLE IF NOT EXISTS "LoyaltyTxn" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE,
    "priceMonthlyPaise" INTEGER NOT NULL,
    "priceAnnualPaise" INTEGER NOT NULL,
    "maxOutlets" INTEGER NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "featuresJson" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "planId" TEXT NOT NULL REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "currentPeriodEnd" TIMESTAMPTZ NOT NULL,
    "trialEndsAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "subscriptionId" TEXT NOT NULL REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "providerPaymentId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL UNIQUE,
    "payloadJson" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "IntegrationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "configJson" TEXT,
    "lastSyncAt" TIMESTAMPTZ,
    CONSTRAINT "IntegrationConfig_tenantId_provider_key" UNIQUE ("tenantId", "provider")
);

CREATE TABLE IF NOT EXISTS "Token" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "tokenNo" INTEGER NOT NULL,
    "queuePos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "category" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SupplierPrice" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "inventoryItemId" TEXT NOT NULL REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "supplierId" TEXT NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "pricePaise" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "SupplierPrice_inventoryItemId_supplierId_key" UNIQUE ("inventoryItemId", "supplierId")
);

CREATE TABLE IF NOT EXISTS "DayEndSummary" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "outletId" TEXT NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "date" TEXT NOT NULL,
    "salesPaise" INTEGER NOT NULL DEFAULT 0,
    "expensePaise" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "DayEndSummary_outletId_date_key" UNIQUE ("outletId", "date")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT REFERENCES "Tenant"("id"),
    "userId" TEXT REFERENCES "User"("id"),
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DemoRequest" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PendingRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "restaurantType" TEXT NOT NULL DEFAULT 'Restaurant',
    "planSlug" TEXT NOT NULL DEFAULT 'starter',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "clerkUserId" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. High-Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS "Membership_tenantId_idx" ON "Membership"("tenantId");
CREATE INDEX IF NOT EXISTS "Outlet_tenantId_idx" ON "Outlet"("tenantId");
CREATE INDEX IF NOT EXISTS "TaxConfig_tenantId_idx" ON "TaxConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "MenuCategory_tenantId_idx" ON "MenuCategory"("tenantId");
CREATE INDEX IF NOT EXISTS "MenuItem_tenantId_idx" ON "MenuItem"("tenantId");
CREATE INDEX IF NOT EXISTS "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");
CREATE INDEX IF NOT EXISTS "Table_tenantId_idx" ON "Table"("tenantId");
CREATE INDEX IF NOT EXISTS "Order_tenantId_outletId_idx" ON "Order"("tenantId", "outletId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "KitchenTicket_outletId_status_idx" ON "KitchenTicket"("outletId", "status");
CREATE INDEX IF NOT EXISTS "CashierShift_outletId_status_idx" ON "CashierShift"("outletId", "status");
CREATE INDEX IF NOT EXISTS "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");
CREATE INDEX IF NOT EXISTS "Supplier_tenantId_idx" ON "Supplier"("tenantId");
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_idx" ON "StockMovement"("tenantId");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX IF NOT EXISTS "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Token_outletId_status_idx" ON "Token"("outletId", "status");
CREATE INDEX IF NOT EXISTS "Token_tenantId_idx" ON "Token"("tenantId");
CREATE INDEX IF NOT EXISTS "Reservation_outletId_date_idx" ON "Reservation"("outletId", "date");
CREATE INDEX IF NOT EXISTS "Reservation_tenantId_idx" ON "Reservation"("tenantId");
CREATE INDEX IF NOT EXISTS "Feedback_tenantId_idx" ON "Feedback"("tenantId");
CREATE INDEX IF NOT EXISTS "Expense_tenantId_idx" ON "Expense"("tenantId");
CREATE INDEX IF NOT EXISTS "Expense_outletId_idx" ON "Expense"("outletId");
CREATE INDEX IF NOT EXISTS "SupplierPrice_tenantId_idx" ON "SupplierPrice"("tenantId");
CREATE INDEX IF NOT EXISTS "DayEndSummary_tenantId_idx" ON "DayEndSummary"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "PendingRegistration_email_idx" ON "PendingRegistration"("email");
CREATE INDEX IF NOT EXISTS "PendingRegistration_status_idx" ON "PendingRegistration"("status");

-- ============================================================================
-- 4. Clerk Third-Party Authentication & RLS Security Functions
-- ============================================================================

-- Extracts Clerk user ID from the native JWT `sub` claim or request claims
CREATE OR REPLACE FUNCTION public.clerk_user_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', ''),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')
  )::text;
$$ LANGUAGE sql STABLE;

-- Checks if the authenticated user has an active membership for the given tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Membership" m
    JOIN "User" u ON m."userId" = u."id"
    WHERE m."tenantId" = p_tenant_id
      AND (u."clerkId" = public.clerk_user_id() OR u."id" = public.clerk_user_id())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Checks if user has outlet-level authorization for the given outlet
CREATE OR REPLACE FUNCTION public.has_outlet_access(p_outlet_id TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Membership" m
    JOIN "User" u ON m."userId" = u."id"
    WHERE (m."outletId" IS NULL OR m."outletId" = p_outlet_id)
      AND (u."clerkId" = public.clerk_user_id() OR u."id" = public.clerk_user_id())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Checks if the user is a platform administrator
CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User" u
    WHERE (u."clerkId" = public.clerk_user_id() OR u."id" = public.clerk_user_id())
      AND u."isPlatformAdmin" = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tenant-specific tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Outlet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuModifier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KitchenTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashierShift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecipeIngredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyTxn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Token" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierPrice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DayEndSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
DROP POLICY IF EXISTS tenant_isolation_tenant ON "Tenant";
CREATE POLICY tenant_isolation_tenant ON "Tenant"
    FOR ALL USING (public.is_tenant_member("id") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_outlet ON "Outlet";
CREATE POLICY tenant_isolation_outlet ON "Outlet"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_menu_category ON "MenuCategory";
CREATE POLICY tenant_isolation_menu_category ON "MenuCategory"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_menu_item ON "MenuItem";
CREATE POLICY tenant_isolation_menu_item ON "MenuItem"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

-- Outlet-Scoped Authorization Policies (Orders & Floor Operations)
DROP POLICY IF EXISTS tenant_outlet_isolation_order ON "Order";
CREATE POLICY tenant_outlet_isolation_order ON "Order"
    FOR ALL USING (
        public.is_tenant_member("tenantId") AND (public.has_outlet_access("outletId") OR public.is_platform_admin())
    );

DROP POLICY IF EXISTS tenant_outlet_isolation_table ON "Table";
CREATE POLICY tenant_outlet_isolation_table ON "Table"
    FOR ALL USING (
        public.is_tenant_member("tenantId") AND (public.has_outlet_access("outletId") OR public.is_platform_admin())
    );

DROP POLICY IF EXISTS tenant_outlet_isolation_kds ON "KitchenTicket";
CREATE POLICY tenant_outlet_isolation_kds ON "KitchenTicket"
    FOR ALL USING (
        public.is_tenant_member("tenantId") AND (public.has_outlet_access("outletId") OR public.is_platform_admin())
    );

DROP POLICY IF EXISTS tenant_isolation_inventory ON "InventoryItem";
CREATE POLICY tenant_isolation_inventory ON "InventoryItem"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_customers ON "Customer";
CREATE POLICY tenant_isolation_customers ON "Customer"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_subscription ON "Subscription";
CREATE POLICY tenant_isolation_subscription ON "Subscription"
    FOR ALL USING (public.is_tenant_member("tenantId") OR public.is_platform_admin());

DROP POLICY IF EXISTS tenant_isolation_audit_logs ON "AuditLog";
CREATE POLICY tenant_isolation_audit_logs ON "AuditLog"
    FOR ALL USING (
        ("tenantId" IS NOT NULL AND public.is_tenant_member("tenantId")) OR public.is_platform_admin()
    );

-- ============================================================================
-- 6. Supabase Storage Buckets & Policies
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('restaurant-assets', 'restaurant-assets', true),
    ('restaurant-documents', 'restaurant-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access for Restaurant Assets" ON storage.objects;
CREATE POLICY "Public Read Access for Restaurant Assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'restaurant-assets');

DROP POLICY IF EXISTS "Tenant Isolated Asset Uploads" ON storage.objects;
CREATE POLICY "Tenant Isolated Asset Uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'restaurant-assets'
        AND public.is_tenant_member((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "Tenant Isolated Document Access" ON storage.objects;
CREATE POLICY "Tenant Isolated Document Access" ON storage.objects
    FOR ALL USING (
        bucket_id = 'restaurant-documents'
        AND public.is_tenant_member((storage.foldername(name))[1])
    );

