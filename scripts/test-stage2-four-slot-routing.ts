import { prisma } from "../src/lib/db";
import { AggregatorOrderIngestionService } from "../src/lib/integrations/services/order-ingestion-service";
import { UnmappedStoreError } from "../src/lib/integrations/core/integration-errors";
import { AggregatorOutletMappingService } from "../src/lib/integrations/services/outlet-mapping-service";

async function runStage2Tests() {
  console.log("================================================================================");
  console.log("RESTRO NEX — STAGE 2: 4-LISTING TOPOLOGY & ROUTING VERIFICATION SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  }

  const tenant = await prisma.tenant.findFirst({
    where: { name: "WAFFLE PLUM HOUSE" },
    include: { outlets: { orderBy: { createdAt: "asc" } } },
  });

  if (!tenant || tenant.outlets.length < 3) {
    console.error("WAFFLE PLUM HOUSE tenant or 3 physical outlets not found.");
    process.exit(1);
  }

  const [outlet1, outlet2, outlet3] = tenant.outlets;
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Outlet 1: ${outlet1.name} (${outlet1.id})`);
  console.log(`Outlet 2: ${outlet2.name} (${outlet2.id})`);
  console.log(`Outlet 3: ${outlet3.name} (${outlet3.id})`);

  // Temporary test store IDs (clearly designated test fixtures)
  const TEST_SWIGGY_STORE_1 = "TEST-SWG-STORE-001";
  const TEST_ZOMATO_STORE_1 = "TEST-ZOM-STORE-001";
  const TEST_SWIGGY_STORE_2 = "TEST-SWG-STORE-002";
  const TEST_SWIGGY_STORE_3 = "TEST-SWG-STORE-003";
  const TEST_UNMAPPED_STORE = "TEST-UNMAPPED-STORE-999";

  try {
    // Clean up any leftovers from previous test runs
    await prisma.aggregatorOutletMapping.deleteMany({
      where: {
        providerStoreId: {
          in: [TEST_SWIGGY_STORE_1, TEST_ZOMATO_STORE_1, TEST_SWIGGY_STORE_2, TEST_SWIGGY_STORE_3, TEST_UNMAPPED_STORE],
        },
      },
    });

    // TEST 1: Map 4 listings across 3 physical outlets
    // Slot 1: Outlet 1 -> Swiggy
    const map1 = await AggregatorOutletMappingService.mapOutlet({
      tenantId: tenant.id,
      outletId: outlet1.id,
      provider: "SWIGGY",
      providerStoreId: TEST_SWIGGY_STORE_1,
      providerStoreName: "WPH Main Counter Swiggy",
    });
    assert(map1.providerStoreId === TEST_SWIGGY_STORE_1 && map1.outletId === outlet1.id, "Slot 1 Mapping: Outlet 1 -> Swiggy");

    // Slot 2: Outlet 1 -> Zomato
    const map2 = await AggregatorOutletMappingService.mapOutlet({
      tenantId: tenant.id,
      outletId: outlet1.id,
      provider: "ZOMATO",
      providerStoreId: TEST_ZOMATO_STORE_1,
      providerStoreName: "WPH Main Counter Zomato",
    });
    assert(map2.providerStoreId === TEST_ZOMATO_STORE_1 && map2.outletId === outlet1.id, "Slot 2 Mapping: Outlet 1 -> Zomato");

    // Slot 3: Outlet 2 -> Swiggy
    const map3 = await AggregatorOutletMappingService.mapOutlet({
      tenantId: tenant.id,
      outletId: outlet2.id,
      provider: "SWIGGY",
      providerStoreId: TEST_SWIGGY_STORE_2,
      providerStoreName: "WPH Outlet 2 Swiggy",
    });
    assert(map3.providerStoreId === TEST_SWIGGY_STORE_2 && map3.outletId === outlet2.id, "Slot 3 Mapping: Outlet 2 -> Swiggy");

    // Slot 4: Outlet 3 -> Swiggy
    const map4 = await AggregatorOutletMappingService.mapOutlet({
      tenantId: tenant.id,
      outletId: outlet3.id,
      provider: "SWIGGY",
      providerStoreId: TEST_SWIGGY_STORE_3,
      providerStoreName: "WPH Outlet 3 Swiggy",
    });
    assert(map4.providerStoreId === TEST_SWIGGY_STORE_3 && map4.outletId === outlet3.id, "Slot 4 Mapping: Outlet 3 -> Swiggy");

    // TEST 2: Verify total active mappings for tenant is 4
    const tenantMappings = await prisma.aggregatorOutletMapping.findMany({
      where: {
        tenantId: tenant.id,
        providerStoreId: { in: [TEST_SWIGGY_STORE_1, TEST_ZOMATO_STORE_1, TEST_SWIGGY_STORE_2, TEST_SWIGGY_STORE_3] },
      },
    });
    assert(tenantMappings.length === 4, "4-Slot Topology: 4 active provider listings persisted");

    // TEST 3: Order Routing for Slot 1 (Swiggy -> Outlet 1)
    const order1 = await AggregatorOrderIngestionService.processOrder({
      provider: "SWIGGY",
      providerOrderId: "STAGE2-ORD-SWG-001",
      displayOrderId: "SWG-001",
      providerStoreId: TEST_SWIGGY_STORE_1,
      orderStatus: "ACCEPTED",
      prepTimeMinutes: 15,
      customerName: "Stage 2 QA Guest 1",
      customerMaskedPhone: "+919876543201",
      grossAmountPaise: 30250,
      taxesPaise: 1250,
      deliveryFeePaise: 3000,
      discountPaise: 0,
      items: [{ providerItemId: "PI-01", name: "Belgian Chocolate Waffle", quantity: 1, unitPricePaise: 25000 }],
      rawPayloadJson: JSON.stringify({ testFixture: true, slot: 1 }),
    });
    const dbOrder1 = await prisma.order.findUnique({ where: { id: order1.orderId } });
    assert(dbOrder1?.outletId === outlet1.id, "Slot 1 Routing: Swiggy order routed strictly to Outlet 1 (Main Counter)");

    // TEST 4: Order Routing for Slot 2 (Zomato -> Outlet 1)
    const order2 = await AggregatorOrderIngestionService.processOrder({
      provider: "ZOMATO",
      providerOrderId: "STAGE2-ORD-ZOM-001",
      displayOrderId: "ZOM-001",
      providerStoreId: TEST_ZOMATO_STORE_1,
      orderStatus: "ACCEPTED",
      prepTimeMinutes: 20,
      customerName: "Stage 2 QA Guest 2",
      customerMaskedPhone: "+919876543202",
      grossAmountPaise: 40750,
      taxesPaise: 1750,
      deliveryFeePaise: 3000,
      discountPaise: 0,
      items: [{ providerItemId: "PI-02", name: "Nutella Waffle", quantity: 1, unitPricePaise: 35000 }],
      rawPayloadJson: JSON.stringify({ testFixture: true, slot: 2 }),
    });
    const dbOrder2 = await prisma.order.findUnique({ where: { id: order2.orderId } });
    assert(dbOrder2?.outletId === outlet1.id, "Slot 2 Routing: Zomato order routed strictly to Outlet 1 (Main Counter)");

    // TEST 5: Order Routing for Slot 3 (Swiggy -> Outlet 2)
    const order3 = await AggregatorOrderIngestionService.processOrder({
      provider: "SWIGGY",
      providerOrderId: "STAGE2-ORD-SWG-002",
      displayOrderId: "SWG-002",
      providerStoreId: TEST_SWIGGY_STORE_2,
      orderStatus: "ACCEPTED",
      prepTimeMinutes: 15,
      customerName: "Stage 2 QA Guest 3",
      customerMaskedPhone: "+919876543203",
      grossAmountPaise: 24000,
      taxesPaise: 1000,
      deliveryFeePaise: 2500,
      discountPaise: 0,
      items: [{ providerItemId: "PI-03", name: "Berry Blast Waffle", quantity: 1, unitPricePaise: 20000 }],
      rawPayloadJson: JSON.stringify({ testFixture: true, slot: 3 }),
    });
    const dbOrder3 = await prisma.order.findUnique({ where: { id: order3.orderId } });
    assert(dbOrder3?.outletId === outlet2.id, "Slot 3 Routing: Swiggy order routed strictly to Outlet 2 (Branch)");

    // TEST 6: Order Routing for Slot 4 (Swiggy -> Outlet 3)
    const order4 = await AggregatorOrderIngestionService.processOrder({
      provider: "SWIGGY",
      providerOrderId: "STAGE2-ORD-SWG-003",
      displayOrderId: "SWG-003",
      providerStoreId: TEST_SWIGGY_STORE_3,
      orderStatus: "ACCEPTED",
      prepTimeMinutes: 15,
      customerName: "Stage 2 QA Guest 4",
      customerMaskedPhone: "+919876543204",
      grossAmountPaise: 46000,
      taxesPaise: 2000,
      deliveryFeePaise: 3000,
      discountPaise: 0,
      items: [{ providerItemId: "PI-04", name: "Red Velvet Special Waffle", quantity: 1, unitPricePaise: 40000 }],
      rawPayloadJson: JSON.stringify({ testFixture: true, slot: 4 }),
    });
    const dbOrder4 = await prisma.order.findUnique({ where: { id: order4.orderId } });
    assert(dbOrder4?.outletId === outlet3.id, "Slot 4 Routing: Swiggy order routed strictly to Outlet 3 (Branch)");

    // TEST 7: Deduplication & Idempotency Check
    const dupResult = await AggregatorOrderIngestionService.processOrder({
      provider: "SWIGGY",
      providerOrderId: "STAGE2-ORD-SWG-001", // Duplicate of Order 1
      displayOrderId: "SWG-001",
      providerStoreId: TEST_SWIGGY_STORE_1,
      orderStatus: "ACCEPTED",
      prepTimeMinutes: 15,
      customerName: "Duplicate Guest",
      customerMaskedPhone: "+919876543201",
      grossAmountPaise: 30250,
      taxesPaise: 1250,
      deliveryFeePaise: 3000,
      discountPaise: 0,
      items: [{ providerItemId: "PI-01", name: "Belgian Chocolate Waffle", quantity: 1, unitPricePaise: 25000 }],
      rawPayloadJson: JSON.stringify({ testFixture: true, duplicate: true }),
    });
    assert(dupResult.isDuplicate === true && dupResult.orderId === order1.orderId, "Deduplication: Duplicate webhook event rejected (isDuplicate: true)");

    // TEST 8: Unmapped Store Routing & Exception Queue Gate
    let unmappedThrew = false;
    try {
      await AggregatorOrderIngestionService.processOrder({
        provider: "SWIGGY",
        providerOrderId: "STAGE2-ORD-UNMAPPED-999",
        displayOrderId: "SWG-999",
        providerStoreId: TEST_UNMAPPED_STORE,
        orderStatus: "ACCEPTED",
        prepTimeMinutes: 15,
        customerName: "Unmapped Guest",
        customerMaskedPhone: "+919876543299",
        grossAmountPaise: 18250,
        taxesPaise: 750,
        deliveryFeePaise: 2000,
        discountPaise: 0,
        items: [{ providerItemId: "PI-99", name: "Unmapped Item", quantity: 1, unitPricePaise: 15000 }],
        rawPayloadJson: JSON.stringify({ testFixture: true, unmapped: true }),
      });
    } catch (err: any) {
      if (err instanceof UnmappedStoreError) {
        unmappedThrew = true;
      }
    }
    assert(unmappedThrew, "Unmapped Store Guard: Throws UnmappedStoreError and halts ingestion");

    // TEST 9: Unmapped Store recorded in AggregatorExceptionQueue
    const exceptionRecord = await prisma.aggregatorExceptionQueue.findFirst({
      where: { externalOrderId: "STAGE2-ORD-UNMAPPED-999", errorType: "OUTLET_UNMAPPED" },
    });
    assert(!!exceptionRecord, "Exception Queue: Unmapped order enqueued in AggregatorExceptionQueue (never defaulted to Outlet 1)");

    // Clean up test orders and test mappings
    await prisma.aggregatorOrderReference.deleteMany({
      where: {
        providerOrderId: {
          in: ["STAGE2-ORD-SWG-001", "STAGE2-ORD-ZOM-001", "STAGE2-ORD-SWG-002", "STAGE2-ORD-SWG-003"],
        },
      },
    });
    await prisma.orderItem.deleteMany({
      where: {
        orderId: { in: [order1.orderId, order2.orderId, order3.orderId, order4.orderId] },
      },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [order1.orderId, order2.orderId, order3.orderId, order4.orderId] } },
    });
    await prisma.aggregatorExceptionQueue.deleteMany({
      where: { externalOrderId: "STAGE2-ORD-UNMAPPED-999" },
    });
    await prisma.aggregatorOutletMapping.deleteMany({
      where: {
        providerStoreId: {
          in: [TEST_SWIGGY_STORE_1, TEST_ZOMATO_STORE_1, TEST_SWIGGY_STORE_2, TEST_SWIGGY_STORE_3],
        },
      },
    });

    console.log("Test fixtures safely cleaned up.");

    console.log("================================================================================");
    console.log(`STAGE 2 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStage2Tests();
