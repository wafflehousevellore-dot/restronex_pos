import net from "net";
import assert from "assert";
import { prisma } from "../src/lib/db";
import { generateInvoicePDF } from "../src/lib/invoice-pdf";
import {
  buildSignedInvoicePdfUrl,
  loadInvoicePdfPayload,
  signInvoiceAccessToken,
  verifyInvoiceAccessToken,
} from "../src/lib/invoice-storage";
import {
  decryptAccessToken,
  encryptAccessToken,
  formatWhatsAppBillMessage,
  normalizeWhatsAppPhone,
  queueAndSendWhatsAppInvoice,
  resolveWhatsAppConfig,
  type WhatsAppTransport,
} from "../src/lib/whatsapp-invoice";
import {
  formatThermalReceipt,
  queueAndDispatchBillPrintJob,
  selectOutletBillingPrinter,
} from "../src/lib/thermal-printer";
import { processDueBackgroundJobs } from "../src/lib/background-jobs";

interface LoopbackEscPosServer {
  hostPort: string;
  port: number;
  receivedBuffers: Buffer[];
  close: () => Promise<void>;
}

async function startLoopbackTcpPrinter(): Promise<LoopbackEscPosServer> {
  const receivedBuffers: Buffer[] = [];
  const server = net.createServer((socket) => {
    socket.on("data", (chunk) => {
      receivedBuffers.push(Buffer.from(chunk));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Failed to bind loopback TCP printer server");
  }

  return {
    hostPort: `127.0.0.1:${addr.port}`,
    port: addr.port,
    receivedBuffers,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function getUnusedPort(): Promise<number> {
  const s = net.createServer();
  await new Promise<void>((resolve) => s.listen(0, "127.0.0.1", () => resolve()));
  const addr = s.address();
  const port = typeof addr === "object" && addr ? addr.port : 39999;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return port;
}

async function run15ScenarioWhatsAppAndPrinterSuite() {
  console.log("\n=================================================================");
  console.log("  RESTRO NEX — 15-SCENARIO WHATSAPP & THERMAL PRINTER TEST SUITE  ");
  console.log("=================================================================\n");

  const runTag = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];
  const serversToClose: (() => Promise<void>)[] = [];

  let passed = 0;
  const total = 15;

  async function createTestFixture(suffix: string) {
    const user = await prisma.user.create({
      data: {
        id: `usr_wa_prt_${runTag}_${suffix}`,
        email: `wa_prt_${runTag}_${suffix}@restronex-test.in`,
        name: `Test Owner ${suffix}`,
        role: "OWNER",
      },
    });
    createdUserIds.push(user.id);

    const tenant = await prisma.tenant.create({
      data: {
        name: `Test Kitchen ${suffix}`,
        slug: `test-kitchen-${runTag}-${suffix}`.toLowerCase(),
        businessType: "CAFE",
        email: `kitchen_${runTag}_${suffix}@restronex-test.in`,
        phone: "+91 9513008467",
        onboardingStep: 1,
        onboardingComplete: false,
      },
    });
    createdTenantIds.push(tenant.id);

    await prisma.membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: "OWNER",
      },
    });

    const outlet1 = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: `Branch One ${suffix}`,
        slug: `branch-1-${runTag}-${suffix}`.toLowerCase(),
        address: "123 Anna Salai",
        city: "Vellore",
        phone: "+91 9513008467",
      },
    });

    const category = await prisma.menuCategory.create({
      data: {
        tenantId: tenant.id,
        name: "Waffles",
        slug: `waffles-${suffix}`,
      },
    });

    const item = await prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: "Belgian Chocolate Waffle",
        pricePaise: 15000, // ₹150.00
        isVeg: true,
      },
    });

    return { user, tenant, outlet1, item };
  }

  async function createCompletedOrder(params: {
    tenantId: string;
    outletId: string;
    item: { id: string; name: string; pricePaise: number };
    orderNum: string;
    invoiceNum: string;
    customerPhone?: string | null;
    customerName?: string | null;
    idempotencyKey?: string | null;
  }) {
    const subtotalPaise = params.item.pricePaise * 2; // ₹300.00
    const discountPaise = 2000; // ₹20.00
    const taxable = subtotalPaise - discountPaise; // ₹280.00
    const cgst = Math.round(taxable * 0.09); // ₹25.20 = 2520
    const sgst = Math.round(taxable * 0.09); // ₹25.20 = 2520
    const taxPaise = cgst + sgst; // 5040
    const totalPaise = taxable + taxPaise; // 33040 = ₹330.40

    const order = await prisma.order.create({
      data: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        orderNumber: params.orderNum,
        type: "DINE_IN",
        serviceMode: "DINE_IN",
        status: "COMPLETED",
        isPaid: true,
        paidAt: new Date(),
        subtotalPaise,
        discountPaise,
        taxPaise,
        totalPaise,
        customerName: params.customerName ?? "Aarav Kumar",
        customerPhone: params.customerPhone === undefined ? "+91 9000000001" : params.customerPhone,
        whatsappConsent: true,
        idempotencyKey: params.idempotencyKey ?? null,
        items: {
          create: {
            menuItemId: params.item.id,
            name: params.item.name,
            quantity: 2,
            unitPricePaise: params.item.pricePaise,
            totalPaise: subtotalPaise,
          },
        },
        payments: {
          create: {
            tenantId: params.tenantId,
            outletId: params.outletId,
            method: "UPI",
            amountPaise: totalPaise,
            status: "COMPLETED",
            reference: `UPI-${params.orderNum}`,
          },
        },
      },
    });

    const invoice = await prisma.invoiceRecord.create({
      data: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        orderId: order.id,
        invoiceNumber: params.invoiceNum,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        subtotalPaise,
        taxPaise,
        discountPaise,
        totalPaise,
        status: "FINALIZED",
      },
    });

    return { order, invoice };
  }

  try {
    // -----------------------------------------------------------------
    // Scenario 1: Onboarding completes with WhatsApp configured cleanly
    // -----------------------------------------------------------------
    console.log("▶ Scenario 1: Onboarding completes with WhatsApp configured");
    const s1 = await createTestFixture("s1_wa_onboard");
    const s1PlainToken = "EAAB_TEST_FAKE_WHATSAPP_TOKEN_S1_998877";
    await prisma.restaurantSetting.create({
      data: {
        tenantId: s1.tenant.id,
        receiptHeader: "S1 Bistro",
        gstNumber: "33ABCDE1234F1Z5",
        fssaiNumber: "12423000001111",
        whatsappWabaId: "waba_test_s1",
        whatsappPhoneNumberId: "pn_test_s1",
        whatsappDisplayPhone: "+91 9513008467",
        whatsappAccessToken: encryptAccessToken(s1PlainToken),
        whatsappTemplateName: "order_invoice_utility",
        whatsappConnectionMode: "META_CLOUD_API",
        whatsappConnectionStatus: "CONNECTED",
        whatsappOnboardingSkipped: false,
        autoSendWhatsAppInvoice: true,
        printerOnboardingSkipped: true,
        autoPrintBill: false,
      },
    });
    await prisma.tenant.update({
      where: { id: s1.tenant.id },
      data: { onboardingStep: 10, onboardingComplete: true },
    });
    const s1Setting = await prisma.restaurantSetting.findUnique({ where: { tenantId: s1.tenant.id } });
    const s1Tenant = await prisma.tenant.findUnique({ where: { id: s1.tenant.id } });
    assert(s1Tenant?.onboardingComplete === true, "Tenant onboardingComplete must be true");
    assert(s1Setting?.whatsappOnboardingSkipped === false, "WhatsApp skipped flag must be false");
    assert(
      s1Setting?.whatsappAccessToken && s1Setting.whatsappAccessToken !== s1PlainToken,
      "Stored access token must be encrypted, never plaintext"
    );
    console.log("  ✓ PASS: Onboarding completed with encrypted WhatsApp Business credentials");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 2: Onboarding completes cleanly when WhatsApp is skipped
    // -----------------------------------------------------------------
    console.log("▶ Scenario 2: Onboarding completes cleanly when WhatsApp is skipped");
    const s2 = await createTestFixture("s2_wa_skip");
    await prisma.restaurantSetting.create({
      data: {
        tenantId: s2.tenant.id,
        whatsappOnboardingSkipped: true,
        whatsappConnectionStatus: "NOT_CONFIGURED",
        autoSendWhatsAppInvoice: false,
        printerOnboardingSkipped: true,
      },
    });
    await prisma.tenant.update({
      where: { id: s2.tenant.id },
      data: { onboardingStep: 10, onboardingComplete: true },
    });
    const s2Check = await prisma.tenant.findUnique({
      where: { id: s2.tenant.id },
      include: { settings: true },
    });
    assert(s2Check?.onboardingComplete === true, "Skipped WhatsApp must allow onboarding completion");
    assert(s2Check?.settings?.whatsappOnboardingSkipped === true, "Skip flag must persist");
    assert(s2Check?.settings?.whatsappPhoneNumberId === null, "Phone ID must remain null");
    console.log("  ✓ PASS: Onboarding completed smoothly with WhatsApp skipped");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 3: Onboarding completes with Thermal Printer configured
    // -----------------------------------------------------------------
    console.log("▶ Scenario 3: Onboarding completes with Thermal Printer configured");
    const s3 = await createTestFixture("s3_prt_onboard");
    await prisma.printerDevice.create({
      data: {
        tenantId: s3.tenant.id,
        outletId: s3.outlet1.id,
        name: "Billing Counter Thermal 80mm",
        type: "USB_THERMAL",
        station: "BILLING",
        paperWidth: "80mm",
        connectionString: "webusb:04b8:0202",
        isDefaultBilling: true,
        autoPrintEnabled: true,
        qrEnabled: true,
        status: "CONNECTED",
      },
    });
    await prisma.restaurantSetting.create({
      data: {
        tenantId: s3.tenant.id,
        printerOnboardingSkipped: false,
        autoPrintBill: true,
      },
    });
    await prisma.tenant.update({
      where: { id: s3.tenant.id },
      data: { onboardingStep: 10, onboardingComplete: true },
    });
    const s3Printer = await selectOutletBillingPrinter(s3.tenant.id, s3.outlet1.id);
    assert(s3Printer !== null && s3Printer.type === "USB_THERMAL" && s3Printer.isDefaultBilling, "Default printer saved");
    console.log("  ✓ PASS: Onboarding completed with configured 80mm default billing printer");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 4: Onboarding completes cleanly when Printer is skipped
    // -----------------------------------------------------------------
    console.log("▶ Scenario 4: Onboarding completes cleanly when Printer is skipped");
    const s4 = await createTestFixture("s4_prt_skip");
    await prisma.restaurantSetting.create({
      data: {
        tenantId: s4.tenant.id,
        printerOnboardingSkipped: true,
        autoPrintBill: false,
      },
    });
    await prisma.tenant.update({
      where: { id: s4.tenant.id },
      data: { onboardingStep: 10, onboardingComplete: true },
    });
    const s4Printers = await prisma.printerDevice.count({ where: { tenantId: s4.tenant.id } });
    const s4Tenant = await prisma.tenant.findUnique({ where: { id: s4.tenant.id } });
    assert(s4Tenant?.onboardingComplete === true && s4Printers === 0, "Onboarding complete without printer");
    console.log("  ✓ PASS: Onboarding completed smoothly with printer skipped (0 printers)");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 5: Settings config, AES-256-GCM encryption & outlet override
    // -----------------------------------------------------------------
    console.log("▶ Scenario 5: Settings configuration, encryption & outlet WhatsApp override");
    const s5 = await createTestFixture("s5_cfg");
    const tenantToken = "EAAB_TENANT_LEVEL_TOKEN_555";
    const outletToken = "EAAB_OUTLET_OVERRIDE_TOKEN_999";
    await prisma.restaurantSetting.create({
      data: {
        tenantId: s5.tenant.id,
        whatsappPhoneNumberId: "pn_tenant_5",
        whatsappWabaId: "waba_tenant_5",
        whatsappAccessToken: encryptAccessToken(tenantToken),
        whatsappTemplateName: "order_invoice_utility",
        whatsappConnectionStatus: "CONNECTED",
        autoSendWhatsAppInvoice: true,
        autoPrintBill: true,
      },
    });
    const outlet2 = await prisma.outlet.create({
      data: {
        tenantId: s5.tenant.id,
        name: "Branch Two Override",
        slug: `branch-2-${runTag}-s5`.toLowerCase(),
        address: "456 Katpadi Road",
        city: "Vellore",
        phone: "+91 9513008468",
      },
    });
    await prisma.outletWhatsAppConfig.create({
      data: {
        tenantId: s5.tenant.id,
        outletId: outlet2.id,
        enabled: true,
        phoneNumberId: "pn_outlet2_override",
        wabaId: "waba_outlet2_override",
        displayPhone: "+91 9513008468",
        accessTokenEnc: encryptAccessToken(outletToken),
        templateName: "order_invoice_utility",
        status: "CONNECTED",
      },
    });
    const resTenantCfg = await resolveWhatsAppConfig(s5.tenant.id, s5.outlet1.id);
    const resOutletCfg = await resolveWhatsAppConfig(s5.tenant.id, outlet2.id);
    assert(resTenantCfg.source === "TENANT" && resTenantCfg.accessToken === tenantToken, "Tenant fallback decrypted");
    assert(resOutletCfg.source === "OUTLET" && resOutletCfg.accessToken === outletToken, "Outlet override decrypted");
    assert(decryptAccessToken(encryptAccessToken("secret_x")) === "secret_x", "AES-256-GCM round-trip intact");
    console.log("  ✓ PASS: AES-256-GCM encryption + multi-outlet config resolution verified");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 6: Finalizing POS bill auto-sends formatted WhatsApp bill + PDF link
    // -----------------------------------------------------------------
    console.log("▶ Scenario 6: POS bill finalization auto-sends WhatsApp bill & signed PDF");
    const mockWaPayloads: Parameters<WhatsAppTransport>[0][] = [];
    const mockSuccessTransport: WhatsAppTransport = async (req) => {
      mockWaPayloads.push(req);
      return { ok: true, wamid: `wamid.test.${Date.now()}` };
    };

    const { order: s6Order, invoice: s6Invoice } = await createCompletedOrder({
      tenantId: s1.tenant.id,
      outletId: s1.outlet1.id,
      item: s1.item,
      orderNum: `ORD-S6-${runTag}`,
      invoiceNum: `INV-S6-${runTag}`,
      customerName: "Priya Nair",
      customerPhone: "+91 9000000006",
      idempotencyKey: `idem_s6_${runTag}`,
    });

    const s6Wa = await queueAndSendWhatsAppInvoice(s6Order.id, {
      baseUrl: "https://www.restronexpos.com",
      transport: mockSuccessTransport,
    });
    assert(s6Wa.status === "SENT" && Boolean(s6Wa.queueId), `Expected SENT, got ${s6Wa.status}: ${s6Wa.reason}`);
    const s6QueueDb = await prisma.whatsAppMessageQueue.findUnique({ where: { id: s6Wa.queueId! } });
    const s6LogDb = await prisma.whatsAppDeliveryLog.findFirst({ where: { orderId: s6Order.id } });
    assert(Boolean(s6QueueDb?.wamid) && Boolean(s6LogDb?.messageId), "Persisted wamid in queue & delivery log");
    assert(mockWaPayloads.length === 1, "Mock Meta transport must be called exactly once");
    const sentPayload = mockWaPayloads[0];
    assert(sentPayload.to === "919000000006", "Recipient normalized to 91...");
    assert(sentPayload.accessToken === s1PlainToken, "Decrypted tenant token passed to Meta transport");
    assert(sentPayload.messageText.includes("Hello Priya Nair,"), "Contains customer greeting");
    assert(sentPayload.messageText.includes("Thank you for visiting S1 Bistro!"), "Contains restaurant name");
    assert(sentPayload.messageText.includes(`Your bill ${s6Invoice.invoiceNumber} has been generated.`), "Contains invoice number");
    assert(sentPayload.messageText.includes("Amount: ₹330.40"), "Contains exact rupee total");
    assert(sentPayload.messageText.includes("Payment: PAID (UPI)"), "Contains payment status");
    assert(sentPayload.messageText.includes("Your invoice is attached as a PDF."), "Mentions PDF attachment");
    assert(sentPayload.messageText.includes("Powered by RestroNex."), "Contains branding footer");
    assert(sentPayload.pdfUrl?.includes(`/api/invoices/${encodeURIComponent(s6Invoice.invoiceNumber)}/pdf`), "Has PDF URL");
    const s6OrderAfter = await prisma.order.findUnique({ where: { id: s6Order.id } });
    assert(s6OrderAfter?.whatsappStatus === "SENT", "Order whatsappStatus updated to SENT");
    console.log("  ✓ PASS: WhatsApp bill automatically formatted, queued, and sent with signed PDF URL");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 7: Finalizing POS bill auto-prints via real loopback TCP Port 9100
    // -----------------------------------------------------------------
    console.log("▶ Scenario 7: POS bill auto-prints ESC/POS bytes via local TCP printer socket");
    const s7 = await createTestFixture("s7_print_ok");
    const tcpServer = await startLoopbackTcpPrinter();
    serversToClose.push(tcpServer.close);

    await prisma.restaurantSetting.create({
      data: {
        tenantId: s7.tenant.id,
        receiptHeader: "S7 Thermal Cafe",
        gstNumber: "33TESTGST9999Z1",
        fssaiNumber: "12423999888777",
        autoPrintBill: true,
        qrFooterEnabled: true,
        whatsappOnboardingSkipped: true,
      },
    });
    await prisma.printerDevice.create({
      data: {
        tenantId: s7.tenant.id,
        outletId: s7.outlet1.id,
        name: "S7 Loopback TCP 80mm",
        type: "NETWORK_LAN",
        station: "BILLING",
        paperWidth: "80mm",
        connectionString: tcpServer.hostPort,
        isDefaultBilling: true,
        autoPrintEnabled: true,
        qrEnabled: true,
      },
    });

    const { order: s7Order, invoice: s7Invoice } = await createCompletedOrder({
      tenantId: s7.tenant.id,
      outletId: s7.outlet1.id,
      item: s7.item,
      orderNum: `ORD-S7-${runTag}`,
      invoiceNum: `INV-S7-${runTag}`,
    });

    const s7PrintRes = await queueAndDispatchBillPrintJob(s7Order.id, {
      baseUrl: "https://www.restronexpos.com",
    });
    await new Promise((r) => setTimeout(r, 80));

    const combinedEscPos = Buffer.concat(tcpServer.receivedBuffers);
    const decodedText = combinedEscPos.toString("ascii");
    assert(s7PrintRes.status === "PRINTED", `Expected PRINTED, got ${s7PrintRes.status}: ${s7PrintRes.error}`);
    assert(combinedEscPos[0] === 0x1b && combinedEscPos[1] === 0x40, "ESC/POS starts with ESC @ init");
    assert(decodedText.includes("S7 THERMAL CAFE"), "ESC/POS contains restaurant header");
    assert(decodedText.includes(s7Invoice.invoiceNumber), "ESC/POS contains invoice number");
    assert(decodedText.includes("GSTIN: 33TESTGST9999Z1"), "ESC/POS contains GSTIN");
    assert(combinedEscPos.includes(Buffer.from([0x1d, 0x56])), "ESC/POS includes GS V cut command");
    console.log(`  ✓ PASS: Auto-printed ${combinedEscPos.length} ESC/POS bytes to local TCP ${tcpServer.hostPort}`);
    passed++;

    // -----------------------------------------------------------------
    // Scenario 8: WhatsApp send failure keeps POS bill completed & records error
    // -----------------------------------------------------------------
    console.log("▶ Scenario 8: WhatsApp Meta failure keeps bill completed & sets FAILED + nextRetryAt");
    const mockFailTransport: WhatsAppTransport = async () => ({
      ok: false,
      error: "Meta API 503 Temporary Outage",
    });
    const { order: s8Order } = await createCompletedOrder({
      tenantId: s1.tenant.id,
      outletId: s1.outlet1.id,
      item: s1.item,
      orderNum: `ORD-S8-${runTag}`,
      invoiceNum: `INV-S8-${runTag}`,
      customerPhone: "+91 9000000008",
    });

    const s8Wa = await queueAndSendWhatsAppInvoice(s8Order.id, { transport: mockFailTransport });
    const s8OrderDb = await prisma.order.findUnique({ where: { id: s8Order.id }, include: { invoice: true } });
    const s8Queue = await prisma.whatsAppMessageQueue.findUnique({ where: { id: s8Wa.queueId! } });
    assert(s8OrderDb?.status === "COMPLETED" && s8OrderDb.isPaid === true, "Bill must remain completed & paid");
    assert(s8OrderDb?.invoice !== null, "Invoice record must exist");
    assert(s8Wa.status === "FAILED" && s8Queue?.status === "FAILED", "Queue status must be FAILED");
    assert(s8Queue?.retryCount === 1 && s8Queue.nextRetryAt !== null, "Retry counter & backoff scheduled");
    console.log("  ✓ PASS: WhatsApp failure did not fail bill; failure & backoff retry recorded");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 9: Offline printer keeps bill completed & records OFFLINE
    // -----------------------------------------------------------------
    console.log("▶ Scenario 9: Offline printer keeps POS bill completed & records OFFLINE");
    const s9 = await createTestFixture("s9_prt_offline");
    const deadPort = await getUnusedPort();
    await prisma.restaurantSetting.create({
      data: { tenantId: s9.tenant.id, autoPrintBill: true, whatsappOnboardingSkipped: true },
    });
    const s9Printer = await prisma.printerDevice.create({
      data: {
        tenantId: s9.tenant.id,
        outletId: s9.outlet1.id,
        name: "Offline Printer",
        type: "NETWORK_LAN",
        station: "BILLING",
        paperWidth: "80mm",
        connectionString: `127.0.0.1:${deadPort}`,
        isDefaultBilling: true,
        autoPrintEnabled: true,
      },
    });
    const { order: s9Order } = await createCompletedOrder({
      tenantId: s9.tenant.id,
      outletId: s9.outlet1.id,
      item: s9.item,
      orderNum: `ORD-S9-${runTag}`,
      invoiceNum: `INV-S9-${runTag}`,
    });
    const s9PrintRes = await queueAndDispatchBillPrintJob(s9Order.id);
    const s9OrderDb = await prisma.order.findUnique({ where: { id: s9Order.id } });
    const s9JobDb = await prisma.printJob.findUnique({ where: { id: s9PrintRes.jobId! } });
    assert(s9OrderDb?.status === "COMPLETED" && s9OrderDb.isPaid === true, "POS bill unaffected by offline printer");
    assert(s9PrintRes.status === "OFFLINE" && s9JobDb?.status === "OFFLINE", "PrintJob status is OFFLINE");
    assert(s9JobDb?.nextRetryAt !== null, "Retry scheduled for offline print job");
    console.log("  ✓ PASS: Offline printer kept bill intact and marked PrintJob OFFLINE with retry");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 10: Automatic/manual retry succeeds without duplicate records
    // -----------------------------------------------------------------
    console.log("▶ Scenario 10: Retry worker recovers FAILED WhatsApp & OFFLINE print with 0 duplicates");
    await prisma.whatsAppMessageQueue.update({
      where: { id: s8Wa.queueId! },
      data: { nextRetryAt: new Date(Date.now() - 1000) },
    });
    const s10RecoveryServer = await startLoopbackTcpPrinter();
    serversToClose.push(s10RecoveryServer.close);
    await prisma.printerDevice.update({
      where: { id: s9Printer.id },
      data: { connectionString: s10RecoveryServer.hostPort },
    });
    await prisma.printJob.update({
      where: { id: s9PrintRes.jobId! },
      data: { nextRetryAt: new Date(Date.now() - 1000) },
    });

    const retryWaRes = await processDueBackgroundJobs({
      tenantId: s1.tenant.id,
      whatsappTransport: mockSuccessTransport,
    });
    const retryPrtRes = await processDueBackgroundJobs({
      tenantId: s9.tenant.id,
    });

    const s8QueueCount = await prisma.whatsAppMessageQueue.count({ where: { orderId: s8Order.id } });
    const s8QueueFinal = await prisma.whatsAppMessageQueue.findUnique({ where: { id: s8Wa.queueId! } });
    const s9JobCount = await prisma.printJob.count({ where: { orderId: s9Order.id } });
    const s9JobFinal = await prisma.printJob.findUnique({ where: { id: s9PrintRes.jobId! } });

    assert(retryWaRes.whatsappProcessed === 1 && s8QueueFinal?.status === "SENT", "WhatsApp retry succeeded");
    assert(s8QueueCount === 1, "Zero duplicate WhatsApp queue rows created on retry");
    assert(retryPrtRes.printProcessed === 1 && s9JobFinal?.status === "PRINTED", "Offline print retry succeeded");
    assert(s9JobCount === 1, "Zero duplicate PrintJob rows created on retry");
    console.log("  ✓ PASS: Background retry recovered both jobs cleanly with 1 row per order");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 11: Duplicate request/refresh prevents duplicate WhatsApp/print
    // -----------------------------------------------------------------
    console.log("▶ Scenario 11: Idempotency blocks duplicate order, WhatsApp send & Print job on refresh");
    const callsBefore = mockWaPayloads.length;
    const dupWa = await queueAndSendWhatsAppInvoice(s6Order.id, { transport: mockSuccessTransport });
    const dupPrint = await queueAndDispatchBillPrintJob(s7Order.id);
    const s6QueueCount = await prisma.whatsAppMessageQueue.count({ where: { orderId: s6Order.id } });
    const s7JobCount = await prisma.printJob.count({ where: { orderId: s7Order.id } });
    assert(mockWaPayloads.length === callsBefore, "Duplicate WhatsApp call must NOT hit Meta transport again");
    assert(s6QueueCount === 1 && dupWa.reason?.includes("idempotently"), "Exactly 1 WhatsApp queue item");
    assert(s7JobCount === 1 && dupPrint.jobId !== null, "Exactly 1 PrintJob item");

    let uniqueViolationCaught = false;
    try {
      await prisma.order.create({
        data: {
          tenantId: s1.tenant.id,
          outletId: s1.outlet1.id,
          orderNumber: `ORD-DUP-${runTag}`,
          type: "DINE_IN",
          idempotencyKey: `idem_s6_${runTag}`,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") uniqueViolationCaught = true;
    }
    assert(uniqueViolationCaught, "Order (tenantId, idempotencyKey) unique constraint must block race duplicates");
    console.log("  ✓ PASS: Full idempotency enforced across Order, WhatsApp queue, and PrintJob");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 12: Multi-outlet independent printers & WhatsApp config
    // -----------------------------------------------------------------
    console.log("▶ Scenario 12: Multi-outlet routing selects each outlet's own default printer");
    const s12 = await createTestFixture("s12_multi_outlet");
    const outletB = await prisma.outlet.create({
      data: {
        tenantId: s12.tenant.id,
        name: "Outlet B Mall Kiosk",
        slug: `outlet-b-${runTag}-s12`.toLowerCase(),
        address: "Floor 2 Food Court",
        city: "Chennai",
        phone: "+91 9513008499",
      },
    });
    const srvA = await startLoopbackTcpPrinter();
    const srvB = await startLoopbackTcpPrinter();
    serversToClose.push(srvA.close, srvB.close);

    await prisma.restaurantSetting.create({
      data: { tenantId: s12.tenant.id, autoPrintBill: true, whatsappOnboardingSkipped: true },
    });
    const prtA = await prisma.printerDevice.create({
      data: {
        tenantId: s12.tenant.id,
        outletId: s12.outlet1.id,
        name: "Outlet 1 Compact 58mm",
        type: "NETWORK_LAN",
        station: "BILLING",
        paperWidth: "58mm",
        connectionString: srvA.hostPort,
        isDefaultBilling: true,
        autoPrintEnabled: true,
      },
    });
    const prtB = await prisma.printerDevice.create({
      data: {
        tenantId: s12.tenant.id,
        outletId: outletB.id,
        name: "Outlet 2 Wide 80mm",
        type: "NETWORK_LAN",
        station: "BILLING",
        paperWidth: "80mm",
        connectionString: srvB.hostPort,
        isDefaultBilling: true,
        autoPrintEnabled: true,
      },
    });

    const { order: ordA } = await createCompletedOrder({
      tenantId: s12.tenant.id,
      outletId: s12.outlet1.id,
      item: s12.item,
      orderNum: `ORD-A-${runTag}`,
      invoiceNum: `INV-A-${runTag}`,
    });
    const { order: ordB } = await createCompletedOrder({
      tenantId: s12.tenant.id,
      outletId: outletB.id,
      item: s12.item,
      orderNum: `ORD-B-${runTag}`,
      invoiceNum: `INV-B-${runTag}`,
    });

    const resA = await queueAndDispatchBillPrintJob(ordA.id);
    const resB = await queueAndDispatchBillPrintJob(ordB.id);
    assert(resA.printerId === prtA.id && resA.paperWidth === "58mm" && resA.status === "PRINTED", "Outlet A uses 58mm prtA");
    assert(resB.printerId === prtB.id && resB.paperWidth === "80mm" && resB.status === "PRINTED", "Outlet B uses 80mm prtB");
    console.log("  ✓ PASS: Multi-outlet orders automatically routed to each outlet's own 58mm / 80mm printer");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 13: Multi-tenant isolation & customer transactional opt-out
    // -----------------------------------------------------------------
    console.log("▶ Scenario 13: Multi-tenant isolation + transactional opt-out enforcement");
    const tenantB = await createTestFixture("s13_tenant_b");
    await prisma.restaurantSetting.create({
      data: {
        tenantId: tenantB.tenant.id,
        autoSendWhatsAppInvoice: true,
        whatsappPhoneNumberId: "pn_tenant_b",
        whatsappAccessToken: encryptAccessToken("EAAB_TENANT_B_SECRET_XYZ"),
        autoPrintBill: true,
      },
    });

    const crossPrinter = await selectOutletBillingPrinter(tenantB.tenant.id, s7.outlet1.id);
    assert(crossPrinter === null, "Tenant B must NEVER resolve Tenant s7's printer");
    const waCfgB = await resolveWhatsAppConfig(tenantB.tenant.id, s5.outlet1.id);
    assert(waCfgB.phoneNumberId === "pn_tenant_b", "Tenant B cannot read s5's outlet/tenant WA config");

    const validSig = signInvoiceAccessToken(s1.tenant.id, s6Invoice.invoiceNumber);
    assert(
      verifyInvoiceAccessToken(s1.tenant.id, s6Invoice.invoiceNumber, String(validSig.exp), validSig.sig) === true,
      "Valid signature must verify for owning tenant"
    );
    assert(
      verifyInvoiceAccessToken(tenantB.tenant.id, s6Invoice.invoiceNumber, String(validSig.exp), validSig.sig) === false,
      "Signature must FAIL cross-tenant verification"
    );
    assert(
      (await loadInvoicePdfPayload(s6Invoice.invoiceNumber, tenantB.tenant.id)) === null,
      "loadInvoicePdfPayload must return null for wrong tenant"
    );

    await prisma.customerConsent.create({
      data: {
        tenantId: tenantB.tenant.id,
        phone: normalizeWhatsAppPhone("+91 9000000013"),
        channel: "WHATSAPP",
        optIn: false,
        marketingOptIn: false,
        optInSource: "WHATSAPP_STOP",
      },
    });
    const { order: optOutOrder } = await createCompletedOrder({
      tenantId: tenantB.tenant.id,
      outletId: tenantB.outlet1.id,
      item: tenantB.item,
      orderNum: `ORD-OPTOUT-${runTag}`,
      invoiceNum: `INV-OPTOUT-${runTag}`,
      customerPhone: "+91 9000000013",
    });
    const waOptOutRes = await queueAndSendWhatsAppInvoice(optOutOrder.id, { transport: mockSuccessTransport });
    assert(waOptOutRes.status === "OPTED_OUT" && waOptOutRes.queued === false, "Opted-out customer must be blocked");
    console.log("  ✓ PASS: Cross-tenant PDF/config/printer isolation & WhatsApp STOP opt-out verified");
    passed++;

    // -----------------------------------------------------------------
    // Scenario 14: Invoice PDF generates cleanly and is valid
    // -----------------------------------------------------------------
    console.log("▶ Scenario 14: Invoice PDF generates valid %PDF- binary buffer + signed link");
    const pdfPayload = await loadInvoicePdfPayload(s6Invoice.invoiceNumber, s1.tenant.id);
    assert(pdfPayload !== null, "loadInvoicePdfPayload returned payload for owning tenant");
    const pdfBuffer = await generateInvoicePDF(pdfPayload.pdfData);
    assert(pdfBuffer.length > 1000, "PDF buffer must be non-trivial size");
    assert(pdfBuffer.subarray(0, 5).toString("ascii") === "%PDF-", "PDF must begin with %PDF- magic header");
    const pdfAscii = pdfBuffer.toString("latin1");
    assert(pdfAscii.includes("%%EOF"), "PDF must include valid %%EOF trailer");
    assert(pdfAscii.includes(s6Invoice.invoiceNumber), "PDF Info embeds invoice number");
    assert(pdfAscii.includes("Tax Invoice"), "PDF Info embeds Tax Invoice metadata");
    const signedUrl = buildSignedInvoicePdfUrl(s1.tenant.id, s6Invoice.invoiceNumber, "https://www.restronexpos.com");
    assert(signedUrl.includes("&sig=") && signedUrl.includes(`tid=${s1.tenant.id}`), "Signed URL properly structured");
    console.log(`  ✓ PASS: Valid %PDF- invoice generated (${pdfBuffer.length} bytes) & cryptographically signed`);
    passed++;

    // -----------------------------------------------------------------
    // Scenario 15: 58mm and 80mm thermal receipt formatting renders accurately
    // -----------------------------------------------------------------
    console.log("▶ Scenario 15: 58mm (32-col) and 80mm (48-col) ESC/POS receipt formatting");
    const baseInput = {
      restaurantName: "Waffle Plum House",
      logoUrl: "https://www.restronexpos.com/logo.png",
      outletName: "Vellore Flagship",
      outletAddress: "Virupachipuram",
      outletCity: "Vellore",
      outletPhone: "+91 9513008467",
      gstin: "33ABCDE1234F1Z5",
      fssai: "12423000001111",
      invoiceNumber: "INV-2026-0099",
      orderNumber: "ORD-2026-0099",
      dateStr: "11 Nov 2026",
      timeStr: "12:15 AM",
      orderType: "DINE_IN",
      tableName: "T-4",
      customerName: "Ananya Verma",
      customerPhone: "+91 9000000099",
      items: [
        { name: "Classic Maple Belgian Waffle", quantity: 2, unitPricePaise: 15000, totalPaise: 30000 },
        { name: "Hazelnut Cold Coffee", quantity: 1, unitPricePaise: 12000, totalPaise: 12000 },
      ],
      subtotalPaise: 42000,
      discountPaise: 2000,
      cgstPaise: 3600,
      sgstPaise: 3600,
      otherTaxesPaise: 0,
      totalPaise: 47200,
      paymentMethod: "UPI",
      paymentStatus: "PAID" as const,
      transactionId: "UPI-REF-9988",
      qrData: "https://www.restronexpos.com/verify/INV-2026-0099",
      footerText: "Thank you for visiting!",
    };

    const r58 = formatThermalReceipt(baseInput, "58mm");
    const r80 = formatThermalReceipt(baseInput, "80mm");
    assert(r58.columns === 32 && r80.columns === 48, "Column counts 32 vs 48");
    assert(r58.textLines.every((l) => l.length <= 32), "All 58mm lines must wrap/fit <= 32 cols");
    assert(r80.textLines.every((l) => l.length <= 48), "All 80mm lines must fit <= 48 cols");
    assert(
      r58.textLines.some((l) => l.includes("TOTAL AMOUNT") && l.includes("Rs.472.00")),
      "58mm contains formatted TOTAL AMOUNT"
    );
    assert(
      r80.textLines.some((l) => l.includes("GSTIN: 33ABCDE1234F1Z5")),
      "80mm contains GSTIN"
    );
    const r80Bytes = Buffer.from(r80.escPosBase64, "base64");
    assert(r80Bytes.includes(Buffer.from([0x1d, 0x28, 0x6b])), "ESC/POS binary includes GS ( k QR command");
    assert(r80Bytes.includes(Buffer.from([0x1d, 0x56])), "ESC/POS binary includes paper cut command");
    const sampleMsg = formatWhatsAppBillMessage({
      restaurantName: "Demo",
      customerName: "Guest",
      invoiceNumber: "INV-1",
      orderType: "TAKEAWAY",
      invoiceDate: "11 Nov 2026",
      invoiceTime: "12:15 AM",
      items: [{ name: "Waffle", quantity: 1, unitPricePaise: 10000, totalPaise: 10000 }],
      subtotalPaise: 10000,
      discountPaise: 0,
      cgstPaise: 900,
      sgstPaise: 900,
      totalPaise: 11800,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      outletName: "Main",
    });
    assert(sampleMsg.includes("Amount: ₹118") && sampleMsg.includes("Powered by RestroNex."), "WhatsApp bill copy formatted accurately");
    console.log("  ✓ PASS: 58mm (32-col) and 80mm (48-col) text + ESC/POS binary with QR & cut verified");
    passed++;
  } catch (err: any) {
    console.error(`\n❌ TEST FAILURE: ${err?.stack || err?.message || err}`);
  } finally {
    for (const closeFn of serversToClose) {
      await closeFn().catch(() => {});
    }
    if (createdTenantIds.length > 0) {
      await prisma.whatsAppDeliveryLog.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.whatsAppMessageQueue.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.printJob.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.printerRoutingRule.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.printerDevice.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.invoiceRecord.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { order: { tenantId: { in: createdTenantIds } } } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: createdTenantIds } } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.customerConsent.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.menuItem.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.menuCategory.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.outletWhatsAppConfig.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.restaurantSetting.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.membership.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.outlet.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }
    console.log("\nℹ Test tenants, loopback TCP sockets, and temporary records cleaned up cleanly.");
    await prisma.$disconnect().catch(() => {});
  }

  console.log("\n=================================================================");
  console.log(`  TEST RESULTS: ${passed}/${total} SCENARIOS PASSED  `);
  console.log("=================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

run15ScenarioWhatsAppAndPrinterSuite();
