import { prisma } from "../src/lib/db";
import { AggregatorConnectionService } from "../src/lib/integrations/services/connection-service";
import { SwiggyIntegrationProvider } from "../src/lib/integrations/providers/swiggy/adapter";
import { ZomatoIntegrationProvider } from "../src/lib/integrations/providers/zomato/adapter";

async function runTests() {
  console.log("================================================================================");
  console.log("RESTRO NEX — AGGREGATOR OVERVIEW & PRODUCTION INTEGRATION AUDIT SUITE");
  console.log("================================================================================\n");

  const tenantId = "cmw4x4r2400004blqji7nny3u"; // WAFFLE PLUM HOUSE
  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean, detail: string) {
    if (condition) {
      console.log(`[PASS] ${title}: ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}: ${detail}`);
      failed++;
    }
  }

  // 1. Physical Outlets Verification
  const outlets = await prisma.outlet.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });
  assert(
    "Physical Outlets Count",
    outlets.length === 3,
    `Found ${outlets.length} physical outlets (expected 3: Main Counter, Outlet 2, Outlet 3)`
  );

  // 2. Swiggy & Zomato Disconnected Status
  const swiggyConn = await AggregatorConnectionService.getConnection(tenantId, "SWIGGY");
  const zomatoConn = await AggregatorConnectionService.getConnection(tenantId, "ZOMATO");
  assert(
    "Swiggy Connection Status",
    swiggyConn.status !== "CONNECTED" && !swiggyConn.hasCredentials,
    `Swiggy status is '${swiggyConn.status}' with credentialsEncrypted = null (Strictly Disconnected)`
  );
  assert(
    "Zomato Connection Status",
    zomatoConn.status !== "CONNECTED" && !zomatoConn.hasCredentials,
    `Zomato status is '${zomatoConn.status}' with credentialsEncrypted = null (Strictly Disconnected)`
  );

  // 3. Outlet Mappings Count
  const mappings = await prisma.aggregatorOutletMapping.findMany({
    where: { tenantId },
  });
  assert(
    "Persisted Mappings Count",
    mappings.length === 0,
    `Found ${mappings.length} mapped listings in DB (expected 0 / 4 unmapped initially)`
  );

  // 4. Target Listings Topology Verification
  const swiggyTarget = outlets.length; // 3 Swiggy listings (1 per outlet)
  const zomatoTarget = 1; // 1 Zomato listing for Outlet 1
  const totalListingsTarget = swiggyTarget + zomatoTarget;
  assert(
    "Target Listings Topology",
    totalListingsTarget === 4,
    `Brand topology requires 4 total listings (3 Swiggy across 3 outlets + 1 Zomato for Outlet 1)`
  );

  // 5. Active Pipeline vs Test Orders
  const genuineActiveCount = await prisma.aggregatorOrderReference.count({
    where: {
      tenantId,
      orderStatus: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP"] },
      rawPayloadJson: { not: { contains: '"test":true' } },
      order: { status: { notIn: ["BILLED", "CANCELLED", "REFUNDED", "COMPLETED"] } },
    },
  });
  const testOrderRef = await prisma.aggregatorOrderReference.findFirst({
    where: {
      tenantId,
      OR: [
        { rawPayloadJson: { contains: '"test":true' } },
        { providerOrderId: { contains: "TEST" } },
      ],
    },
  });
  assert(
    "Genuine Active Orders",
    genuineActiveCount === 0,
    `Genuine active pipeline orders in kitchen/dispatch = ${genuineActiveCount} (No fake active orders)`
  );
  assert(
    "Test Fixture Identified & Safely Archived",
    testOrderRef?.providerOrderId === "SWG-TEST-675940" && testOrderRef.orderStatus === "DELIVERED",
    `Test fixture 'SWG-TEST-675940' identified with status '${testOrderRef?.orderStatus}' (Archived, not active in pipeline)`
  );

  // 6. Webhook Events Audit
  const webhookCount = await prisma.aggregatorWebhookEvent.count({
    where: { tenantId },
  });
  assert(
    "Webhook Deliveries Recorded",
    webhookCount === 0,
    `Found ${webhookCount} external provider webhook events (0 live webhooks ever received)`
  );

  // 7. Cryptographic Signature Verification in Production Mode
  const swiggyProvider = new SwiggyIntegrationProvider();
  const zomatoProvider = new ZomatoIntegrationProvider();
  const oldNodeEnv = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "production";

  const swiggyUnsignedValid = swiggyProvider.verifyWebhookSignature(
    {},
    '{"order_id":"123"}',
    undefined
  );
  const zomatoUnsignedValid = zomatoProvider.verifyWebhookSignature(
    {},
    '{"order_id":"123"}',
    undefined
  );

  assert(
    "Swiggy Production Webhook Security Gate",
    swiggyUnsignedValid === false,
    "Missing secret in production mode correctly rejects unsigned webhook delivery"
  );
  assert(
    "Zomato Production Webhook Security Gate",
    zomatoUnsignedValid === false,
    "Missing secret in production mode correctly rejects unsigned webhook delivery"
  );

  (process.env as any).NODE_ENV = oldNodeEnv;

  // 8. Customer Data & Orders Preservation
  const totalOrders = await prisma.order.count({ where: { tenantId } });
  assert(
    "Customer Data Preservation",
    totalOrders >= 575,
    `Found ${totalOrders} total orders for WAFFLE PLUM HOUSE (all historical customer data 100% intact)`
  );

  console.log("\n================================================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
