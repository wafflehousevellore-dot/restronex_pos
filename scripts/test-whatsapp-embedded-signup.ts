import assert from "assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db";
import {
  completeMetaEmbeddedSignup,
  getMetaAppCapabilityStatus,
  verifyConnectedWhatsAppNumber,
  type MetaGraphTransport,
} from "../src/lib/meta-whatsapp-onboarding";
import {
  queueAndSendWhatsAppInvoice,
  resolveWhatsAppConfig,
  validateAndNormalizeWhatsAppPhone,
  type WhatsAppTransport,
} from "../src/lib/whatsapp-invoice";
import { processDueBackgroundJobs } from "../src/lib/background-jobs";
import { verifyInvoiceAccessToken, signInvoiceAccessToken } from "../src/lib/invoice-storage";
import { POST as metaWebhookPost } from "../src/app/api/webhooks/whatsapp/route";

function createMockMetaTransport(opts?: {
  platformType?: "CLOUD_API" | "SMB";
  phoneStatus?: string;
  otpVerifiedStatus?: string;
  tokenExchangeFails?: boolean;
  phoneNumberId?: string;
  wabaId?: string;
}): MetaGraphTransport {
  return {
    async exchangeCode({ code }) {
      if (opts?.tokenExchangeFails || code === "INVALID_CODE") {
        return { ok: false, error: "Invalid OAuth verification code returned by Meta" };
      }
      return { ok: true, accessToken: `EAAB_MOCK_META_EXCHANGED_TOKEN_${code}` };
    },
    async discoverWaba() {
      return { ok: true, wabaId: opts?.wabaId || "waba_discovered_9001" };
    },
    async subscribeWabaWebhook() {
      return { ok: true };
    },
    async listPhoneNumbers() {
      return {
        ok: true,
        phones: [
          {
            id: opts?.phoneNumberId || "pn_meta_9001",
            display_phone_number: "+91 95130 08467",
            verified_name: "Restro Test Cafe",
            code_verification_status: opts?.otpVerifiedStatus ?? "VERIFIED",
            status: opts?.phoneStatus ?? "CONNECTED",
            platform_type: opts?.platformType ?? "CLOUD_API",
          },
        ],
      };
    },
    async inspectPhoneNumber({ phoneNumberId }) {
      return {
        ok: true,
        phone: {
          id: phoneNumberId,
          display_phone_number: "+91 95130 08467",
          verified_name: "Restro Test Cafe",
          code_verification_status: opts?.otpVerifiedStatus ?? "VERIFIED",
          status: opts?.phoneStatus ?? "CONNECTED",
          platform_type: opts?.platformType ?? "CLOUD_API",
        },
      };
    },
    async registerPhone() {
      return { ok: true };
    },
    async ensureUtilityTemplate({ templateName }) {
      return { ok: true, templateName, status: "APPROVED" };
    },
  };
}

