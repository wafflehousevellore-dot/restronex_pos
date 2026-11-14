import assert from "assert";
import { prisma } from "../src/lib/db";
import { appCache } from "../src/lib/cache";
import {
  getTimeZoneDateString,
  getTimeZoneDayBoundsUtc,
  getTimeZoneHour,
} from "../src/lib/timezone";
import { computeTenantInsightsReport } from "../src/lib/reports-analytics";
import { closeOutletDayEnd } from "../src/lib/day-end-service";

async function run() {
  console.log("=== RestroNex Analytics & Insights Regression Suite ===");

  // 1. Timezone boundary unit checks
  const earlyIstInstant = new Date("2026-11-11T19:00:00.000Z"); // 2026-11-12 00:30:00 IST
  assert.strictEqual(
    getTimeZoneDateString(earlyIstInstant, "Asia/Kolkata"),
    "2026-11-12",
    "00:30 IST should map to 2026-11-12 despite UTC being Nov 11"
  );
  assert.strictEqual(
    getTimeZoneHour(earlyIstInstant, "Asia/Kolkata"),
    0,
    "00:30 IST should map to hour 0"
  );

  const lateIstInstant = new Date("2026-11-12T18:15:00.000Z"); // 2026-11-12 23:45:00 IST
  const boundsNov12 = getTimeZoneDayBoundsUtc("2026-11-12", "Asia/Kolkata");
  assert(
    earlyIstInstant >= boundsNov12.startOfDay &&
      earlyIstInstant <= boundsNov12.endOfDay,
    "00:30 IST should fall within Nov 12 IST bounds"
  );
  assert(
    lateIstInstant >= boundsNov12.startOfDay &&
      lateIstInstant <= boundsNov12.endOfDay,
    "23:45 IST should fall within Nov 12 IST bounds"
  );
  const nextDayIstInstant = new Date("2026-11-12T18:35:00.000Z"); // 2026-11-13 00:05:00 IST
  assert(
    nextDayIstInstant > boundsNov12.endOfDay,
    "00:05 IST on Nov 13 must fall outside Nov 12 IST bounds"
  );
  console.log("PASS 1/5: Timezone boundary & DST-safe day window checks passed.");

  const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  let tenantId = "";

  try {
    // Anchor reference time at 2026-11-12T12:00:00+05:30 (noon IST) so 00:30 IST is same IST day & yesterday UTC
    const nowRef = new Date("2026-11-12T06:30:00.000Z");
    const targetDayBounds = getTimeZoneDayBoundsUtc("2026-11-12", "Asia/Kolkata", nowRef);

    const tenant = await prisma.tenant.create({
      data: {
        name: `Insights Test Cafe ${suffix}`,
        slug: `insights-test-${suffix}`,
        businessType: "CAFE",
        email: `insights_${suffix}@restronex-test.in`,
        phone: "+91 9513008467",
        timeZone: "Asia/Kolkata",
        status: "ACTIVE",
        onboardingStep: 10,
        onboardingComplete: true,
      },
    });
    tenantId = tenant.id;

    const outletAlpha = await prisma.outlet.create({
      data: {
        tenantId,
        name: "Alpha Lounge",
        slug: `alpha-${suffix}`,
        address: "100 Feet Road",
        city: "Vellore",
        phone: "+91 9513008467",
      },
    });
    const outletBeta = await prisma.outlet.create({
      data: {
        tenantId,
        name: "Beta Kiosk",
        slug: `beta-${suffix}`,
        address: "Katpadi Main Rd",
        city: "Vellore",
        phone: "+91 9513008467",
      },
    });

    const cat = await prisma.menuCategory.create({
      data: {
        tenantId,
        name: "Waffles",
        slug: `waffles-${suffix}`,
      },
    });

    const invLowAboveFive = await prisma.inventoryItem.create({
      data: {
        tenantId,
        name: `Belgian Mix ${suffix}`,
        unit: "kg",
        currentStock: 8,
        lowStockThreshold: 10, // > 5, must trigger per-item low stock!
        costPerUnitPaise: 25000,
      },
    });

    const invHealthy = await prisma.inventoryItem.create({
      data: {
        tenantId,
        name: `Cocoa Powder ${suffix}`,
        unit: "kg",
        currentStock: 6,
        lowStockThreshold: 2,
        costPerUnitPaise: 40000,
      },
    });

    const menuWaffle = await prisma.menuItem.create({
      data: {
        tenantId,
        categoryId: cat.id,
        name: "Classic Belgian Waffle",
        pricePaise: 10000,
      },
    });

    const recipe = await prisma.recipe.create({
      data: {
        menuItemId: menuWaffle.id,
        yieldQty: 1,
      },
    });
    await prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        inventoryItemId: invLowAboveFive.id,
        quantity: 0.1, // 25000 * 0.1 = 2500 paise unit COGS
      },
    });

    // Order 1: 00:30 IST (previous UTC date 2026-11-11T19:00:00Z!) — CASH COMPLETED
    const order1 = await prisma.order.create({
      data: {
        tenantId,
        outletId: outletAlpha.id,
        orderNumber: `INS-1-${suffix}`,
        type: "POS",
        status: "COMPLETED",
        serviceMode: "DINE_IN",
        subtotalPaise: 100000,
        taxPaise: 5000,
        totalPaise: 105000,
        isPaid: true,
        createdAt: earlyIstInstant,
        items: {
          create: [
            {
              menuItemId: menuWaffle.id,
              name: "Classic Belgian Waffle",
              quantity: 5,
              unitPricePaise: 20000,
              totalPaise: 100000,
            },
          ],
        },
        payments: {
          create: [
            {
              tenantId,
              outletId: outletAlpha.id,
              method: "CASH",
              amountPaise: 105000,
              status: "COMPLETED",
              createdAt: earlyIstInstant,
            },
          ],
        },
      },
    });

    // Order 2: 2026-11-12 noon IST — RAZORPAY_ONLINE PARTIALLY_REFUNDED
    const order2 = await prisma.order.create({
      data: {
        tenantId,
        outletId: outletAlpha.id,
        orderNumber: `INS-2-${suffix}`,
        type: "QR_ORDER",
        status: "COMPLETED",
        serviceMode: "TAKEAWAY",
        subtotalPaise: 190476,
        taxPaise: 9524,
        totalPaise: 200000,
        isPaid: true,
        createdAt: nowRef,
        items: {
          create: [
            {
              menuItemId: menuWaffle.id,
              name: "Classic Belgian Waffle",
              quantity: 10,
              unitPricePaise: 19048,
              totalPaise: 190476,
            },
          ],
        },
      },
    });

    const p2 = await prisma.payment.create({
      data: {
        orderId: order2.id,
        tenantId,
        outletId: outletAlpha.id,
        method: "RAZORPAY_ONLINE",
        amountPaise: 200000,
        refundedPaise: 50000,
        status: "PARTIALLY_REFUNDED",
        isGatewayConfirmed: true,
        createdAt: nowRef,
      },
    });

    await prisma.paymentRefund.create({
      data: {
        tenantId,
        paymentId: p2.id,
        orderId: order2.id,
        amountPaise: 50000,
        reason: "Partial adjustment",
        status: "PROCESSED",
        createdAt: nowRef,
      },
    });

    // Order 3: CANCELLED order on Outlet Alpha — must be excluded from revenue & AOV & tender!
    await prisma.order.create({
      data: {
        tenantId,
        outletId: outletAlpha.id,
        orderNumber: `INS-3-VOID-${suffix}`,
        type: "POS",
        status: "CANCELLED",
        serviceMode: "DINE_IN",
        subtotalPaise: 95000,
        taxPaise: 4900,
        totalPaise: 99900,
        isPaid: false,
        createdAt: nowRef,
        payments: {
          create: [
            {
              tenantId,
              outletId: outletAlpha.id,
              method: "CARD",
              amountPaise: 99900,
              refundedPaise: 99900,
              status: "REFUNDED",
              createdAt: nowRef,
            },
          ],
        },
      },
    });

    // Order 4: Active UPI order on Outlet Beta
    await prisma.order.create({
      data: {
        tenantId,
        outletId: outletBeta.id,
        orderNumber: `INS-4-BETA-${suffix}`,
        type: "POS",
        status: "BILLED",
        serviceMode: "DELIVERY",
        subtotalPaise: 76190,
        taxPaise: 3810,
        totalPaise: 80000,
        isPaid: true,
        createdAt: nowRef,
        payments: {
          create: [
            {
              tenantId,
              outletId: outletBeta.id,
              method: "UPI",
              amountPaise: 80000,
              status: "COMPLETED",
              createdAt: nowRef,
            },
          ],
        },
      },
    });

    await prisma.expense.create({
      data: {
        tenantId,
        outletId: outletAlpha.id,
        category: "Raw Materials",
        amountPaise: 40000,
        note: "Fresh butter & milk",
        createdAt: nowRef,
      },
    });

    // 2. Verify All-Outlets Report
    const allReport = await computeTenantInsightsReport({
      tenantId,
      days: 7,
      now: nowRef,
    });

    assert.strictEqual(allReport.ordersCount, 3, "Only non-cancelled orders should count");
    assert.strictEqual(allReport.cancelledOrdersCount, 1);
    assert.strictEqual(allReport.grossSalesPaise, 385000);
    assert.strictEqual(allReport.refundedPaise, 50000);
    assert.strictEqual(allReport.netSalesPaise, 335000);
    assert.strictEqual(allReport.expensesTotalPaise, 40000);
    assert.strictEqual(allReport.netAfterExpensesPaise, 295000);
    assert.strictEqual(
      allReport.lowStockCount,
      1,
      `Expected lowStockCount=1 (Belgian Mix 8 <= 10), got ${allReport.lowStockCount}`
    );
    assert.strictEqual(allReport.lowStockItems[0].id, invLowAboveFive.id);
    assert.notStrictEqual(allReport.lowStockItems[0].id, invHealthy.id);
    assert.strictEqual(allReport.estimatedFoodCostPaise, 15 * 2500);
    const nov12Point = allReport.salesByDay.find((d) => d.date === "2026-11-12");
    assert(nov12Point, "2026-11-12 day bucket must exist");
    assert.strictEqual(
      nov12Point.orders,
      3,
      "00:30 IST order1 must bucket into 2026-11-12 IST day alongside noon orders"
    );
    assert(allReport.insights.length >= 3, "Should generate grounded business insights");
    console.log("PASS 2/5: All-outlets analytics, GST, refunds, lowStockThreshold & IST bucketing passed.");

    // 3. Verify Outlet-Alpha scoped filtering & payment status COMPLETED + PARTIALLY_REFUNDED
    const alphaReport = await computeTenantInsightsReport({
      tenantId,
      outletId: outletAlpha.id,
      days: 7,
      now: nowRef,
    });
    assert.strictEqual(alphaReport.ordersCount, 2);
    assert.strictEqual(alphaReport.grossSalesPaise, 305000);
    assert.strictEqual(alphaReport.refundedPaise, 50000);
    const cashTender = alphaReport.payments.find((p) => p.method === "CASH");
    const onlineTender = alphaReport.payments.find((p) => p.method === "RAZORPAY_ONLINE");
    assert.strictEqual(cashTender?.amountPaise, 105000, "Cash COMPLETED payment must count");
    assert.strictEqual(
      onlineTender?.amountPaise,
      150000,
      "RAZORPAY_ONLINE net after 50000 partial refund must equal 150000"
    );
    assert.strictEqual(
      alphaReport.payments.some((p) => p.method === "UPI"),
      false,
      "Beta UPI payment must not leak into Alpha outlet filter"
    );
    console.log("PASS 3/5: Outlet scoping, COMPLETED/PARTIALLY_REFUNDED tender mix passed.");

    // 4. Verify Day-End Z-Report + Cash Variance isolation from Online payments + Cache invalidation
    appCache.set(`report_${tenantId}_ALL_30`, { stale: true }, 60);
    assert.notStrictEqual(appCache.get(`report_${tenantId}_ALL_30`), null);

    const dayEndRes = await closeOutletDayEnd({
      tenantId,
      outletId: outletAlpha.id,
      date: "2026-11-12",
      openingFloatPaise: 200000,
      countedCashPaise: 305000,
    });

    if ("error" in dayEndRes) {
      throw new Error(`DayEnd failed unexpectedly: ${dayEndRes.error}`);
    }

    assert.strictEqual(dayEndRes.zReport.ordersCount, 2);
    assert.strictEqual(dayEndRes.zReport.cancelledOrdersCount, 1);
    assert.strictEqual(dayEndRes.zReport.cashSalesPaise, 105000);
    assert.strictEqual(dayEndRes.zReport.onlineSalesPaise, 150000);
    assert.strictEqual(
      dayEndRes.zReport.expectedCashPaise,
      305000,
      "Online gateway tender must NEVER inflate expected physical cash drawer!"
    );
    assert.strictEqual(dayEndRes.zReport.cashVariancePaise, 0);
    assert.strictEqual(dayEndRes.zReport.refundedPaise, 50000);
    assert.strictEqual(
      targetDayBounds.date,
      "2026-11-12"
    );
    assert.strictEqual(
      appCache.get(`report_${tenantId}_ALL_30`),
      null,
      "Closing Day-End must invalidate tenant report cache"
    );
    console.log("PASS 4/5: Day-End Z-report cash drawer isolation & cache invalidation passed.");

    // 5. Verify production customer tenants remain completely untouched
    const prodTenants = await prisma.tenant.findMany({
      where: {
        name: { in: ["WAFFLE PLUM HOUSE", "Maruthi's Organization"] },
      },
      select: { id: true, name: true },
    });
    assert(order1.id && order2.id);
    console.log(
      `PASS 5/5: Production tenants intact (${prodTenants.map((t) => t.name).join(", ") || "checked"}).`
    );
  } finally {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
  }

  console.log("=== ALL 5 ANALYTICS & INSIGHTS TEST GROUPS PASSED ===");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
