-- Migration: 20261117000001_addon_management_system.sql
-- Description: Complete Product Add-on, Modifier, and Automatic Customization System

-- 1. AddonGroup Table
CREATE TABLE IF NOT EXISTS "AddonGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "selectionType" TEXT NOT NULL DEFAULT 'MULTIPLE',
  "minSelections" INTEGER NOT NULL DEFAULT 0,
  "maxSelections" INTEGER,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AddonGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AddonGroup_tenantId_idx" ON "AddonGroup"("tenantId");
CREATE INDEX IF NOT EXISTS "AddonGroup_tenantId_isActive_idx" ON "AddonGroup"("tenantId", "isActive");

-- 2. AddonOption Table
CREATE TABLE IF NOT EXISTS "AddonOption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "addonGroupId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pricePaise" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AddonOption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AddonOption_addonGroupId_fkey" FOREIGN KEY ("addonGroupId") REFERENCES "AddonGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AddonOption_tenantId_idx" ON "AddonOption"("tenantId");
CREATE INDEX IF NOT EXISTS "AddonOption_addonGroupId_idx" ON "AddonOption"("addonGroupId");
CREATE INDEX IF NOT EXISTS "AddonOption_addonGroupId_isActive_idx" ON "AddonOption"("addonGroupId", "isActive");

-- 3. ProductAddonGroup Junction Table
CREATE TABLE IF NOT EXISTS "ProductAddonGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "addonGroupId" TEXT NOT NULL,
  "outletId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAddonGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductAddonGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductAddonGroup_addonGroupId_fkey" FOREIGN KEY ("addonGroupId") REFERENCES "AddonGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductAddonGroup_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductAddonGroup_menuItemId_addonGroupId_outletId_key" ON "ProductAddonGroup"("menuItemId", "addonGroupId", "outletId");
CREATE INDEX IF NOT EXISTS "ProductAddonGroup_menuItemId_idx" ON "ProductAddonGroup"("menuItemId");
CREATE INDEX IF NOT EXISTS "ProductAddonGroup_addonGroupId_idx" ON "ProductAddonGroup"("addonGroupId");
CREATE INDEX IF NOT EXISTS "ProductAddonGroup_tenantId_idx" ON "ProductAddonGroup"("tenantId");

-- 4. OrderItemAddon Table
CREATE TABLE IF NOT EXISTS "OrderItemAddon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderItemId" TEXT NOT NULL,
  "addonGroupId" TEXT,
  "addonOptionId" TEXT,
  "groupNameSnapshot" TEXT NOT NULL,
  "optionNameSnapshot" TEXT NOT NULL,
  "pricePaiseSnapshot" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItemAddon_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItemAddon_addonGroupId_fkey" FOREIGN KEY ("addonGroupId") REFERENCES "AddonGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrderItemAddon_addonOptionId_fkey" FOREIGN KEY ("addonOptionId") REFERENCES "AddonOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderItemAddon_orderItemId_idx" ON "OrderItemAddon"("orderItemId");

-- 5. Enable Row Level Security (RLS) on tenant-scoped tables
ALTER TABLE "AddonGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AddonOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductAddonGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItemAddon" ENABLE ROW LEVEL SECURITY;

-- 6. Grant standard permissions
GRANT ALL ON "AddonGroup" TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "AddonGroup" TO authenticated;
GRANT SELECT ON "AddonGroup" TO anon;

GRANT ALL ON "AddonOption" TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "AddonOption" TO authenticated;
GRANT SELECT ON "AddonOption" TO anon;

GRANT ALL ON "ProductAddonGroup" TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ProductAddonGroup" TO authenticated;
GRANT SELECT ON "ProductAddonGroup" TO anon;

GRANT ALL ON "OrderItemAddon" TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "OrderItemAddon" TO authenticated;
GRANT SELECT ON "OrderItemAddon" TO anon;