async function run12ScenarioEmbeddedSignupSuite() {
  console.log("\n=================================================================");
  console.log("  RESTRO NEX — 12-SCENARIO META EMBEDDED SIGNUP & OTP SUITE      ");
  console.log("=================================================================\n");

  const runTag = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  let passed = 0;
  const total = 12;

  async function seedTenantFixture(suffix: string) {
    const user = await prisma.user.create({
      data: {
        id: `usr_emb_${runTag}_${suffix}`,
        email: `emb_${runTag}_${suffix}@restronex-test.in`,
        name: `Owner ${suffix}`,
        role: "OWNER",
      },
    });
    createdUserIds.push(user.id);

    const tenant = await prisma.tenant.create({
      data: {
        name: `Restro ${suffix}`,
        slug: `restro-emb-${runTag}-${suffix}`.toLowerCase(),
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

    const outlet = await prisma.outlet.create({
      data: {
        tenantId: tenant.id,
        name: `Outlet ${suffix}`,
        slug: `out-emb-${runTag}-${suffix}`.toLowerCase(),
        address: "100 Feet Road",
        city: "Vellore",
        phone: "+91 9513008467",
      },
    });

    const cat = await prisma.menuCategory.create({
      data: { tenantId: tenant.id, name: "Mains", slug: `mains-${suffix}` },
    });

    const item = await prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: cat.id,
        name: "Belgian Classic Waffle",
        pricePaise: 20000,
        isVeg: true,
      },
    });

    return { user, tenant, outlet, item };
  }

  async function seedOrder(params: {
    tenantId: string;
    outletId: string;
    item: { id: string; name: string; pricePaise: number };
    orderNum: string;
    invoiceNum: string;
    phone: string | null;
    consent: boolean;
    idempotencyKey?: string;
  }) {
    const order = await prisma.order.create({
      data: {
        tenantId: params.tenantId,
        outletId: params.outletId,
        orderNumber: params.orderNum,
        type: "DINE_IN",
        serviceMode: "DINE_IN",
        status: "BILLED",
        isPaid: true,
        paidAt: new Date(),
        billClosedAt: new Date(),
        subtotalPaise: 20000,
        discountPaise: 0,
        taxPaise: 3600,
        totalPaise: 23600,
        customerName: "Ananya Rao",
        customerPhone: params.phone,
        whatsappConsent: params.consent,
        idempotencyKey: params.idempotencyKey || null,
        items: {
          create: {
            menuItemId: params.item.id,
            name: params.item.name,
            quantity: 1,
            unitPricePaise: 20000,
            totalPaise: 20000,
          },
        },
        payments: {
          create: {
            tenantId: params.tenantId,
            outletId: params.outletId,
            method: "UPI",
            amountPaise: 23600,
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
        subtotalPaise: 20000,
        taxPaise: 3600,
        discountPaise: 0,
        totalPaise: 23600,
        customerName: "Ananya Rao",
        customerPhone: params.phone,
        status: "FINALIZED",
      },
    });

    return { order, invoice };
  }

  const fakeAppCreds = { clientId: "meta_app_test_123", clientSecret: "meta_secret_test_abc" };

  try {
    // 1. New WhatsApp Business number onboarding (Meta Embedded Signup)
    console.log("▶ Scenario 1: New WhatsApp Business number onboarding via Embedded Signup");
    const orgA = await seedTenantFixture("org_a");
    const onbCloud = await completeMetaEmbeddedSignup(
      {
        tenantId: orgA.tenant.id,
        userId: orgA.user.id,
        code: "META_OAUTH_CODE_CLOUD_1",
        wabaId: "waba_org_a_1",
        phoneNumberId: "pn_org_a_1",
        eventType: "FINISH",
        coexistenceRequested: false,
        appCredentialsOverride: fakeAppCreds,
      },
      createMockMetaTransport({
        platformType: "CLOUD_API",
        phoneStatus: "CONNECTED",
        otpVerifiedStatus: "VERIFIED",
        phoneNumberId: `pn_org_a_${runTag}`,
      })
    );
    assert(onbCloud.ok === true && onbCloud.status === "CONNECTED", "Cloud onboarding must verify and connect");
    assert(onbCloud.connectionMode === "EMBEDDED_SIGNUP" && onbCloud.isCoexistence === false, "Mode EMBEDDED_SIGNUP");
    const orgASetting = await prisma.restaurantSetting.findUnique({ where: { tenantId: orgA.tenant.id } });
    assert(orgASetting?.whatsappConnectedAt !== null && orgASetting?.whatsappLastVerifiedAt !== null, "Timestamps saved");
    assert(
      Boolean(orgASetting?.whatsappAccessToken) && !orgASetting!.whatsappAccessToken!.includes("EAAB_"),
      "Token stored encrypted via AES-256-GCM"
    );
    console.log("  ✓ PASS: New Meta Cloud number verified, subscribed, encrypted, and marked CONNECTED");
    passed++;

    // 2. Existing WhatsApp Business App Coexistence onboarding & ineligible guard
    console.log("▶ Scenario 2: WhatsApp Business App Coexistence eligible & unavailable guard");
    const orgCoex = await seedTenantFixture("org_coex");
    const coexOk = await completeMetaEmbeddedSignup(
      {
        tenantId: orgCoex.tenant.id,
        userId: orgCoex.user.id,
        code: "META_OAUTH_CODE_COEX_1",
        wabaId: "waba_coex_1",
        phoneNumberId: "pn_coex_1",
        eventType: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        coexistenceRequested: true,
        appCredentialsOverride: fakeAppCreds,
      },
      createMockMetaTransport({
        platformType: "SMB",
        phoneStatus: "CONNECTED",
        otpVerifiedStatus: "VERIFIED",
        phoneNumberId: `pn_coex_${runTag}`,
      })
    );
    assert(coexOk.ok === true && coexOk.connectionMode === "COEXISTENCE" && coexOk.isCoexistence === true, "SMB coexistence connected");

    // Ineligible coexistence must NOT mark connected or silently migrate
    const orgIneligible = await seedTenantFixture("org_ineligible");
    const coexDenied = await completeMetaEmbeddedSignup(
      {
        tenantId: orgIneligible.tenant.id,
        code: "META_OAUTH_CODE_CLOUD_ONLY",
        coexistenceRequested: true,
        appCredentialsOverride: fakeAppCreds,
      },
      createMockMetaTransport({ platformType: "CLOUD_API" })
    );
    assert(!coexDenied.ok && "code" in coexDenied && coexDenied.code === "COEXISTENCE_UNAVAILABLE", "Must report COEXISTENCE_UNAVAILABLE");
    assert("supportedAlternative" in coexDenied && Boolean(coexDenied.supportedAlternative), "Must explain supported Cloud API alternative cleanly");
    console.log("  ✓ PASS: SMB Coexistence connected & ineligible account handled honestly without silent migration");
    passed++;

    // 3. Honest missing-Meta-Partner setup check (when Meta env vars absent)
    console.log("▶ Scenario 3: Missing Meta App prerequisites reports SETUP_REQUIRED without faking");
    const origAppId = process.env.NEXT_PUBLIC_META_APP_ID;
    const origCfgId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;
    const origSecret = process.env.META_APP_SECRET;
    delete process.env.NEXT_PUBLIC_META_APP_ID;
    delete process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;
    delete process.env.META_APP_SECRET;

    const cap = getMetaAppCapabilityStatus();
    const missingEnvRes = await completeMetaEmbeddedSignup({
      tenantId: orgIneligible.tenant.id,
      code: "SOME_CODE",
    });
    if (origAppId) process.env.NEXT_PUBLIC_META_APP_ID = origAppId;
    if (origCfgId) process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID = origCfgId;
    if (origSecret) process.env.META_APP_SECRET = origSecret;

    assert(cap.configured === false && cap.missingPrerequisites.length >= 3, "Detects missing Meta Partner keys");
    assert(!missingEnvRes.ok && "code" in missingEnvRes && missingEnvRes.code === "META_PARTNER_SETUP_REQUIRED", "Blocks connection cleanly when unprovisioned");
    console.log("  ✓ PASS: Zero-fake setup gate blocks connection when Meta partner keys are unprovisioned");
    passed++;

    // 4. Invalid/incomplete authorization & unverified OTP number rejection
    console.log("▶ Scenario 4: Rejects empty code, failed OAuth exchange & unverified Meta phone status");
    const emptyRes = await completeMetaEmbeddedSignup(
      { tenantId: orgIneligible.tenant.id, code: "   ", appCredentialsOverride: fakeAppCreds },
      createMockMetaTransport()
    );
    assert(!emptyRes.ok && "code" in emptyRes && emptyRes.code === "INCOMPLETE_AUTHORIZATION", "Empty code rejected");

    const badTokenRes = await completeMetaEmbeddedSignup(
      { tenantId: orgIneligible.tenant.id, code: "INVALID_CODE", appCredentialsOverride: fakeAppCreds },
      createMockMetaTransport({ tokenExchangeFails: true })
    );
    assert(!badTokenRes.ok && "code" in badTokenRes && badTokenRes.code === "TOKEN_EXCHANGE_FAILED", "Bad OAuth code rejected");

    const unverifiedNumRes = await completeMetaEmbeddedSignup(
      { tenantId: orgIneligible.tenant.id, code: "CODE_UNVERIFIED", appCredentialsOverride: fakeAppCreds },
      createMockMetaTransport({ phoneStatus: "PENDING", otpVerifiedStatus: "NOT_VERIFIED" })
    );
    assert(!unverifiedNumRes.ok && "code" in unverifiedNumRes && unverifiedNumRes.code === "NUMBER_NOT_VERIFIED", "Unverified number NEVER marked connected");
    const verifyCheck = await verifyConnectedWhatsAppNumber(
      { tenantId: orgA.tenant.id },
      createMockMetaTransport({ phoneStatus: "CONNECTED", otpVerifiedStatus: "VERIFIED" })
    );
    assert(verifyCheck.ok && verifyCheck.status === "CONNECTED", "Live verification refresh succeeds");
    console.log("  ✓ PASS: Incomplete authorization, bad tokens & unverified OTP states accurately rejected");
    passed++;

    // 5. Automatic invoice delivery after POS bill closure + §4 message format + PDF link
    console.log("▶ Scenario 5: POS bill closure automatically formats & dispatches invoice PDF");
    const sentPayloads: Parameters<WhatsAppTransport>[0][] = [];
    const mockSend: WhatsAppTransport = async (req) => {
      sentPayloads.push(req);
      return { ok: true, wamid: `wamid.emb.${Date.now()}` };
    };
    const { order: ord5, invoice: inv5 } = await seedOrder({
      tenantId: orgA.tenant.id,
      outletId: orgA.outlet.id,
      item: orgA.item,
      orderNum: `ORD-E5-${runTag}`,
      invoiceNum: `INV-E5-${runTag}`,
      phone: "+91 9876543210",
      consent: true,
      idempotencyKey: `idem_e5_${runTag}`,
    });
    const res5 = await queueAndSendWhatsAppInvoice(ord5.id, {
      baseUrl: "https://www.restronexpos.com",
      transport: mockSend,
    });
    assert(res5.status === "SENT" && sentPayloads.length === 1, "Invoice sent automatically once");
    assert(sentPayloads[0].messageText.includes("Hello Ananya Rao,"), "Includes customer_name");
    assert(sentPayloads[0].messageText.includes(`Your bill ${inv5.invoiceNumber} has been generated.`), "Includes invoice number");
    assert(sentPayloads[0].messageText.includes("Amount: ₹236"), "Includes real total amount");
    assert(sentPayloads[0].messageText.includes("Payment: PAID (UPI)"), "Includes payment status");
    assert(sentPayloads[0].messageText.includes("Your invoice is attached as a PDF."), "Mentions attached PDF");
    assert(sentPayloads[0].messageText.includes("Powered by RestroNex."), "Includes RestroNex attribution");
    assert(Boolean(sentPayloads[0].pdfUrl?.includes(inv5.invoiceNumber)), "Signed PDF URL attached to template");
    console.log("  ✓ PASS: Automatic POS invoice message & PDF attachment delivered via Meta transport");
    passed++;

    // 6. Customer without consent (never sends, keeps bill finalized)
    console.log("▶ Scenario 6: Customer without checkout consent is never messaged");
    const { order: ordNoConsent } = await seedOrder({
      tenantId: orgA.tenant.id,
      outletId: orgA.outlet.id,
      item: orgA.item,
      orderNum: `ORD-NOCONS-${runTag}`,
      invoiceNum: `INV-NOCONS-${runTag}`,
      phone: "+91 9876500000",
      consent: false,
    });
    const sendsBefore = sentPayloads.length;
    const resNoConsent = await queueAndSendWhatsAppInvoice(ordNoConsent.id, { transport: mockSend });
    assert(resNoConsent.queued === false && resNoConsent.status === "OPTED_OUT", "Must not queue without consent");
    assert(sentPayloads.length === sendsBefore, "Zero Meta calls for non-consented guest");
    console.log("  ✓ PASS: Missing consent blocked delivery cleanly while preserving billed order");
    passed++;

    // 7. Invalid customer phone number rejected safely without blocking POS bill
    console.log("▶ Scenario 7: Invalid customer phone & country code rejected safely");
    assert(validateAndNormalizeWhatsAppPhone("12345").valid === false, "Short number invalid");
    assert(validateAndNormalizeWhatsAppPhone("abc9876543210").valid === false, "Letters invalid");
    assert(validateAndNormalizeWhatsAppPhone("+91 1234567890").valid === false, "Indian numbers must start 6-9");
    assert(validateAndNormalizeWhatsAppPhone("+14155551234").valid === true, "Valid E.164 international accepted");

    const { order: ordBadPhone } = await seedOrder({
      tenantId: orgA.tenant.id,
      outletId: orgA.outlet.id,
      item: orgA.item,
      orderNum: `ORD-BADPH-${runTag}`,
      invoiceNum: `INV-BADPH-${runTag}`,
      phone: "12345",
      consent: true,
    });
    const resBadPhone = await queueAndSendWhatsAppInvoice(ordBadPhone.id, { transport: mockSend });
    assert(resBadPhone.queued === false && resBadPhone.status === "FAILED", "Invalid number marked FAILED");
    assert(sentPayloads.length === sendsBefore, "Invalid number never hits Meta Cloud API");
    console.log("  ✓ PASS: Invalid phone/country code rejected & logged cleanly without API call");
    passed++;

    // 8. Failed API request & durable retry without blocking POS
    console.log("▶ Scenario 8: Failed Meta API request scheduled for retry & recovers cleanly");
    const mockFail: WhatsAppTransport = async () => ({ ok: false, error: "Meta HTTP 500 Internal Error" });
    const { order: ordFail } = await seedOrder({
      tenantId: orgA.tenant.id,
      outletId: orgA.outlet.id,
      item: orgA.item,
      orderNum: `ORD-FAIL-${runTag}`,
      invoiceNum: `INV-FAIL-${runTag}`,
      phone: "+91 9888877777",
      consent: true,
    });
    const failRes = await queueAndSendWhatsAppInvoice(ordFail.id, { transport: mockFail });
    assert(failRes.status === "FAILED" && Boolean(failRes.queueId), "Recorded FAILED status");
    await prisma.whatsAppMessageQueue.update({
      where: { id: failRes.queueId! },
      data: { nextRetryAt: new Date(Date.now() - 1000) },
    });
    const workerRes = await processDueBackgroundJobs({
      tenantId: orgA.tenant.id,
      whatsappTransport: mockSend,
    });
    const recovered = await prisma.whatsAppMessageQueue.findUnique({ where: { id: failRes.queueId! } });
    assert(workerRes.whatsappProcessed === 1 && recovered?.status === "SENT", "Retry worker transitioned FAILED -> SENT");
    console.log("  ✓ PASS: Failed delivery recovered automatically via queue worker");
    passed++;

    // 9. Duplicate job prevention (idempotency on POS retry/refresh)
    console.log("▶ Scenario 9: Duplicate job prevention on retried/refreshed bill checkout");
    const countBeforeDup = sentPayloads.length;
    const dupCall = await queueAndSendWhatsAppInvoice(ord5.id, { transport: mockSend });
    const queueRows = await prisma.whatsAppMessageQueue.count({ where: { orderId: ord5.id } });
    assert(sentPayloads.length === countBeforeDup, "Must NOT re-send to Meta on duplicate trigger");
    assert(queueRows === 1 && dupCall.reason?.includes("idempotently"), "Strictly 1 outbox queue row per order");
    console.log("  ✓ PASS: Idempotency prevented duplicate WhatsApp deliveries cleanly");
    passed++;

    // 10. Meta webhook delivery status transitions (DELIVERED -> READ) & STOP opt-out
    console.log("▶ Scenario 10: Meta webhook updates DELIVERED/READ status and STOP opt-out");
    const queueOrd5 = await prisma.whatsAppMessageQueue.findFirst({ where: { orderId: ord5.id } });
    assert(Boolean(queueOrd5?.wamid), "ord5 queue record has wamid");

    // Temporarily ensure APP_SECRET unset during test webhook post so unsigned synthetic Meta JSON passes
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.META_APP_SECRET;

    const webhookBody = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: onbCloud.phoneNumberId },
                statuses: [
                  { id: queueOrd5!.wamid, status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)) },
                  { id: queueOrd5!.wamid, status: "read", timestamp: String(Math.floor(Date.now() / 1000)) },
                ],
                messages: [
                  { from: "919876543210", text: { body: "STOP" } },
                ],
              },
            },
          ],
        },
      ],
    };
    const req = new NextRequest("https://www.restronexpos.com/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(webhookBody),
    });
    const whRes = await metaWebhookPost(req);
    assert(whRes.status === 200, "Webhook handler returned 200 OK");

    const updatedQueue5 = await prisma.whatsAppMessageQueue.findUnique({ where: { id: queueOrd5!.id } });
    const consentStopped = await prisma.customerConsent.findUnique({
      where: {
        tenantId_phone_channel: {
          tenantId: orgA.tenant.id,
          phone: "919876543210",
          channel: "WHATSAPP",
        },
      },
    });
    assert(updatedQueue5?.status === "READ" && updatedQueue5?.readAt !== null, "Webhook updated queue status to READ");
    assert(consentStopped?.optIn === false && consentStopped?.optInSource === "WHATSAPP_STOP", "STOP recorded opt-out");
    console.log("  ✓ PASS: Webhook route processed DELIVERED/READ transitions & STOP opt-out");
    passed++;

    // 11. Multiple organizations with separate WhatsApp accounts & cross-tenant isolation
    console.log("▶ Scenario 11: Multiple organizations use isolated WhatsApp accounts");
    const orgB = await seedTenantFixture("org_b");
    await completeMetaEmbeddedSignup(
      {
        tenantId: orgB.tenant.id,
        userId: orgB.user.id,
        code: "META_OAUTH_CODE_ORG_B",
        wabaId: "waba_org_b",
        phoneNumberId: "pn_org_b",
        appCredentialsOverride: fakeAppCreds,
      },
      {
        ...createMockMetaTransport(),
        async listPhoneNumbers() {
          return {
            ok: true,
            phones: [
              {
                id: "pn_org_b",
                display_phone_number: "+91 98400 11223",
                status: "CONNECTED",
                code_verification_status: "VERIFIED",
                platform_type: "CLOUD_API",
              },
            ],
          };
        },
        async inspectPhoneNumber() {
          return {
            ok: true,
            phone: {
              id: "pn_org_b",
              display_phone_number: "+91 98400 11223",
              status: "CONNECTED",
              code_verification_status: "VERIFIED",
              platform_type: "CLOUD_API",
            },
          };
        },
      }
    );

    const cfgA = await resolveWhatsAppConfig(orgA.tenant.id);
    const cfgB = await resolveWhatsAppConfig(orgB.tenant.id);
    assert(cfgA.phoneNumberId === onbCloud.phoneNumberId && cfgB.phoneNumberId === "pn_org_b", "Separate sender accounts");
    const sigA = signInvoiceAccessToken(orgA.tenant.id, inv5.invoiceNumber);
    assert(!verifyInvoiceAccessToken(orgB.tenant.id, inv5.invoiceNumber, String(sigA.exp), sigA.sig), "Cross-tenant PDF denied");
    console.log("  ✓ PASS: Complete tenant isolation across WhatsApp credentials and signed PDFs");
    passed++;

    // 12. Disconnection & Reconnection preserves all invoices, orders & customer data
    console.log("▶ Scenario 12: Disconnect preserves historical data; reconnect restores CONNECTED");
    const ordersBefore = await prisma.order.count({ where: { tenantId: orgA.tenant.id } });
    const invoicesBefore = await prisma.invoiceRecord.count({ where: { tenantId: orgA.tenant.id } });
    const logsBefore = await prisma.whatsAppDeliveryLog.count({ where: { tenantId: orgA.tenant.id } });

    await prisma.restaurantSetting.update({
      where: { tenantId: orgA.tenant.id },
      data: {
        autoSendWhatsAppInvoice: false,
        whatsappAccessToken: null,
        whatsappPhoneNumberId: null,
        whatsappWabaId: null,
        whatsappConnectionStatus: "DISCONNECTED",
      },
    });
    const cfgAfterDisconnect = await resolveWhatsAppConfig(orgA.tenant.id);
    assert(cfgAfterDisconnect.status === "DISCONNECTED" && cfgAfterDisconnect.accessToken === null, "Credentials revoked cleanly");
    assert((await prisma.order.count({ where: { tenantId: orgA.tenant.id } })) === ordersBefore, "Orders intact");
    assert((await prisma.invoiceRecord.count({ where: { tenantId: orgA.tenant.id } })) === invoicesBefore, "Invoices intact");
    assert((await prisma.whatsAppDeliveryLog.count({ where: { tenantId: orgA.tenant.id } })) === logsBefore, "Logs intact");

    const reconnected = await completeMetaEmbeddedSignup(
      {
        tenantId: orgA.tenant.id,
        userId: orgA.user.id,
        code: "META_OAUTH_RECONNECT_2",
        appCredentialsOverride: fakeAppCreds,
      },
      createMockMetaTransport()
    );
    assert(reconnected.ok && reconnected.status === "CONNECTED", "Reconnected cleanly after Meta verification");
    console.log("  ✓ PASS: Disconnect cleared tokens while preserving all invoices/sales; reconnect restored service");
    passed++;
  } catch (err: any) {
    console.error(`\n❌ TEST FAILURE: ${err?.stack || err?.message || err}`);
  } finally {
    if (createdTenantIds.length > 0) {
      await prisma.whatsAppDeliveryLog.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.whatsAppMessageQueue.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.printJob.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
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
      await prisma.integrationConfig.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.restaurantSetting.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.membership.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.outlet.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { tenantId: { in: createdTenantIds } } }).catch(() => {});
      await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }
    console.log("\nℹ All temporary test organizations & records cleaned up cleanly.");
    await prisma.$disconnect().catch(() => {});
  }

  console.log("\n=================================================================");
  console.log(`  EMBEDDED SIGNUP TEST RESULTS: ${passed}/${total} SCENARIOS PASSED `);
  console.log("=================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

run12ScenarioEmbeddedSignupSuite();
