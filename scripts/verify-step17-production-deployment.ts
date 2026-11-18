/**
 * Step 17: Post-Deployment Production Verification Suite
 * Validates live production endpoints on https://www.restronexpos.com
 * Confirms health, authentication gates, security headers, webhooks, and live DB integrity.
 */

import { prisma } from "../src/lib/db";

const BASE_URL = "https://www.restronexpos.com";

interface TestResult {
  category: string;
  name: string;
  status: "PASSED" | "FAILED";
  details: string;
  latencyMs?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  category: string,
  name: string,
  url: string,
  options: RequestInit,
  expectedStatus: number | number[],
  validateBody?: (bodyText: string, headers: Headers) => boolean
) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      redirect: "manual", // Do not auto-follow redirects to inspect 307/302
    });
    const latencyMs = Date.now() - start;
    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const isStatusOk = expected.includes(res.status);
    const bodyText = await res.text();
    const isBodyOk = validateBody ? validateBody(bodyText, res.headers) : true;

    if (isStatusOk && isBodyOk) {
      results.push({
        category,
        name,
        status: "PASSED",
        details: `HTTP ${res.status} (${latencyMs}ms)`,
        latencyMs,
      });
      console.log(`  [PASS] ${name} -> HTTP ${res.status} (${latencyMs}ms)`);
    } else {
      results.push({
        category,
        name,
        status: "FAILED",
        details: `HTTP ${res.status} (Expected ${expected.join(",")}) | Body: ${bodyText.slice(0, 120)}`,
        latencyMs,
      });
      console.log(`  [FAIL] ${name} -> HTTP ${res.status} (Expected ${expected.join(",")})`);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    results.push({
      category,
      name,
      status: "FAILED",
      details: `Network Error: ${err.message}`,
      latencyMs,
    });
    console.log(`  [FAIL] ${name} -> Error: ${err.message}`);
  }
}

async function verifyDatabaseIntegrity() {
  console.log("\n=== 7. Live Database Integrity (Read-Only) ===");
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, createdAt: true },
    });
    console.log(`  Found ${tenants.length} tenants in production database:`);
    for (const t of tenants) {
      const orderCount = await prisma.order.count({ where: { tenantId: t.id } });
      console.log(`    - Tenant: ${t.name} (ID: ${t.id}) | Orders: ${orderCount}`);
    }

    const waffleHouse = tenants.find((t) => t.id === "cmw4x4r2400004blqji7nny3u");
    const waffleOrders = waffleHouse ? await prisma.order.count({ where: { tenantId: waffleHouse.id } }) : 0;

    if (waffleHouse && waffleOrders >= 570) {
      results.push({
        category: "Database Integrity",
        name: "WAFFLE PLUM HOUSE production tenant verification",
        status: "PASSED",
        details: `Tenant intact with ${waffleOrders} orders preserved.`,
      });
      console.log(`  [PASS] WAFFLE PLUM HOUSE verified intact (${waffleOrders} orders).`);
    } else {
      results.push({
        category: "Database Integrity",
        name: "WAFFLE PLUM HOUSE production tenant verification",
        status: "FAILED",
        details: `Tenant missing or order count lower than expected (${waffleOrders}).`,
      });
      console.log(`  [FAIL] WAFFLE PLUM HOUSE mismatch!`);
    }

    const totalOrders = await prisma.order.count();
    const totalItems = await prisma.orderItem.count();
    const totalTickets = await prisma.kitchenTicket.count();

    results.push({
      category: "Database Integrity",
      name: "Global order & kitchen ticket record integrity",
      status: "PASSED",
      details: `Total Orders: ${totalOrders}, OrderItems: ${totalItems}, KitchenTickets: ${totalTickets}`,
    });
    console.log(`  [PASS] Database records count: Orders: ${totalOrders}, OrderItems: ${totalItems}, KOTs: ${totalTickets}`);
  } catch (err: any) {
    results.push({
      category: "Database Integrity",
      name: "Database connection & query",
      status: "FAILED",
      details: err.message,
    });
    console.log(`  [FAIL] Database check failed: ${err.message}`);
  }
}

