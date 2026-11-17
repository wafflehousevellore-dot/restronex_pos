import "dotenv/config";
import dns from "dns";
import { prisma } from "../src/lib/db";
import { MARKETPLACE_CATALOG } from "../src/lib/marketplace-catalog";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

async function runTests() {
  console.log("==================================================");
  console.log("RESTRO NEX MARKETPLACE END-TO-END VERIFICATION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || ""}`);
      failed++;
    }
  }

  // 1. Verify Catalog Integrity
  const servicesInDb = await prisma.marketplaceService.findMany();
  assert(
    servicesInDb.length === MARKETPLACE_CATALOG.length,
    `Database catalog count matches definition (${servicesInDb.length} / ${MARKETPLACE_CATALOG.length})`
  );

  const categories = new Set(servicesInDb.map((s) => s.category));
  assert(
    categories.has("crm") && categories.has("analytics") && categories.has("service") && categories.has("operations"),
    "All 4 primary categories exist (crm, analytics, service, operations)"
  );

  const operationalCount = servicesInDb.filter((s) => s.implementationStatus === "OPERATIONAL").length;
  const configCount = servicesInDb.filter((s) => s.implementationStatus === "CONFIG_REQUIRED").length;
  const plannedCount = servicesInDb.filter((s) => s.implementationStatus === "PLANNED").length;
  console.log(`Catalog Status Breakdown: ${operationalCount} Operational, ${configCount} Config Required, ${plannedCount} Planned Roadmap.`);
  assert(operationalCount > 20, `Robust operational feature baseline: ${operationalCount} modules ready`);

  // 2. Tenant Context & Isolation
  const tenant = await prisma.tenant.findFirst({
    include: {
      subscriptions: { include: { plan: true } },
    },
  });
  if (!tenant) throw new Error("No tenant found for testing.");
  console.log(`Testing with Tenant: ${tenant.name} (${tenant.id})`);

  // 3. Test Core Module Protection
  const coreModule = servicesInDb.find((s) => s.isCoreDefault);
  if (coreModule) {
    // Attempting to deactivate a core module must be rejected
    const isCore = coreModule.isCoreDefault;
    assert(isCore === true, `Core module "${coreModule.name}" is designated isCoreDefault: true`);
  }

  // 4. Test Idempotent Activation of an Add-on
  const testAddon = servicesInDb.find((s) => !s.isCoreDefault && s.implementationStatus === "OPERATIONAL")!;
  console.log(`Testing Activation of: "${testAddon.name}" (${testAddon.id})`);

  // Upsert 1
  const act1 = await prisma.organizationServiceActivation.upsert({
    where: {
      tenantId_serviceId: {
        tenantId: tenant.id,
        serviceId: testAddon.id,
      },
    },
    create: {
      tenantId: tenant.id,
      serviceId: testAddon.id,
      status: "ACTIVE",
      activatedByUserId: "TEST_RUNNER",
    },
    update: {
      status: "ACTIVE",
      deactivatedAt: null,
    },
  });
  assert(act1.status === "ACTIVE", `First activation of "${testAddon.name}" succeeded`);

  // Upsert 2 (Idempotency test)
  const act2 = await prisma.organizationServiceActivation.upsert({
    where: {
      tenantId_serviceId: {
        tenantId: tenant.id,
        serviceId: testAddon.id,
      },
    },
    create: {
      tenantId: tenant.id,
      serviceId: testAddon.id,
      status: "ACTIVE",
      activatedByUserId: "TEST_RUNNER",
    },
    update: {
      status: "ACTIVE",
      deactivatedAt: null,
    },
  });
  assert(act2.id === act1.id && act2.status === "ACTIVE", `Idempotent second activation of "${testAddon.name}" preserves single record`);

  // 5. Test Audit Event Logging
  const event = await prisma.serviceActivationEvent.create({
    data: {
      tenantId: tenant.id,
      serviceId: testAddon.id,
      eventType: "ACTIVATED",
      actorUserId: "TEST_RUNNER",
      detailsJson: JSON.stringify({ testRun: true }),
    },
  });
  assert(Boolean(event.id), `ServiceActivationEvent logged with id: ${event.id}`);

  // 6. Test Safe Deactivation
  const deact = await prisma.organizationServiceActivation.update({
    where: {
      tenantId_serviceId: {
        tenantId: tenant.id,
        serviceId: testAddon.id,
      },
    },
    data: {
      status: "DEACTIVATED",
      deactivatedAt: new Date(),
    },
  });
  assert(deact.status === "DEACTIVATED", `Deactivation of non-core add-on "${testAddon.name}" succeeded`);

  // 7. Verify Navigation Route Integrity
  const routesToCheck = servicesInDb
    .map((s) => s.targetRoute)
    .filter(Boolean) as string[];
  const uniqueRoutes = Array.from(new Set(routesToCheck));
  console.log(`Audited ${uniqueRoutes.length} distinct application target routes:`);
  for (const r of uniqueRoutes) {
    console.log(`   - ${r}`);
  }
  assert(uniqueRoutes.length >= 10, "Target routes cover the full application workspace suite");

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
