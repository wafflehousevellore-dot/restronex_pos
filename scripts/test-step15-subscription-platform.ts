/**
 * Automated Verification Suite for Step 15:
 * Enterprise Subscription, Billing, Platform Admin & SaaS Control Center
 */

import {
  CENTRAL_SUBSCRIPTION_PLANS,
  getCentralPlanBySlug,
  calculateSubscriptionMrrPaise,
  calculateSubscriptionArrPaise,
  calculateGstBreakdownPaise,
  generateSaaSInvoiceNumber,
  GRACE_PERIOD_DAYS,
} from "../src/lib/subscription-plans-config";

import {
  evaluateSubscriptionLifecycle,
} from "../src/lib/subscription-lifecycle";

import {
  ALL_PLATFORM_ROLES,
  ALL_PLATFORM_PERMISSIONS,
  hasPlatformPermission,
  PlatformRole,
} from "../src/lib/platform-roles";

import {
  PRIMARY_PLATFORM_OWNER_EMAIL,
} from "../src/lib/platform-auth";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   STEP 15: ENTERPRISE SUBSCRIPTION & PLATFORM ADMIN TESTS");
  console.log("=======================================================\n");

  // 1. Centralized Pricing Consistency
  console.log("--- 1. Centralized Subscription Plan Pricing ---");
  const starter = getCentralPlanBySlug("starter");
  assert(!!starter, "Starter plan exists");
  assert(starter?.priceMonthlyRupees === 99, "Starter monthly price is ₹99");
  assert(starter?.priceAnnualRupees === 990, "Starter annual price is ₹990");
  assert(starter?.maxOutlets === 1, "Starter allows exactly 1 outlet");
  assert(starter?.maxUsers === 5, "Starter allows 5 users");

  const growth = getCentralPlanBySlug("growth");
  assert(!!growth, "Growth plan exists");
  assert(growth?.priceMonthlyRupees === 199, "Growth monthly price is ₹199");
  assert(growth?.priceAnnualRupees === 1990, "Growth annual price is ₹1990");
  assert(growth?.maxOutlets === 5, "Growth preserves configured 5 outlets");
  assert(growth?.maxUsers === 25, "Growth allows 25 users");

  const business = getCentralPlanBySlug("business");
  assert(!!business, "Business plan exists");
  assert(business?.priceMonthlyRupees === 299, "Business monthly price is ₹299");
  assert(business?.priceAnnualRupees === 2990, "Business annual price is ₹2990");
  assert(business?.maxOutlets === 50, "Business preserves configured 50 outlets");
  assert(business?.maxUsers === 200, "Business allows 200 users");

  // 2. MRR & ARR Calculations
  console.log("\n--- 2. MRR and ARR Calculation Integrity ---");
  // Starter monthly: 9900 paise
  assert(calculateSubscriptionMrrPaise(starter!, "MONTHLY") === 9900, "Starter monthly MRR is 9900 paise");
  // Starter annual: 99000 paise / 12 = 8250 paise
  assert(calculateSubscriptionMrrPaise(starter!, "ANNUAL") === 8250, "Starter annual MRR is 8250 paise (99000 / 12)");
  // Growth monthly: 19900 paise
  assert(calculateSubscriptionMrrPaise(growth!, "MONTHLY") === 19900, "Growth monthly MRR is 19900 paise");
  // ARR from MRR
  assert(calculateSubscriptionArrPaise(9900) === 118800, "ARR run-rate correctly multiplies MRR by 12");

  // 3. Subscription Lifecycle State Transitions
  console.log("\n--- 3. Subscription Lifecycle State Machine ---");
  const now = new Date();
  const futureEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const activeEval = evaluateSubscriptionLifecycle({
    status: "ACTIVE",
    currentPeriodStart: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: futureEnd,
  });
  assert(activeEval.effectiveStatus === "ACTIVE", "Active unexpired sub evaluates as ACTIVE");
  assert(activeEval.canOperatePOS === true, "Active sub can operate POS");
  assert(activeEval.canCreateOutlets === true, "Active sub can create outlets");

  // In grace period: expired 3 days ago, within 7 days
  const graceEnd = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const graceEval = evaluateSubscriptionLifecycle({
    status: "PAST_DUE",
    currentPeriodStart: new Date(now.getTime() - 33 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: graceEnd,
  });
  assert(graceEval.effectiveStatus === "GRACE_PERIOD", "3-day overdue sub evaluates as GRACE_PERIOD");
  assert(graceEval.canOperatePOS === true, "Grace period permits temporary operational POS checkout");
  assert(graceEval.canCreateOutlets === false, "Grace period prevents adding new outlets");

  // Expired: expired 10 days ago (past 7-day grace)
  const pastGraceEnd = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const expiredEval = evaluateSubscriptionLifecycle({
    status: "ACTIVE",
    currentPeriodStart: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: pastGraceEnd,
  });
  assert(expiredEval.effectiveStatus === "EXPIRED", "10-day overdue sub evaluates as EXPIRED");
  assert(expiredEval.canOperatePOS === false, "Expired sub restricts POS checkout creation");
  assert(expiredEval.canCreateOutlets === false, "Expired sub prevents adding new outlets");

  // 4. Platform Role & Permission RBAC
  console.log("\n--- 4. Platform Role & Permission RBAC Matrix ---");
  assert(ALL_PLATFORM_ROLES.length === 5, "5 platform roles defined");
  assert(ALL_PLATFORM_PERMISSIONS.length === 13, "13 granular platform permissions defined");

  // Platform Owner has all permissions
  for (const perm of ALL_PLATFORM_PERMISSIONS) {
    assert(hasPlatformPermission("PLATFORM_OWNER", perm), `PLATFORM_OWNER has ${perm}`);
  }

  // Platform Support cannot refund or manage plans
  assert(!hasPlatformPermission("PLATFORM_SUPPORT", "platform.refunds.manage"), "PLATFORM_SUPPORT cannot refund");
  assert(!hasPlatformPermission("PLATFORM_SUPPORT", "platform.plans.manage"), "PLATFORM_SUPPORT cannot manage plans");
  assert(hasPlatformPermission("PLATFORM_SUPPORT", "platform.organizations.view"), "PLATFORM_SUPPORT can view orgs");

  // Platform Finance can manage refunds and view analytics, but cannot manage admins or plans
  assert(hasPlatformPermission("PLATFORM_FINANCE", "platform.refunds.manage"), "PLATFORM_FINANCE can manage refunds");
  assert(hasPlatformPermission("PLATFORM_FINANCE", "platform.payments.view"), "PLATFORM_FINANCE can view payments");
  assert(!hasPlatformPermission("PLATFORM_FINANCE", "platform.admins.manage"), "PLATFORM_FINANCE cannot manage admins");

  // Platform Read-Only cannot manage anything
  assert(hasPlatformPermission("PLATFORM_READ_ONLY", "platform.dashboard.view"), "PLATFORM_READ_ONLY can view dashboard");
  assert(!hasPlatformPermission("PLATFORM_READ_ONLY", "platform.organizations.manage"), "PLATFORM_READ_ONLY cannot modify orgs");
  assert(!hasPlatformPermission("PLATFORM_READ_ONLY", "platform.subscriptions.manage"), "PLATFORM_READ_ONLY cannot modify subs");

  // 5. Primary Owner Security Invariant
  console.log("\n--- 5. Primary Owner Security Invariant ---");
  assert(
    PRIMARY_PLATFORM_OWNER_EMAIL === "wafflehousevellore@gmail.com",
    "Primary owner email is strictly wafflehousevellore@gmail.com"
  );

  // 6. SaaS Invoicing & 18% GST Breakdown
  console.log("\n--- 6. SaaS Invoicing and GST Itemization ---");
  const subtotalPaise = 10000; // ₹100
  const gst = calculateGstBreakdownPaise(subtotalPaise);
  assert(gst.cgstPaise === 900, "9% CGST on ₹100 is ₹9 (900 paise)");
  assert(gst.sgstPaise === 900, "9% SGST on ₹100 is ₹9 (900 paise)");
  assert(gst.totalTaxPaise === 1800, "18% Total GST is ₹18 (1800 paise)");
  assert(gst.totalWithTaxPaise === 11800, "Total inclusive amount is ₹118 (11800 paise)");

  const invNum = generateSaaSInvoiceNumber(42, new Date(2026, 10, 15));
  assert(invNum === "RNX-INV-202611-0042", `Generated invoice number is RNX-INV-202611-0042 (got ${invNum})`);

  console.log("\n=======================================================");
  console.log("   ALL STEP 15 TESTS PASSED SUCCESSFULLY! (100%)");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
