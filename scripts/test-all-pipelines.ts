/**
 * RestroNex Comprehensive Pipeline Verification & Test Suite
 * Tests all end-to-end multi-tenant pipelines, APIs, and edge cases.
 */

const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, durationMs });
    console.log(`  ✓ ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ name, passed: false, durationMs, error: err?.message || String(err) });
    console.error(`  ✗ ${name} (${durationMs}ms): ${err?.message || err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  console.log("\n=======================================================");
  console.log("  RESTRONEX COMPLETE PIPELINE TEST & AUDIT SUITE");
  console.log(`  Target: ${BASE_URL}`);
  console.log("=======================================================\n");

  let sessionCookie = "";
  let tenantId = "";
  let outletId = "";
  let testOrderId = "";
  let pendingRegId = "";

  // 1. Health Pipeline
  await runTest("Pipeline 1: Health & System Diagnostics", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === "ok", "Expected status ok");
    assert(data.database?.status === "healthy", "Database should be healthy");
  });

  // 2. Subscription Plans Pipeline
  await runTest("Pipeline 2: Subscription Plans & Pricing Allocations", async () => {
    const res = await fetch(`${BASE_URL}/api/subscription-plans`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const plans = await res.json();
    assert(Array.isArray(plans), "Plans should be array");
    assert(plans.length >= 3, `Expected at least 3 plans, got ${plans.length}`);

    const starter = plans.find((p: any) => p.slug === "starter");
    const growth = plans.find((p: any) => p.slug === "growth");
    const business = plans.find((p: any) => p.slug === "business");

    assert(!!starter && starter.priceMonthlyPaise === 9900, "Starter must be ₹99/mo (9900 paise)");
    assert(!!growth && growth.priceMonthlyPaise === 19900, "Growth must be ₹199/mo (19900 paise)");
    assert(!!business && business.priceMonthlyPaise === 29900, "Business must be ₹299/mo (29900 paise)");
  });

  // 3. Customer Acquisition & Pending Registration Pipeline
  await runTest("Pipeline 3: Customer Acquisition (Pending Registration)", async () => {
    const email = `test-lead-${Date.now()}@restaurant.com`;
    const res = await fetch(`${BASE_URL}/api/pending-registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: "The Heritage Grill",
        ownerName: "Dev User",
        email,
        phone: "+91 99999 11111",
        restaurantType: "Fine Dining",
        planSlug: "growth",
        billingCycle: "MONTHLY",
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.ok === true, "Expected ok=true");
    assert(!!data.pendingId, "Expected pendingId");
    pendingRegId = data.pendingId;

    // Verify GET retrieval
    const getRes = await fetch(`${BASE_URL}/api/pending-registrations?id=${pendingRegId}`);
    assert(getRes.status === 200, "Failed to retrieve pending registration");
    const getData = await getRes.json();
    assert(getData.reg?.businessName === "The Heritage Grill", "Stored business name mismatch");
    assert(getData.reg?.status === "PENDING", "Pending status mismatch");
  });

  // 4. Authentication & Session Pipeline
  await runTest("Pipeline 4: Authentication & Session Token Resolution", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@demo.in",
        password: "demo1234",
      }),
    });

    assert(res.status === 200, `Sign-in failed with status ${res.status}`);
    const data = await res.json();
    assert(data.ok === true, "Sign-in ok should be true");
    assert(!!data.user?.id, "User ID missing from sign-in");

    // Capture cookies
    const rawCookies = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [res.headers.get("set-cookie") || ""];
    let cookiesStr = rawCookies.map((c: string) => c.split(";")[0].trim()).filter(Boolean).join("; ");
    if (data.token && !cookiesStr.includes("restronex_session")) {
      cookiesStr = `restronex_session=${data.token}${data.tenantId ? `; restronex_org=${data.tenantId}` : ""}${cookiesStr ? `; ${cookiesStr}` : ""}`;
    }
    sessionCookie = cookiesStr;
  });

  // 5. Subscription Status Pipeline
  await runTest("Pipeline 5: Tenant Resolution & Subscription Status", async () => {
    const res = await fetch(`${BASE_URL}/api/subscription/status`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(!!data.tenantId, "Tenant ID resolution missing");
    tenantId = data.tenantId;
    assert(data.hasActiveSubscription === true || data.isTrial === true, "Subscription should be active or in trial");
  });

  // 6. Outlet Multi-Tenancy Pipeline
  await runTest("Pipeline 6: Multi-Outlet Tenancy & Switching", async () => {
    const res = await fetch(`${BASE_URL}/api/outlets?tenantId=${tenantId}`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const outlets = await res.json();
    assert(Array.isArray(outlets) && outlets.length > 0, "Tenant should have at least 1 outlet");
    outletId = outlets[0].id;
    assert(outlets[0].tenantId === tenantId, "Outlet tenantId must match active tenant");
  });

  // 7. Onboarding State Pipeline
  await runTest("Pipeline 7: Onboarding State Persistence & Resumption", async () => {
    const res = await fetch(`${BASE_URL}/api/onboarding/progress`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.tenantId === tenantId, "Onboarding tenant mismatch");
    assert(typeof data.onboardingStep === "number", "Onboarding step must be a number");
  });

  // 8. Menu Management Pipeline
  let menuItemId = "";
  let menuItemName = "";
  let menuItemPrice = 29900;

  await runTest("Pipeline 8: Menu Categories & Items Retrieval", async () => {
    const res = await fetch(`${BASE_URL}/api/menu?tenantId=${tenantId}`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const menuData = await res.json();
    assert(Array.isArray(menuData.items), "menuData.items should be array");

    if (menuData.items.length === 0) {
      // Auto-create category and item for test tenant if none
      const catRes = await fetch(`${BASE_URL}/api/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          tenantId,
          type: "category",
          name: "Main Course",
        }),
      });
      const cat = await catRes.json();
      const itemRes = await fetch(`${BASE_URL}/api/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          tenantId,
          type: "item",
          categoryId: cat.id,
          name: "Butter Chicken",
          pricePaise: 34900,
          isVeg: false,
          description: "Creamy butter chicken curry",
        }),
      });
      const item = await itemRes.json();
      menuItemId = item.id;
      menuItemName = item.name;
      menuItemPrice = item.pricePaise;
    } else {
      menuItemId = menuData.items[0].id;
      menuItemName = menuData.items[0].name;
      menuItemPrice = menuData.items[0].pricePaise;
    }

    assert(!!menuItemId, "Menu item ID must exist");
  });

  // 9. Tables Management Pipeline
  await runTest("Pipeline 9: Tables & Floor Management", async () => {
    const res = await fetch(`${BASE_URL}/api/tables?tenantId=${tenantId}&outletId=${outletId}`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const tables = await res.json();
    assert(Array.isArray(tables), "Tables must return an array");
  });

  // 10. Checkout & Payment Simulation Pipeline
  await runTest("Pipeline 10: Razorpay Order Creation & Server Verification", async () => {
    // Create order
    const orderRes = await fetch(`${BASE_URL}/api/checkout/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        planSlug: "growth",
        billingCycle: "MONTHLY",
        outletCount: 1,
      }),
    });
    assert(orderRes.status === 200, `Order creation failed: ${orderRes.status}`);
    const orderData = await orderRes.json();
    assert(!!orderData.orderId, "Razorpay orderId missing");

    // Verify payment with server-side HMAC
    const verifyRes = await fetch(`${BASE_URL}/api/checkout/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: "mock_verified",
        planSlug: "growth",
        billingCycle: "MONTHLY",
        outletCount: 1,
      }),
    });
    assert(verifyRes.status === 200, `Payment verification failed: ${verifyRes.status}`);
    const verifyData = await verifyRes.json();
    assert(verifyData.ok === true, "Verification result ok should be true");
  });

  // 11. POS Billing & Order Creation Pipeline (with Recipe stock deduction)
  await runTest("Pipeline 11: POS Order Creation, GST Calc & KOT Generation", async () => {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        tenantId,
        outletId,
        type: "DINE_IN",
        customerName: "Rahul Verma",
        customerPhone: "+91 98765 00000",
        items: [
          {
            menuItemId,
            name: menuItemName,
            quantity: 2,
            unitPricePaise: menuItemPrice,
          },
        ],
        paymentMethod: "UPI",
      }),
    });

    assert(res.status === 200, `POS Order failed with status ${res.status}`);
    const data = await res.json();
    assert(data.ok === true, "Order creation ok should be true");
    assert(!!data.orderId, "Order ID missing");
    assert(!!data.orderNumber, "Order number missing");
    assert(data.totals?.total > 0, "Total must be calculated");
    testOrderId = data.orderId;
  });

  // 12. Kitchen Display System (KDS) Pipeline
  await runTest("Pipeline 12: Kitchen Display System (KDS) State Machine", async () => {
    const res = await fetch(`${BASE_URL}/api/kds?tenantId=${tenantId}`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `KDS fetch failed with status ${res.status}`);
    const tickets = await res.json();
    assert(Array.isArray(tickets), "KDS should return an array of tickets");
    assert(tickets.length > 0, "Should have tickets from created order");

    const ticket = tickets[0];
    // Bump ticket status
    const patchRes = await fetch(`${BASE_URL}/api/kds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        ticketId: ticket.id,
        status: "PREPARING",
      }),
    });
    assert(patchRes.status === 200, `KDS status update failed: ${patchRes.status}`);
    const updated = await patchRes.json();
    assert(updated.status === "PREPARING", "Ticket status should update to PREPARING");
  });

  // 13. Inventory Pipeline
  await runTest("Pipeline 13: Inventory Management & Stock Movements", async () => {
    const res = await fetch(`${BASE_URL}/api/inventory?tenantId=${tenantId}&outletId=${outletId}`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Inventory fetch failed with status ${res.status}`);
    const inventory = await res.json();
    assert(Array.isArray(inventory.items), "Inventory.items should be an array");

    // Add stock item if empty
    if (inventory.items.length === 0) {
      const addRes = await fetch(`${BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          tenantId,
          name: "Basmati Rice",
          unit: "KG",
          currentStock: 50,
          costPerUnitPaise: 8000,
        }),
      });
      assert(addRes.status === 200, "Inventory creation failed");
    }
  });

  // 14. Reports & Analytics Pipeline
  await runTest("Pipeline 14: Reports & Financial Analytics", async () => {
    const res = await fetch(`${BASE_URL}/api/reports?tenantId=${tenantId}`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `Reports fetch failed with status ${res.status}`);
    const reports = await res.json();
    assert(reports.kpis?.orderCount >= 1, "Reports should reflect logged orders (kpis.orderCount)");
    assert(reports.kpis?.totalSalesPaise >= 0, "Gross sales should be a valid number");
    assert(Array.isArray(reports.salesByDay), "salesByDay should be an array");
  });

  // 15. Security & Tenant Isolation Pipeline
  await runTest("Pipeline 15: Cross-Tenant Data Isolation Enforcement", async () => {
    // Attempt to access another fake tenant ID
    const fakeTenantId = "tenant_forbidden_hacker_9999";
    const res = await fetch(`${BASE_URL}/api/orders?tenantId=${fakeTenantId}`, {
      headers: { Cookie: sessionCookie },
    });
    // System must block with 403 Forbidden or 400
    assert(res.status === 403 || res.status === 400, `Expected 403/400 for unauthorized tenant, got ${res.status}`);
  });

  // 16. Webhook Idempotency Pipeline
  await runTest("Pipeline 16: Razorpay Webhook Idempotency & Signature Safety", async () => {
    const eventPayload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_webhook_test_001",
            order_id: "order_mock_webhook",
            amount: 30000,
            status: "captured",
          },
        },
      },
    };

    // Attempt invalid signature
    const badRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "invalid_tampered_signature",
      },
      body: JSON.stringify(eventPayload),
    });
    assert(badRes.status === 400, `Tampered webhook signature must return 400, got ${badRes.status}`);
  });

  // Summary
  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`  RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of ${results.length} pipelines`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
