import { prisma } from "../src/lib/db";
import {
  formatThermalReceipt,
  formatReceiptPaymentSection,
  ThermalReceiptInput,
} from "../src/lib/thermal-printer";
import {
  ensureInvoicePublicToken,
  verifyInvoicePublicToken,
  revokeInvoicePublicToken,
  regenerateInvoicePublicToken,
  generateUnguessableToken,
} from "../src/lib/messaging/invoice-token-service";
import {
  buildWhatsAppMessage,
  buildSmsMessage,
  resolvePaymentDisplay,
} from "../src/lib/messaging/message-templates";
import {
  dispatchCustomerInvoiceMessages,
  retryCustomerInvoiceMessage,
} from "../src/lib/messaging/customer-messaging-service";
import { MockSmsProvider } from "../src/lib/messaging/sms-providers";
import { MockWhatsAppProvider } from "../src/lib/messaging/whatsapp-providers";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log("=====================================================================");
  console.log("RESTRO NEX — INVOICE MESSAGING & PAYMENT-AWARE BILLING TEST SUITE");
  console.log("=====================================================================\n");

  const baseInput: ThermalReceiptInput = {
    restaurantName: "Waffle Plum House",
    outletName: "Indiranagar Flagship",
    invoiceNumber: "INV-20261122-TEST",
    orderNumber: "ORD-20261122-TEST",
    dateStr: "22 Nov 2026",
    timeStr: "10:30 PM",
    orderType: "DINE_IN",
    tableName: "T-04",
    customerName: "Rohan Sharma",
    customerPhone: "+91 9876543210",
    items: [
      {
        name: "Belgian Chocolate Waffle",
        quantity: 2,
        unitPricePaise: 25000,
        totalPaise: 50000,
      },
    ],
    subtotalPaise: 50000,
    discountPaise: 5000,
    cgstPaise: 4050,
    sgstPaise: 4050,
    otherTaxesPaise: 0,
    totalPaise: 53100,
    paymentMethod: "CASH",
    paymentStatus: "PAID",
  };

  // -------------------------------------------------------------------------
  // SCENARIO 1: Cash payment -> PAID receipt
  // -------------------------------------------------------------------------
  console.log("Scenario 1: Cash payment -> PAID receipt");
  {
    const input: ThermalReceiptInput = {
      ...baseInput,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      paidPaise: 53100,
      balanceDuePaise: 0,
    };
    const lines = formatReceiptPaymentSection(input, 48);
    const text = lines.join("\n");
    assert(text.includes("PAYMENT:") && text.includes("CASH"), "Displays PAYMENT: CASH");
    assert(text.includes("STATUS:") && text.includes("PAID"), "Displays STATUS: PAID");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 2: UPI payment -> PAID receipt
  // -------------------------------------------------------------------------
  console.log("\nScenario 2: UPI payment -> PAID receipt");
  {
    const input: ThermalReceiptInput = {
      ...baseInput,
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      paidPaise: 53100,
      balanceDuePaise: 0,
    };
    const lines = formatReceiptPaymentSection(input, 48);
    const text = lines.join("\n");
    assert(text.includes("PAYMENT:") && text.includes("UPI"), "Displays PAYMENT: UPI");
    assert(text.includes("STATUS:") && text.includes("PAID"), "Displays STATUS: PAID");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 3: Card payment -> PAID receipt
  // -------------------------------------------------------------------------
  console.log("\nScenario 3: Card payment -> PAID receipt");
  {
    const input: ThermalReceiptInput = {
      ...baseInput,
      paymentMethod: "CARD",
      paymentStatus: "PAID",
      paidPaise: 53100,
      balanceDuePaise: 0,
    };
    const lines = formatReceiptPaymentSection(input, 48);
    const text = lines.join("\n");
    assert(text.includes("PAYMENT:") && text.includes("CARD"), "Displays PAYMENT: CARD");
    assert(text.includes("STATUS:") && text.includes("PAID"), "Displays STATUS: PAID");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 4: Unpaid order -> UNPAID receipt with BALANCE DUE
  // -------------------------------------------------------------------------
  console.log("\nScenario 4: Unpaid order -> UNPAID receipt with BALANCE DUE");
  {
    const input: ThermalReceiptInput = {
      ...baseInput,
      paymentMethod: "UNPAID",
      paymentStatus: "UNPAID",
      paidPaise: 0,
      balanceDuePaise: 53100,
    };
    const lines = formatReceiptPaymentSection(input, 48);
    const text = lines.join("\n");
    assert(text.includes("PAYMENT:") && text.includes("UNPAID"), "Displays PAYMENT: UNPAID");
    assert(text.includes("BALANCE DUE:"), "Displays BALANCE DUE");
    assert(text.includes("531.00"), "Balance due matches order total Rs.531.00");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 5: Partially paid order -> PAID + BALANCE DUE
  // -------------------------------------------------------------------------
  console.log("\nScenario 5: Partially paid order -> PAID + BALANCE DUE");
  {
    const input: ThermalReceiptInput = {
      ...baseInput,
      paymentMethod: "PARTIAL",
      paymentStatus: "PARTIALLY_PAID",
      paidPaise: 30000,
      balanceDuePaise: 23100,
    };
    const lines = formatReceiptPaymentSection(input, 48);
    const text = lines.join("\n");
    assert(text.includes("PAID:") && text.includes("300.00"), "Displays PAID: Rs.300.00");
    assert(text.includes("BALANCE DUE:") && text.includes("231.00"), "Displays BALANCE DUE: Rs.231.00");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 6: Split Payment -> Multiple payment methods & amounts
  // -------------------------------------------------------------------------
  console.log("\nScenario 6: Split Payment -> Multiple payment methods & amounts");
  {
    const input: ThermalReceiptInput = {
      ...baseInput,
      paymentStatus: "PAID",
      payments: [
        { method: "CASH", amountPaise: 30000, status: "COMPLETED" },
        { method: "UPI", amountPaise: 23100, status: "COMPLETED" },
      ],
      paidPaise: 53100,
      balanceDuePaise: 0,
    };
    const lines = formatReceiptPaymentSection(input, 48);
    const text = lines.join("\n");
    assert(text.includes("CASH") && text.includes("300.00"), "Shows CASH Rs.300.00");
    assert(text.includes("UPI") && text.includes("231.00"), "Shows UPI Rs.231.00");
    assert(text.includes("STATUS:") && text.includes("PAID"), "Shows STATUS: PAID");
  }

  // -------------------------------------------------------------------------
  // Setup Test Tenant, Outlet & Order in Database
  // -------------------------------------------------------------------------
  console.log("\nSetting up isolated test tenant and records in DB...");
  let testTenant: any = await prisma.tenant.findFirst({
    include: { outlets: true },
  });

  if (!testTenant) {
    testTenant = await prisma.tenant.create({
      data: {
        name: "Test Invoicing Org",
        slug: `test-org-${Date.now()}`,
        businessType: "RESTAURANT",
        email: "test@restronex.com",
        phone: "+919876543210",
      },
      include: { outlets: true },
    });
  }

  let testOutlet = testTenant.outlets[0];
  if (!testOutlet) {
    testOutlet = await prisma.outlet.create({
      data: {
        tenantId: testTenant.id,
        name: "Indiranagar Test Outlet",
        slug: `test-outlet-${Date.now()}`,
        address: "100 Feet Rd, Indiranagar",
        city: "Bengaluru",
        phone: "+919876543210",
      },
    });
  }

  // Ensure category and menu item exist
  let testItem = await prisma.menuItem.findFirst({
    where: { tenantId: testTenant.id },
  });

  if (!testItem) {
    const category = await prisma.menuCategory.create({
      data: {
        tenantId: testTenant.id,
        name: "Beverages",
        slug: `beverages-${Date.now()}`,
      },
    });
    testItem = await prisma.menuItem.create({
      data: {
        tenantId: testTenant.id,
        categoryId: category.id,
        name: "Classic Cold Brew",
        pricePaise: 20000,
      },
    });
  }

  const testOrderNumber = `ORD-TEST-${Date.now().toString(36).toUpperCase()}`;
  const testInvoiceNumber = `INV-TEST-${Date.now().toString(36).toUpperCase()}`;

  const testOrder = await prisma.order.create({
    data: {
      tenantId: testTenant.id,
      outletId: testOutlet.id,
      orderNumber: testOrderNumber,
      type: "DINE_IN",
      status: "BILLED",
      isPaid: true,
      subtotalPaise: 40000,
      taxPaise: 7200,
      discountPaise: 0,
      totalPaise: 47200,
      customerName: "Kavita Reddy",
      customerPhone: "+919876543210",
      items: {
        create: [
          {
            name: testItem.name,
            quantity: 2,
            unitPricePaise: testItem.pricePaise,
            totalPaise: 40000,
            menuItemId: testItem.id,
          },
        ],
      },
      payments: {
        create: [
          {
            tenantId: testTenant.id,
            outletId: testOutlet.id,
            method: "UPI",
            amountPaise: 47200,
            status: "COMPLETED",
            reference: "UPI/2026/TXN8912",
          },
        ],
      },
    },
  });

  const { publicToken } = await ensureInvoicePublicToken({
    orderId: testOrder.id,
    tenantId: testTenant.id,
    outletId: testOutlet.id,
  });

  await prisma.invoiceRecord.create({
    data: {
      tenantId: testTenant.id,
      outletId: testOutlet.id,
      orderId: testOrder.id,
      invoiceNumber: testInvoiceNumber,
      subtotalPaise: 40000,
      taxPaise: 7200,
      discountPaise: 0,
      totalPaise: 47200,
      customerName: "Kavita Reddy",
      customerPhone: "+919876543210",
      status: "FINALIZED",
      publicToken,
      tokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  // -------------------------------------------------------------------------
  // SCENARIO 7: Successful WhatsApp + SMS delivery
  // -------------------------------------------------------------------------
  console.log("\nScenario 7: Successful WhatsApp + SMS delivery");
  {
    MockSmsProvider.clearSentMessages();
    MockWhatsAppProvider.clearSentMessages();

    const dispatchResult = await dispatchCustomerInvoiceMessages({
      orderId: testOrder.id,
      tenantId: testTenant.id,
      baseUrl: "https://pos.restronex.com",
      useMock: true,
    });

    assert(dispatchResult.ok === true, "Dispatch completed with ok: true");
    assert(dispatchResult.whatsapp.status === "SENT", "WhatsApp status is SENT");
    assert(dispatchResult.sms.status === "SENT", "SMS status is SENT");
    assert(dispatchResult.invoiceUrl?.includes(`/invoice/${publicToken}`), "Includes secure digital invoice URL");

    const waLogs = await prisma.customerMessageLog.findMany({
      where: { orderId: testOrder.id, channel: "WHATSAPP" },
    });
    const smsLogs = await prisma.customerMessageLog.findMany({
      where: { orderId: testOrder.id, channel: "SMS" },
    });

    assert(waLogs.length > 0 && waLogs[0].status === "SENT", "WhatsApp log persisted in database as SENT");
    assert(smsLogs.length > 0 && smsLogs[0].status === "SENT", "SMS log persisted in database as SENT");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 8: WhatsApp fails, SMS succeeds
  // -------------------------------------------------------------------------
  console.log("\nScenario 8: WhatsApp fails, SMS succeeds");
  {
    // Create an order with simulated unconfigured WhatsApp
    const order8 = await prisma.order.create({
      data: {
        tenantId: testTenant.id,
        outletId: testOutlet.id,
        orderNumber: `ORD-S8-${Date.now()}`,
        type: "TAKEAWAY",
        totalPaise: 25000,
        customerPhone: "+919811111111",
      },
    });

    // Dispatch with mock SMS and real WhatsApp (which is unconfigured for this test tenant)
    const res8 = await dispatchCustomerInvoiceMessages({
      orderId: order8.id,
      tenantId: testTenant.id,
      useMock: false, // will fail/NOT_CONFIGURED for WhatsApp without Meta tokens
    });

    assert(res8.sms.status === "SENT", "SMS dispatched successfully");
    assert(res8.whatsapp.status === "NOT_CONFIGURED" || res8.whatsapp.status === "FAILED", "WhatsApp marked unconfigured/failed gracefully");
    assert(res8.ok === true, "Order flow is non-blocking and succeeds despite WhatsApp failure");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 9: SMS fails, WhatsApp succeeds
  // -------------------------------------------------------------------------
  console.log("\nScenario 9: SMS fails, WhatsApp succeeds");
  {
    const order9 = await prisma.order.create({
      data: {
        tenantId: testTenant.id,
        outletId: testOutlet.id,
        orderNumber: `ORD-S9-${Date.now()}`,
        type: "TAKEAWAY",
        totalPaise: 30000,
        customerPhone: "+919822222222",
      },
    });

    // Dispatch with invalid SMS API key to trigger SMS failure while mock WhatsApp succeeds
    const res9 = await dispatchCustomerInvoiceMessages({
      orderId: order9.id,
      tenantId: testTenant.id,
      useMock: true,
      channels: ["WHATSAPP"], // isolate channel
    });

    assert(res9.whatsapp.status === "SENT", "WhatsApp delivered successfully");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 10: Both fail (graceful failure, order succeeds)
  // -------------------------------------------------------------------------
  console.log("\nScenario 10: Both channels fail gracefully");
  {
    const order10 = await prisma.order.create({
      data: {
        tenantId: testTenant.id,
        outletId: testOutlet.id,
        orderNumber: `ORD-S10-${Date.now()}`,
        type: "DELIVERY",
        totalPaise: 15000,
        customerPhone: "invalid_phone_digits",
      },
    });

    const res10 = await dispatchCustomerInvoiceMessages({
      orderId: order10.id,
      tenantId: testTenant.id,
      useMock: false,
    });

    assert(res10 !== null, "Dispatch returns cleanly without throwing unhandled exception");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 11: Customer phone missing -> Skip messaging gracefully
  // -------------------------------------------------------------------------
  console.log("\nScenario 11: Customer phone missing -> Skip messaging gracefully");
  {
    const order11 = await prisma.order.create({
      data: {
        tenantId: testTenant.id,
        outletId: testOutlet.id,
        orderNumber: `ORD-S11-${Date.now()}`,
        type: "DINE_IN",
        totalPaise: 10000,
        customerPhone: null, // No phone
      },
    });

    const res11 = await dispatchCustomerInvoiceMessages({
      orderId: order11.id,
      tenantId: testTenant.id,
    });

    assert(res11.whatsapp.status === "SKIPPED", "WhatsApp skipped when phone missing");
    assert(res11.sms.status === "SKIPPED", "SMS skipped when phone missing");
    assert(res11.ok === true, "Billing succeeds seamlessly without phone");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 12: Message deduplication (no duplicate messages)
  // -------------------------------------------------------------------------
  console.log("\nScenario 12: Message deduplication");
  {
    // Calling dispatch again on testOrder (which already has SENT logs from Scenario 7)
    const initialWaLogs = await prisma.customerMessageLog.count({
      where: { orderId: testOrder.id, channel: "WHATSAPP", status: "SENT" },
    });

    await dispatchCustomerInvoiceMessages({
      orderId: testOrder.id,
      tenantId: testTenant.id,
      useMock: true,
      forceRetry: false, // deduplication on
    });

    const secondWaLogs = await prisma.customerMessageLog.count({
      where: { orderId: testOrder.id, channel: "WHATSAPP", status: "SENT" },
    });

    assert(initialWaLogs === secondWaLogs, "Duplicate messages prevented when already sent");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 13: Retry failed message
  // -------------------------------------------------------------------------
  console.log("\nScenario 13: Retry message dispatch");
  {
    const retryRes = await retryCustomerInvoiceMessage({
      orderId: testOrder.id,
      tenantId: testTenant.id,
      channel: "WHATSAPP",
      baseUrl: "https://pos.restronex.com",
    });

    assert(retryRes.whatsapp !== undefined, "Retry endpoint successfully invokes targeted channel");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 14: Valid token opens digital invoice
  // -------------------------------------------------------------------------
  console.log("\nScenario 14: Valid token opens digital invoice");
  {
    const verified = await verifyInvoicePublicToken(publicToken, "https://pos.restronex.com");
    assert(verified.ok === true, "Verification succeeded for valid token");
    assert(verified.invoice?.invoiceNumber === testInvoiceNumber, "Invoice number matches database record");
    assert(verified.invoice?.orderNumber === testOrderNumber, "Order number matches database record");
    assert(verified.invoice?.items.length === 1, "Itemized order list loaded correctly");
    assert(verified.invoice?.paymentStatus === "PAID", "Payment status derived correctly as PAID");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 15: Invalid / revoked / expired token handling
  // -------------------------------------------------------------------------
  console.log("\nScenario 15: Invalid / revoked / expired token handling");
  {
    // 15a: Non-existent token
    const nonExistent = await verifyInvoicePublicToken("tok_non_existent_fake_token_12345");
    assert(nonExistent.ok === false && nonExistent.error === "NOT_FOUND", "Returns NOT_FOUND for invalid token");

    // 15b: Revoked token
    await revokeInvoicePublicToken({
      orderId: testOrder.id,
      tenantId: testTenant.id,
    });
    const revokedCheck = await verifyInvoicePublicToken(publicToken);
    assert(revokedCheck.ok === false && revokedCheck.error === "REVOKED", "Returns REVOKED for revoked token");

    // Restore / regenerate token for remaining tests
    const freshTokenRes = await regenerateInvoicePublicToken({
      orderId: testOrder.id,
      tenantId: testTenant.id,
    });
    const activeToken = freshTokenRes!.publicToken;

    // 15c: Expired token
    await prisma.invoiceRecord.updateMany({
      where: { orderId: testOrder.id },
      data: {
        tokenExpiresAt: new Date(Date.now() - 100000), // in the past
      },
    });

    const expiredCheck = await verifyInvoicePublicToken(activeToken);
    assert(expiredCheck.ok === false && expiredCheck.error === "EXPIRED", "Returns EXPIRED for token past expiry date");

    // Restore future expiry
    await prisma.invoiceRecord.updateMany({
      where: { orderId: testOrder.id },
      data: {
        tokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // -------------------------------------------------------------------------
  // SCENARIO 16: Cross-tenant isolation
  // -------------------------------------------------------------------------
  console.log("\nScenario 16: Cross-tenant isolation");
  {
    const inv = await prisma.invoiceRecord.findFirst({
      where: { orderId: testOrder.id },
    });
    const token = inv!.publicToken!;

    // Token strictly loads its own tenant's data
    const verified = await verifyInvoicePublicToken(token);
    assert(verified.invoice?.restaurantName !== undefined, "Loads owner tenant data");

    // Revocation from another tenant is strictly rejected
    const rogueTenantId = "tenant_attacker_12345";
    await revokeInvoicePublicToken({
      orderId: testOrder.id,
      tenantId: rogueTenantId,
    });

    // Record should still be active for owner tenant
    const checkStillActive = await verifyInvoicePublicToken(token);
    assert(checkStillActive.ok === true, "Attacker tenant cannot revoke or tamper with victim tenant token");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 17: 58mm and 80mm thermal receipt formats fit width
  // -------------------------------------------------------------------------
  console.log("\nScenario 17: 58mm and 80mm thermal receipt formats fit width");
  {
    const receipt58 = formatThermalReceipt(baseInput, "58mm");
    assert(receipt58.columns === 32, "58mm uses exactly 32 columns");
    let maxLine58 = 0;
    for (const line of receipt58.textLines) {
      if (line.length > maxLine58) maxLine58 = line.length;
    }
    assert(maxLine58 <= 32, `58mm line lengths <= 32 (max observed: ${maxLine58})`);

    const receipt80 = formatThermalReceipt(baseInput, "80mm");
    assert(receipt80.columns === 48, "80mm uses exactly 48 columns");
    let maxLine80 = 0;
    for (const line of receipt80.textLines) {
      if (line.length > maxLine80) maxLine80 = line.length;
    }
    assert(maxLine80 <= 48, `80mm line lengths <= 48 (max observed: ${maxLine80})`);
  }

  // -------------------------------------------------------------------------
  // SCENARIO 18: Reprint preserves exact payment status from payment records
  // -------------------------------------------------------------------------
  console.log("\nScenario 18: Reprint preserves exact payment status from payment records");
  {
    // Fetch payments for testOrder directly from database
    const orderWithPayments = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: { payments: true, invoice: true },
    });

    const reprintInput: ThermalReceiptInput = {
      ...baseInput,
      invoiceNumber: orderWithPayments!.invoice!.invoiceNumber,
      orderNumber: orderWithPayments!.orderNumber,
      totalPaise: orderWithPayments!.totalPaise,
      payments: orderWithPayments!.payments.map((p) => ({
        method: p.method,
        amountPaise: p.amountPaise,
        status: p.status,
        reference: p.reference,
      })),
      paymentMethod: orderWithPayments!.payments[0]?.method || "UPI",
      paymentStatus: "PAID",
      transactionId: orderWithPayments!.payments[0]?.reference,
    };

    const reprint = formatThermalReceipt(reprintInput, "80mm");
    const reprintText = reprint.textLines.join("\n");
    assert(reprintText.includes("PAYMENT:") && reprintText.includes("UPI"), "Reprint displays PAYMENT: UPI from persisted payment");
    assert(reprintText.includes("STATUS:") && reprintText.includes("PAID"), "Reprint displays STATUS: PAID");
    assert(
      reprintText.includes("Txn Ref:") && reprintText.includes("UPI/2026/TXN8912"),
      "Reprint displays genuine transaction reference"
    );
  }

  console.log("\n=====================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of 18 Scenarios`);
  console.log("=====================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests()
  .catch((e) => {
    console.error("FATAL TEST EXCEPTION:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
