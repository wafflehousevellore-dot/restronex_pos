import "dotenv/config";
import dns from "dns";
import { prisma } from "../src/lib/db";
import { MARKETPLACE_CATALOG } from "../src/lib/marketplace-catalog";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

async function seed() {
  console.log(`Starting Marketplace catalog seed for ${MARKETPLACE_CATALOG.length} services...`);

  // 1. Upsert all Marketplace Services
  for (const item of MARKETPLACE_CATALOG) {
    await prisma.marketplaceService.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        iconName: item.iconName,
        badge: item.badge || null,
        implementationStatus: item.implementationStatus,
        requiredPlanTier: item.requiredPlanTier,
        targetRoute: item.targetRoute || null,
        configRoute: item.configRoute || null,
        isCoreDefault: item.isCoreDefault || false,
        sortOrder: item.sortOrder,
      },
      update: {
        name: item.name,
        category: item.category,
        description: item.description,
        iconName: item.iconName,
        badge: item.badge || null,
        implementationStatus: item.implementationStatus,
        requiredPlanTier: item.requiredPlanTier,
        targetRoute: item.targetRoute || null,
        configRoute: item.configRoute || null,
        isCoreDefault: item.isCoreDefault || false,
        sortOrder: item.sortOrder,
      },
    });
  }

  console.log(`✅ Upserted ${MARKETPLACE_CATALOG.length} services in MarketplaceService table.`);

  // 2. Ensure existing tenants have core operational modules activated
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Found ${tenants.length} tenants. Activating core default modules...`);

  const coreServices = MARKETPLACE_CATALOG.filter((s) => s.isCoreDefault);

  for (const t of tenants) {
    for (const s of coreServices) {
      await prisma.organizationServiceActivation.upsert({
        where: {
          tenantId_serviceId: {
            tenantId: t.id,
            serviceId: s.id,
          },
        },
        create: {
          tenantId: t.id,
          serviceId: s.id,
          status: s.implementationStatus === "CONFIG_REQUIRED" ? "CONFIGURATION_REQUIRED" : "ACTIVE",
          activatedByUserId: "SYSTEM_SEED",
        },
        update: {}, // Preserve if already set
      });
    }
  }

  console.log(`✅ Completed core service activation for all ${tenants.length} tenants.`);
}

seed()
  .catch((e) => {
    console.error("Error seeding marketplace:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
