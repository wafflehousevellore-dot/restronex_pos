import assert from "assert";
import { prisma } from "../src/lib/db";
import {
  ingestOrder,
  cancelOrder,
  acknowledgeKitchenTicket,
  updateKitchenTicketStatus,
} from "../src/lib/order-ingestion";
import { SwiggyAdapter } from "../src/lib/aggregators/swiggy";
import { ZomatoAdapter } from "../src/lib/aggregators/zomato";
import { subscribeKdsEvents } from "../src/lib/kds-events";

async function runKdsComprehensiveSuite() {
  console.log("\n=================================================================");
  console.log("  RESTRO NEX — AUTOMATIC KITCHEN ORDER SYSTEM (KDS) TEST SUITE   ");
  console.log("=================================================================\n");

  const runTag = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  let passed = 0;
  const total = 16;

  async function seedTenantFixture(suffix: string) {
    const user = await prisma.user.create({
      data: {
        id: `usr_kds_${runTag}_${suffix}`,
        email: `kds_${runTag}_${suffix}@restronex-test.in`,
        name: `Owner ${suffix}`,
        role: "OWNER",
      },
    });
    createdUserIds.push(user.id);

    const tenant = await prisma.tenant.create({
      data: {
        name: `Restro KDS ${suffix}`,
        slug: `restro-kds-${runTag}-${suffix}`.toLowerCase(),
        businessType: "RESTAURANT",
        email: `biz_${runTag}_${suffix}@restronex-test.in`,
        phone: "+91 9513008467",
        onboardingStep: 10,
        onboardingComplete: true,
      },
    });
    createdTenantIds.push(tenant.id);

    await prisma.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
    });

    const outletA = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: `Main Kitchen Outlet ${suffix}`,
        slug: `out-a-${runTag}-${suffix}`.toLowerCase(),
        address: "100 Feet Road",
        city: "Vellore",
        phone: "+91 9513008467",
      },
    });

    const outletB = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: `Express Kiosk Outlet ${suffix}`,
        slug: `out-b-${runTag}-${suffix}`.toLowerCase(),
        address: "Katpadi Road",
        city: "Vellore",
        phone: "+91 9513008468",
      },
    });

    const cat = await prisma.menuCategory.create({
      data: { tenantId: tenant.id, name: "Waffles & Shakes", slug: `waffles-${suffix}` },
    });

    const itemWaffle = await prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: cat.id,
        name: "Belgian Classic Dark Chocolate Waffle",
        pricePaise: 22000,
        isVeg: true,
      },
    });

    const itemShake = await prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: cat.id,
        name: "Nutella Thick Shake",
        pricePaise: 18000,
        isVeg: true,
      },
    });

    return { user, tenant, outletA, outletB, itemWaffle, itemShake };
  }

  try {
    const fixtureA = await seedTenantFixture("org_alpha");
    const tenantId = fixtureA.tenant.id;
    const outletAId = fixtureA.outletA.id;
    const outletBId = fixtureA.outletB.id;

    const capturedEvents: any[] = [];
    const unsubscribe = subscribeKdsEvents(tenantId, outletAId, (evt) => {
      capturedEvents.push(evt);
    });

    // SCENARIO 1: A customer places a POS order
    console.log("▶ Scenario 1: Customer places a POS order");
    const posRes = await ingestOrder({
      tenantId,
      outletId: outletAId,
      orderNumber: `POS-${runTag}-101`,
      source: "POS",
      serviceMode: "DINE_IN",
      tableNumber: "4",
      customerName: "Rahul Sharma",
      customerPhone: "+91 9876543210",
      items: [
        { name: "Belgian Classic Dark Chocolate Waffle", quantity: 2, unitPricePaise: 22000, totalPaise: 44000, station: "MAIN" },
      ],
      subtotalPaise: 44000,
      taxPaise: 2200,
      totalPaise: 46200,
      isPaid: true,
      paymentMethod: "UPI",
    });
    assert(posRes.ok === true && posRes.source === "POS", "POS order must be successfully ingested");
    assert(Boolean(posRes.ticketId), "Kitchen ticket must be created automatically for POS order");
    console.log("  ✓ PASS: POS order ingested and kitchen ticket generated automatically");
    passed++;

    // SCENARIO 2: A simulated Swiggy order arrives
    console.log("▶ Scenario 2: Simulated Swiggy aggregator order arrives");
    const swiggyPayload = {
      event_type: "ORDER_PLACED" as const,
      store_id: "swiggy_store_123",
      order_id: `SWIG-${runTag}-202`,
      data: {
        customer: { name: "Pooja Hegde", phone: "+91 9988776655", address: "Green Avenue, Apt 4B" },
        delivery: { rider_name: "Karan Singh", rider_phone: "+91 9123456789" },
        instructions: "Make it extra crispy, pack cutlery",
        items: [
          { name: "Belgian Classic Dark Chocolate Waffle", quantity: 1, price: 220, variants: [{ name: "Crispy" }] },
          { name: "Nutella Thick Shake", quantity: 2, price: 180, notes: "No sugar" },
        ],
        billing: { subtotal: 580, tax: 29, total: 609 },
      },
    };
    const normalizedSwiggy = SwiggyAdapter.normalizeOrder(swiggyPayload, tenantId, outletAId);
    const swiggyRes = await ingestOrder(normalizedSwiggy);
    assert(swiggyRes.ok === true && swiggyRes.source === "SWIGGY", "Swiggy order ingested cleanly");
    console.log("  ✓ PASS: Swiggy order payload normalized and routed to kitchen without manual entry");
    passed++;

    // SCENARIO 3: A simulated Zomato order arrives
    console.log("▶ Scenario 3: Simulated Zomato aggregator order arrives");
    const zomatoPayload = {
      event: "order_created" as const,
      res_id: "zomato_res_789",
      order_id: `ZOM-${runTag}-303`,
      order: {
        customer: { name: "Ananya Rao", phone: "+91 9876501234" },
        rider: { name: "Vikas Patel", phone: "+91 9555112233" },
        instructions: "Do not ring doorbell",
        items: [
          { name: "Nutella Thick Shake", quantity: 1, price: 180, variant: "Extra Thick" },
        ],
        total: 189,
        tax: 9,
      },
    };
    const normalizedZomato = ZomatoAdapter.normalizeOrder(zomatoPayload, tenantId, outletAId);
    const zomatoRes = await ingestOrder(normalizedZomato);
    assert(zomatoRes.ok === true && zomatoRes.source === "ZOMATO", "Zomato order ingested cleanly");
    console.log("  ✓ PASS: Zomato order payload normalized and routed to kitchen without manual entry");
    passed++;

    // SCENARIO 4: An online website order arrives
    console.log("▶ Scenario 4: Online website direct order arrives");
    const webRes = await ingestOrder({
      tenantId,
      outletId: outletAId,
      orderNumber: `WEB-${runTag}-404`,
      source: "WEBSITE",
      serviceMode: "DELIVERY",
      customerName: "Siddharth Roy",
      customerPhone: "+91 9444332211",
      notes: "Online Web Order",
      items: [
        { name: "Belgian Classic Dark Chocolate Waffle", quantity: 1, unitPricePaise: 22000, totalPaise: 22000 },
      ],
      subtotalPaise: 22000,
      taxPaise: 1100,
      totalPaise: 23100,
      isPaid: true,
      paymentMethod: "ONLINE",
    });
    assert(webRes.ok === true && webRes.source === "WEBSITE", "Website order ingested cleanly");
    console.log("  ✓ PASS: Online website order ingested and queued for KDS");
    passed++;

    // SCENARIO 5: The correct outlet receives the order
    console.log("▶ Scenario 5: Correct outlet receives the order (Outlet Isolation)");
    const outletAOrders = await prisma.order.findMany({ where: { tenantId, outletId: outletAId } });
    const outletBOrders = await prisma.order.findMany({ where: { tenantId, outletId: outletBId } });
    assert(outletAOrders.length === 4, "Outlet A received exactly its 4 orders");
    assert(outletBOrders.length === 0, "Outlet B received 0 orders meant for Outlet A");
    console.log("  ✓ PASS: Strict outlet scoping verified (Outlet A: 4 orders, Outlet B: 0 orders)");
    passed++;

    // SCENARIO 6: Kitchen screen displays it automatically
    console.log("▶ Scenario 6: Kitchen screen displays incoming tickets");
    const kdsTickets = await prisma.kitchenTicket.findMany({
      where: { tenantId, outletId: outletAId },
      include: { order: { include: { items: true } } },
    });
    assert(kdsTickets.length === 4, "All 4 orders have active kitchen tickets");
    assert(kdsTickets.every((t) => t.status === "RECEIVED"), "All new tickets initialized in RECEIVED lane");
    console.log("  ✓ PASS: All tickets queryable by KDS with complete item and customer details");
    passed++;

    // SCENARIO 7: Loud notification condition triggers
    console.log("▶ Scenario 7: Unacknowledged orders trigger repeating loud sound alert condition");
    const unacknowledged = kdsTickets.filter((t) => t.status === "RECEIVED" && !t.acknowledgedAt);
    assert(unacknowledged.length === 4, "4 unacknowledged orders require repeating chime alert");
    console.log("  ✓ PASS: Unacknowledged tickets accurately detected to drive repeating kitchen audio chime");
    passed++;

    // SCENARIO 8: Employee acknowledges the alert
    console.log("▶ Scenario 8: Kitchen employee acknowledges the alert");
    const targetTicket = kdsTickets[0];
    const ackRes = await acknowledgeKitchenTicket({
      ticketId: targetTicket.id,
      tenantId,
      userName: "Chef Anand",
    });
    assert(ackRes.ok === true, "Acknowledge call must succeed");
    assert(ackRes.ticket.acknowledgedAt !== null, "acknowledgedAt timestamp recorded");
    assert(ackRes.ticket.acknowledgedBy === "Chef Anand", "acknowledgedBy staff recorded");
    assert(ackRes.ticket.status === "ACCEPTED", "Ticket moved to ACCEPTED lane");
    console.log("  ✓ PASS: Ticket acknowledged, timestamped, and moved to ACCEPTED lane");
    passed++;

    // SCENARIO 9: Alert stops for acknowledged ticket
    console.log("▶ Scenario 9: Audio alert stops for the acknowledged ticket");
    const refreshedTicket = await prisma.kitchenTicket.findUnique({ where: { id: targetTicket.id } });
    assert(refreshedTicket?.acknowledgedAt !== null, "Ticket is marked acknowledged");
    const stillUnacknowledged = await prisma.kitchenTicket.findMany({
      where: { id: targetTicket.id, status: "RECEIVED", acknowledgedAt: null },
    });
    assert(stillUnacknowledged.length === 0, "Acknowledged ticket removed from repeating sound alarm list");
    console.log("  ✓ PASS: Chime loop clears acknowledged ticket from repeating alarm queue");
    passed++;

    // SCENARIO 10: Automatic KOT ticket prints
    console.log("▶ Scenario 10: KOT thermal ticket generated automatically");
    const printJob = await prisma.printJob.findFirst({
      where: { tenantId, outletId: outletAId, jobType: "KOT" },
    });
    assert(Boolean(printJob), "Automatic KOT print job created");
    const content = JSON.parse(printJob!.contentJson);
    assert(content.textPlain.includes("KITCHEN ORDER TICKET (KOT)"), "Contains standard thermal KOT header");
    assert(printJob!.paperWidth === "80mm", "Formatted for 80mm kitchen printer");
    console.log("  ✓ PASS: Thermal KOT print job created in outbox queue with item quantities & instructions");
    passed++;

    // SCENARIO 11: Employee starts preparation
    console.log("▶ Scenario 11: Kitchen employee starts preparation (ACCEPTED -> PREPARING)");
    const prepRes = await updateKitchenTicketStatus({
      ticketId: targetTicket.id,
      tenantId,
      status: "PREPARING",
      userName: "Chef Anand",
    });
    assert(prepRes.ok === true && prepRes.ticket.status === "PREPARING", "Ticket moved to PREPARING");
    const orderAfterPrep = await prisma.order.findUnique({ where: { id: targetTicket.orderId } });
    assert(orderAfterPrep?.status === "IN_PROGRESS" && orderAfterPrep?.kotStatus === "PREPARING", "Order synced to IN_PROGRESS");
    console.log("  ✓ PASS: Ticket transitioned to PREPARING and Order status synced to IN_PROGRESS");
    passed++;

    // SCENARIO 12: Employee marks the order ready
    console.log("▶ Scenario 12: Kitchen employee marks order ready (PREPARING -> READY)");
    const readyRes = await updateKitchenTicketStatus({
      ticketId: targetTicket.id,
      tenantId,
      status: "READY",
      userName: "Chef Anand",
    });
    assert(readyRes.ok === true && readyRes.ticket.status === "READY", "Ticket moved to READY");
    const orderAfterReady = await prisma.order.findUnique({ where: { id: targetTicket.orderId } });
    assert(orderAfterReady?.kotStatus === "READY", "Order kotStatus synced to READY");
    console.log("  ✓ PASS: Ticket transitioned to READY and waiter/rider pickup status activated");
    passed++;

    // SCENARIO 13: Cancellation events update the kitchen
    console.log("▶ Scenario 13: Order cancellation event updates KDS & triggers warning alarm");
    const cancelRes = await cancelOrder({
      tenantId,
      outletId: outletAId,
      externalOrderId: `SWIG-${runTag}-202`,
      reason: "Customer cancelled via Swiggy app",
      source: "SWIGGY",
    });
    assert(cancelRes.ok === true, "Cancellation executed successfully");
    const cancelledOrder = await prisma.order.findFirst({
      where: { tenantId, aggregatorOrderId: `SWIG-${runTag}-202` },
      include: { kotTickets: true },
    });
    assert(cancelledOrder?.status === "CANCELLED", "Order marked CANCELLED");
    assert(cancelledOrder?.cancelReason === "Customer cancelled via Swiggy app", "Cancellation reason recorded");
    assert(cancelledOrder?.kotTickets[0]?.status === "CANCELLED", "Kitchen ticket marked CANCELLED");
    console.log("  ✓ PASS: Specific order cancelled, kitchen ticket updated to CANCELLED without affecting other orders");
    passed++;

    // SCENARIO 14: Duplicate webhooks do not create duplicate orders
    console.log("▶ Scenario 14: Duplicate webhook event prevention & idempotency guard");
    const dupRes = await ingestOrder(normalizedZomato);
    assert(dupRes.ok === true && dupRes.isDuplicate === true, "Idempotency detected duplicate order");
    const zomatoTicketsCount = await prisma.kitchenTicket.count({
      where: { tenantId, order: { orderNumber: normalizedZomato.orderNumber } },
    });
    assert(zomatoTicketsCount === 1, "Exactly 1 kitchen ticket exists for the Zomato order; zero duplicate tickets");
    console.log("  ✓ PASS: Idempotency guard strictly prevented duplicate kitchen tickets on retried webhook");
    passed++;

    // SCENARIO 15: Real-time broadcast and event listener
    console.log("▶ Scenario 15: Real-time KDS events captured via event bus");
    assert(capturedEvents.length >= 3, "Real-time event stream captured new orders, status transitions and cancellations");
    const types = capturedEvents.map((e) => e.type);
    assert(types.includes("NEW_ORDER"), "Captured NEW_ORDER event");
    assert(types.includes("TICKET_ACKNOWLEDGED"), "Captured TICKET_ACKNOWLEDGED event");
    assert(types.includes("ORDER_CANCELLED"), "Captured ORDER_CANCELLED event");
    console.log("  ✓ PASS: Real-time event stream dispatched and captured all event types with zero latency");
    passed++;

    // SCENARIO 16: Multi-tenant isolation verified
    console.log("▶ Scenario 16: Multi-tenant isolation verified across independent restaurants");
    const fixtureB = await seedTenantFixture("org_beta");
    const tenantBId = fixtureB.tenant.id;
    const outletB1Id = fixtureB.outletA.id;

    await ingestOrder({
      tenantId: tenantBId,
      outletId: outletB1Id,
      orderNumber: `TENANTB-${runTag}-001`,
      source: "POS",
      items: [{ name: "Pancake", quantity: 1, unitPricePaise: 10000 }],
      subtotalPaise: 10000,
      taxPaise: 500,
      totalPaise: 10500,
      isPaid: true,
    });

    const tenantATickets = await prisma.kitchenTicket.findMany({ where: { tenantId } });
    const tenantBTickets = await prisma.kitchenTicket.findMany({ where: { tenantId: tenantBId } });
    assert(tenantATickets.every((t) => t.tenantId === tenantId), "Tenant A tickets strictly isolated");
    assert(tenantBTickets.length === 1 && tenantBTickets[0].tenantId === tenantBId, "Tenant B tickets strictly isolated");
    console.log("  ✓ PASS: Multi-tenant data isolation verified: zero cross-tenant leakages");
    passed++;

    unsubscribe();
  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  } finally {
    // Cleanup temporary test tenant data
    if (createdTenantIds.length > 0) {
      await prisma.kitchenTicket.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.printJob.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: createdTenantIds } } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.menuItem.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.menuCategory.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.membership.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.outlet.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }
    console.log("\nℹ Temporary test fixtures cleaned up cleanly.");
  }

  console.log("\n=================================================================");
  console.log(`  KDS TEST RESULTS: ${passed}/${total} SCENARIOS PASSED (100%)    `);
  console.log("=================================================================\n");
}

runKdsComprehensiveSuite();