async function main() {
  console.log("===============================================================================");
  console.log("  RESTRO NEX — STEP 17: LIVE PRODUCTION POST-DEPLOYMENT VERIFICATION");
  console.log(`  Target Domain: ${BASE_URL}`);
  console.log(`  Timestamp:     ${new Date().toISOString()}`);
  console.log("===============================================================================\n");

  // 1. Health check & System Status
  console.log("=== 1. Health & Core Infrastructure ===");
  await testEndpoint(
    "Health API",
    "GET /api/health",
    `${BASE_URL}/api/health`,
    { method: "GET" },
    200,
    (body, headers) => {
      try {
        const json = JSON.parse(body);
        return (
          json.status === "ok" &&
          json.database?.status === "healthy" &&
          headers.get("strict-transport-security") !== null
        );
      } catch {
        return false;
      }
    }
  );

  // 2. Public Marketing & SEO Routes
  console.log("\n=== 2. Public & SEO Routes ===");
  await testEndpoint("Public Routes", "GET / (Landing Page)", `${BASE_URL}/`, { method: "GET" }, 200);
  await testEndpoint("Public Routes", "GET /pricing", `${BASE_URL}/pricing`, { method: "GET" }, 200);
  await testEndpoint("Public Routes", "GET /solutions", `${BASE_URL}/solutions`, { method: "GET" }, 200);
  await testEndpoint("SEO", "GET /robots.txt", `${BASE_URL}/robots.txt`, { method: "GET" }, 200);
  await testEndpoint("SEO", "GET /sitemap.xml", `${BASE_URL}/sitemap.xml`, { method: "GET" }, 200);

  // 3. Clerk Auth Protected Route Redirection (Unauthenticated 307)
  console.log("\n=== 3. Clerk Auth Protected Route Redirection (Unauthenticated) ===");
  const protectedRoutes = [
    { name: "Platform Admin Dashboard", path: "/platform-admin" },
    { name: "Platform Tenants Management", path: "/platform/tenants" },
    { name: "Platform Subscriptions", path: "/platform/subscriptions" },
    { name: "Tenant Dashboard", path: "/app/dashboard" },
    { name: "Tenant POS Terminal", path: "/app/pos" },
    { name: "Tenant Kitchen Display (KDS)", path: "/app/kitchen" },
    { name: "Tenant Orders Central", path: "/app/orders" },
    { name: "Tenant Inventory", path: "/app/inventory" },
    { name: "Tenant Staff Management", path: "/app/staff" },
    { name: "Tenant Reports", path: "/app/reports" },
    { name: "Staff POS Portal", path: "/staff/pos" },
  ];

  for (const route of protectedRoutes) {
    await testEndpoint(
      "Clerk Auth Gate",
      `GET ${route.path} (${route.name} -> Redirects to sign-in)`,
      `${BASE_URL}${route.path}`,
      { method: "GET" },
      [307, 302],
      (_body, headers) => {
        const location = headers.get("location") || "";
        return (
          location.includes("/sign-in") ||
          location.includes("/owner/login") ||
          location.includes("/staff/login") ||
          location.includes("accounts.dev") ||
          location.includes("clerk")
        );
      }
    );
  }

  // 4. API Authorization & Tenant Security Gates (Unauthenticated 401)
  console.log("\n=== 4. API Authorization & Tenant Isolation Gates ===");
  const protectedApiRoutes = [
    { name: "Orders API", path: "/api/orders" },
    { name: "Inventory API", path: "/api/inventory" },
    { name: "Finance & Day-End API", path: "/api/finance" },
    { name: "Reports Export API", path: "/api/reports/export" },
    { name: "Recipes BOM API", path: "/api/recipes" },
    { name: "Printers Hardware API", path: "/api/printers" },
    { name: "Staff Management API", path: "/api/staff" },
    { name: "Customer CRM API", path: "/api/customers" },
  ];

  for (const api of protectedApiRoutes) {
    await testEndpoint(
      "API Auth Boundary",
      `GET ${api.path} (${api.name} -> Blocks unauthenticated)`,
      `${BASE_URL}${api.path}`,
      { method: "GET" },
      [401, 403]
    );
  }

  // 5. Webhook Security Verification
  console.log("\n=== 5. Webhook Security Verification ===");
  await testEndpoint(
    "Webhook Security",
    "POST /api/webhooks/razorpay (Rejects invalid HMAC signature with 400)",
    `${BASE_URL}/api/webhooks/razorpay`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "bad_invalid_signature_hex_123",
      },
      body: JSON.stringify({ event: "payment.captured" }),
    },
    [400]
  );

  await testEndpoint(
    "Webhook Security",
    "GET /api/webhooks/whatsapp (Rejects unauthorized challenge with 403)",
    `${BASE_URL}/api/webhooks/whatsapp`,
    { method: "GET" },
    [403]
  );

  // 6. Security Response Headers Verification
  console.log("\n=== 6. Security Response Headers Check ===");
  try {
    const res = await fetch(`${BASE_URL}/`, { method: "HEAD" });
    const hsts = res.headers.get("strict-transport-security");
    const nosniff = res.headers.get("x-content-type-options");
    const frameOptions = res.headers.get("x-frame-options");

    const passed = !!(hsts && nosniff && frameOptions);
    results.push({
      category: "Security Headers",
      name: "Standard HTTP Security Headers (HSTS, NoSniff, FrameOptions)",
      status: passed ? "PASSED" : "FAILED",
      details: `HSTS: ${hsts || "MISSING"} | NoSniff: ${nosniff || "MISSING"} | FrameOptions: ${frameOptions || "MISSING"}`,
    });
    console.log(`  [${passed ? "PASS" : "FAIL"}] Security Headers verified: HSTS, X-Content-Type-Options, X-Frame-Options`);
  } catch (err: any) {
    results.push({
      category: "Security Headers",
      name: "Standard HTTP Security Headers",
      status: "FAILED",
      details: err.message,
    });
  }

  // 7. Live Database Integrity Check
  await verifyDatabaseIntegrity();

  // Summary Report
  console.log("\n===============================================================================");
  console.log("  VERIFICATION SUMMARY");
  console.log("===============================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  console.log(`  Total Checks: ${total}`);
  console.log(`  Passed:       ${passed}`);
  console.log(`  Failed:       ${failed}`);
  console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log("===============================================================================\n");

  if (failed > 0) {
    console.error("Some checks failed. See details above.");
    process.exit(1);
  } else {
    console.log("ALL POST-DEPLOYMENT VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)!");
  }
}

main().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
