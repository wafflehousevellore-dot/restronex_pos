import { prisma } from "./db";
import { encryptAccessToken, decryptAccessToken } from "./whatsapp-invoice";

export interface MetaAppCapabilityStatus {
  configured: boolean;
  metaAppId: string | null;
  configId: string | null;
  graphVersion: string;
  webhookVerifyTokenConfigured: boolean;
  appSecretConfigured: boolean;
  missingPrerequisites: string[];
}

export function getMetaAppCapabilityStatus(): MetaAppCapabilityStatus {
  const metaAppId = (process.env.NEXT_PUBLIC_META_APP_ID || "").trim() || null;
  const configId = (process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || "").trim() || null;
  const appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "").trim();
  const verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();
  const graphVersion = (process.env.META_GRAPH_API_VERSION || "v21.0").trim();

  const missing: string[] = [];
  if (!metaAppId) missing.push("Meta App ID (NEXT_PUBLIC_META_APP_ID)");
  if (!configId) missing.push("Meta Embedded Signup Configuration ID (NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID)");
  if (!appSecret) missing.push("Meta App Secret (META_APP_SECRET)");
  if (!verifyToken) missing.push("Dedicated Webhook Verify Token (WHATSAPP_VERIFY_TOKEN)");

  return {
    configured: Boolean(metaAppId && configId && appSecret),
    metaAppId,
    configId,
    graphVersion,
    webhookVerifyTokenConfigured: Boolean(verifyToken),
    appSecretConfigured: Boolean(appSecret),
    missingPrerequisites: missing,
  };
}

export interface MetaDiscoveredPhone {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  code_verification_status?: string; // VERIFIED | NOT_VERIFIED | EXPIRED
  quality_rating?: string;
  status?: string; // CONNECTED | PENDING | FLAGGED | RESTRICTED | DISCONNECTED
  platform_type?: string; // CLOUD_API | SMB | NOT_APPLICABLE
}

export interface MetaGraphTransport {
  exchangeCode: (args: {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri?: string;
  }) => Promise<{ ok: boolean; accessToken?: string; error?: string }>;

  discoverWaba: (args: {
    accessToken: string;
    clientId: string;
    clientSecret: string;
  }) => Promise<{ ok: boolean; wabaId?: string; phoneNumberId?: string; businessId?: string; error?: string }>;

  subscribeWabaWebhook: (args: {
    wabaId: string;
    accessToken: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  listPhoneNumbers: (args: {
    wabaId: string;
    accessToken: string;
  }) => Promise<{ ok: boolean; phones: MetaDiscoveredPhone[]; error?: string }>;

  inspectPhoneNumber: (args: {
    phoneNumberId: string;
    accessToken: string;
  }) => Promise<{ ok: boolean; phone?: MetaDiscoveredPhone; error?: string }>;

  registerPhone: (args: {
    phoneNumberId: string;
    accessToken: string;
    pin: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  ensureUtilityTemplate: (args: {
    wabaId: string;
    accessToken: string;
    templateName: string;
  }) => Promise<{ ok: boolean; templateName: string; status?: string; error?: string }>;
}

function metaGraphBase(): string {
  const version = (process.env.META_GRAPH_API_VERSION || "v21.0").trim();
  return `https://graph.facebook.com/${version}`;
}

async function fetchMetaJson(url: string, init?: RequestInit): Promise<{ ok: boolean; json: any }> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  } finally {
    clearTimeout(tid);
  }
}

export const defaultMetaGraphTransport: MetaGraphTransport = {
  async exchangeCode({ clientId, clientSecret, code }) {
    try {
      const u = new URL(`${metaGraphBase()}/oauth/access_token`);
      u.searchParams.set("client_id", clientId);
      u.searchParams.set("client_secret", clientSecret);
      u.searchParams.set("code", code);

      const { ok, json } = await fetchMetaJson(u.toString(), { method: "GET" });
      if (!ok || !json?.access_token) {
        return {
          ok: false,
          error: json?.error?.message || "Failed to exchange Meta Embedded Signup authorization code",
        };
      }
      return { ok: true, accessToken: String(json.access_token) };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Meta OAuth exchange request failed" };
    }
  },

  async discoverWaba({ accessToken, clientId, clientSecret }) {
    try {
      // 1. Inspect debug_token granular_scopes (recommended for Tech Providers)
      const appToken = `${clientId}|${clientSecret}`;
      const dbgUrl = new URL(`${metaGraphBase()}/debug_token`);
      dbgUrl.searchParams.set("input_token", accessToken);
      dbgUrl.searchParams.set("access_token", appToken);
      const dbg = await fetchMetaJson(dbgUrl.toString());
      const scopes: any[] = dbg.json?.data?.granular_scopes || [];
      let wabaId: string | undefined;
      for (const s of scopes) {
        if (
          (s.scope === "whatsapp_business_management" || s.scope === "whatsapp_business_messaging") &&
          Array.isArray(s.target_ids) &&
          s.target_ids.length > 0
        ) {
          wabaId = String(s.target_ids[0]);
          break;
        }
      }

      // 2. Fallback: query /me/businesses -> client_whatsapp_business_accounts
      if (!wabaId) {
        const bizRes = await fetchMetaJson(`${metaGraphBase()}/me/businesses?fields=id,name`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const businesses: any[] = bizRes.json?.data || [];
        for (const biz of businesses) {
          const wabaRes = await fetchMetaJson(
            `${metaGraphBase()}/${biz.id}/client_whatsapp_business_accounts?fields=id,name`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (wabaRes.json?.data?.[0]?.id) {
            wabaId = String(wabaRes.json.data[0].id);
            return { ok: true, wabaId, businessId: String(biz.id) };
          }
        }
      }

      if (!wabaId) {
        return {
          ok: false,
          error: "No WhatsApp Business Account (WABA) was shared during Meta authorization",
        };
      }
      return { ok: true, wabaId };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to discover WhatsApp Business assets" };
    }
  },

  async subscribeWabaWebhook({ wabaId, accessToken }) {
    try {
      const { ok, json } = await fetchMetaJson(`${metaGraphBase()}/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!ok) {
        return { ok: false, error: json?.error?.message || "Failed to subscribe webhook on WABA" };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Webhook subscription network error" };
    }
  },

  async listPhoneNumbers({ wabaId, accessToken }) {
    try {
      const url = `${metaGraphBase()}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status,platform_type`;
      const { ok, json } = await fetchMetaJson(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!ok) {
        return { ok: false, phones: [], error: json?.error?.message || "Failed to fetch WABA phone numbers" };
      }
      return { ok: true, phones: Array.isArray(json?.data) ? json.data : [] };
    } catch (err: any) {
      return { ok: false, phones: [], error: err?.message || "Phone discovery failed" };
    }
  },

  async inspectPhoneNumber({ phoneNumberId, accessToken }) {
    try {
      const url = `${metaGraphBase()}/${phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status,platform_type`;
      const { ok, json } = await fetchMetaJson(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!ok || !json?.id) {
        return { ok: false, error: json?.error?.message || "Phone number verification lookup failed" };
      }
      return { ok: true, phone: json as MetaDiscoveredPhone };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Phone inspection request failed" };
    }
  },

  async registerPhone({ phoneNumberId, accessToken, pin }) {
    try {
      const { ok, json } = await fetchMetaJson(`${metaGraphBase()}/${phoneNumberId}/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", pin }),
      });
      if (!ok) {
        return { ok: false, error: json?.error?.message || "Cloud API phone registration failed" };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Phone registration failed" };
    }
  },

  async ensureUtilityTemplate({ wabaId, accessToken, templateName }) {
    try {
      const listRes = await fetchMetaJson(
        `${metaGraphBase()}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const existing = listRes.json?.data?.[0];
      if (existing) {
        return { ok: true, templateName, status: existing.status || "EXISTING" };
      }

      // Create standard transactional Utility invoice template with PDF Document header
      const createRes = await fetchMetaJson(`${metaGraphBase()}/${wabaId}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: templateName,
          category: "UTILITY",
          language: "en",
          components: [
            {
              type: "HEADER",
              format: "DOCUMENT",
              example: {
                header_handle: ["https://www.restronexpos.com/sample-invoice.pdf"],
              },
            },
            {
              type: "BODY",
              text: "Hello {{1}}, Thank you for visiting {{2}}! Your bill {{3}} has been generated. Amount: ₹{{4}}, Payment: {{5}}. Your invoice is attached as a PDF. Powered by RestroNex.",
              example: {
                body_text: [["Aarav", "Waffle House", "INV-2026-001", "330.40", "PAID (UPI)"]],
              },
            },
          ],
        }),
      });
      return {
        ok: createRes.ok,
        templateName,
        status: createRes.json?.status || (createRes.ok ? "PENDING_META_APPROVAL" : "CREATION_SKIPPED"),
      };
    } catch (err: any) {
      return { ok: false, templateName, error: err?.message };
    }
  },
};

export interface CompleteEmbeddedSignupParams {
  tenantId: string;
  userId?: string | null;
  outletId?: string | null;
  code: string;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  businessId?: string | null;
  coexistenceRequested?: boolean;
  eventType?: string | null; // e.g. FINISH | FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING
  pin?: string | null;
  deliverySettings?: {
    enabled?: boolean;
    sendPdfTaxInvoice?: boolean;
    sendPaymentConfirmation?: boolean;
    sendOrderConfirmation?: boolean;
    isDefaultSender?: boolean;
  };
  /** Used strictly by automated unit/integration test suites */
  appCredentialsOverride?: { clientId: string; clientSecret: string };
}

export async function completeMetaEmbeddedSignup(
  params: CompleteEmbeddedSignupParams,
  transport: MetaGraphTransport = defaultMetaGraphTransport
): Promise<
  | {
      ok: true;
      status: "CONNECTED";
      displayPhone: string;
      phoneNumberId: string;
      wabaId: string;
      connectionMode: "EMBEDDED_SIGNUP" | "COEXISTENCE";
      isCoexistence: boolean;
      connectedAt: Date;
      lastVerifiedAt: Date;
    }
  | {
      ok: false;
      status: number;
      code:
        | "META_PARTNER_SETUP_REQUIRED"
        | "INCOMPLETE_AUTHORIZATION"
        | "TOKEN_EXCHANGE_FAILED"
        | "WABA_DISCOVERY_FAILED"
        | "NO_PHONE_NUMBER"
        | "COEXISTENCE_UNAVAILABLE"
        | "NUMBER_NOT_VERIFIED"
        | "WEBHOOK_SUBSCRIPTION_FAILED";
      error: string;
      supportedAlternative?: string;
      missingPrerequisites?: string[];
    }
> {
  const cap = getMetaAppCapabilityStatus();
  const clientId = params.appCredentialsOverride?.clientId || cap.metaAppId;
  const clientSecret =
    params.appCredentialsOverride?.clientSecret ||
    (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      status: 503,
      code: "META_PARTNER_SETUP_REQUIRED",
      error:
        "RestroNex Meta Tech Provider / Embedded Signup configuration is missing in this environment.",
      missingPrerequisites: cap.missingPrerequisites,
    };
  }

  const code = (params.code || "").trim();
  if (!code) {
    return {
      ok: false,
      status: 400,
      code: "INCOMPLETE_AUTHORIZATION",
      error: "Meta Embedded Signup authorization was incomplete or cancelled before completion.",
    };
  }

  // Verify outlet belongs to tenant if specified
  if (params.outletId) {
    const outlet = await prisma.outlet.findFirst({
      where: { id: params.outletId, tenantId: params.tenantId },
      select: { id: true },
    });
    if (!outlet) {
      return {
        ok: false,
        status: 400,
        code: "INCOMPLETE_AUTHORIZATION",
        error: "Invalid outlet selection for this organization.",
      };
    }
  }

  // 1. Server-side OAuth authorization code exchange (token NEVER touches frontend)
  const tokenRes = await transport.exchangeCode({ clientId, clientSecret, code });
  if (!tokenRes.ok || !tokenRes.accessToken) {
    await recordVerificationFailure(params.tenantId, params.outletId || null, tokenRes.error || "Code exchange failed");
    return {
      ok: false,
      status: 400,
      code: "TOKEN_EXCHANGE_FAILED",
      error: tokenRes.error || "Could not exchange Meta authorization code.",
    };
  }
  const accessToken = tokenRes.accessToken;

  // 2. Discover or confirm WABA ID
  let resolvedWabaId = (params.wabaId || "").trim() || undefined;
  let resolvedPhoneId = (params.phoneNumberId || "").trim() || undefined;

  if (!resolvedWabaId) {
    const disc = await transport.discoverWaba({ accessToken, clientId, clientSecret });
    if (!disc.ok || !disc.wabaId) {
      await recordVerificationFailure(params.tenantId, params.outletId || null, disc.error || "No WABA discovered");
      return {
        ok: false,
        status: 400,
        code: "WABA_DISCOVERY_FAILED",
        error: disc.error || "No WhatsApp Business Account was returned by Meta.",
      };
    }
    resolvedWabaId = disc.wabaId;
    resolvedPhoneId = resolvedPhoneId || disc.phoneNumberId;
  }

  // 3. Subscribe app webhook to customer's WABA
  const subRes = await transport.subscribeWabaWebhook({ wabaId: resolvedWabaId, accessToken });
  if (!subRes.ok) {
    await recordVerificationFailure(
      params.tenantId,
      params.outletId || null,
      subRes.error || "Webhook subscription failed"
    );
    return {
      ok: false,
      status: 502,
      code: "WEBHOOK_SUBSCRIPTION_FAILED",
      error: subRes.error || "Failed to subscribe RestroNex webhook to WhatsApp Business Account.",
    };
  }

  // 4. Inspect WABA phone numbers & confirm genuine verification/registration
  const phonesRes = await transport.listPhoneNumbers({ wabaId: resolvedWabaId, accessToken });
  if (!phonesRes.ok || phonesRes.phones.length === 0) {
    await recordVerificationFailure(
      params.tenantId,
      params.outletId || null,
      phonesRes.error || "No phone number found in WABA"
    );
    return {
      ok: false,
      status: 400,
      code: "NO_PHONE_NUMBER",
      error: phonesRes.error || "No phone number was registered inside the selected WhatsApp Business Account.",
    };
  }

  let matchedPhone =
    (resolvedPhoneId ? phonesRes.phones.find((p) => p.id === resolvedPhoneId) : undefined) ||
    phonesRes.phones[0];

  const isCoexistenceEvent =
    Boolean(params.coexistenceRequested) ||
    params.eventType === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ||
    matchedPhone.platform_type === "SMB";

  // Respect Meta Coexistence eligibility strictly: never silently migrate/disconnect a mobile WhatsApp app number
  if (params.coexistenceRequested && matchedPhone.platform_type && matchedPhone.platform_type !== "SMB") {
    const errMsg =
      "WhatsApp Business App Coexistence is unavailable for this account/country/app version on Meta.";
    await recordVerificationFailure(params.tenantId, params.outletId || null, errMsg);
    return {
      ok: false,
      status: 409,
      code: "COEXISTENCE_UNAVAILABLE",
      error: errMsg,
      supportedAlternative:
        "Use a dedicated WhatsApp Cloud API phone number for automated RestroNex bills so your existing mobile WhatsApp Business App number is never migrated or disconnected.",
    };
  }

  // If pending registration & PIN provided for Cloud API (non-SMB coexistence), attempt registration
  if (matchedPhone.status === "PENDING" && !isCoexistenceEvent && params.pin) {
    await transport.registerPhone({
      phoneNumberId: matchedPhone.id,
      accessToken,
      pin: params.pin,
    });
  }

  // Re-verify final live capability status of the number on Meta Graph API
  const inspectRes = await transport.inspectPhoneNumber({
    phoneNumberId: matchedPhone.id,
    accessToken,
  });
  if (inspectRes.ok && inspectRes.phone) {
    matchedPhone = inspectRes.phone;
  }

  const isVerifiedNumber =
    matchedPhone.status === "CONNECTED" || matchedPhone.code_verification_status === "VERIFIED";

  if (!isVerifiedNumber) {
    const msg = `Phone number ${matchedPhone.display_phone_number} is not yet verified/active on Meta (status: ${
      matchedPhone.status || "UNKNOWN"
    }, OTP: ${matchedPhone.code_verification_status || "NOT_VERIFIED"}).`;
    await recordVerificationFailure(params.tenantId, params.outletId || null, msg);
    return {
      ok: false,
      status: 400,
      code: "NUMBER_NOT_VERIFIED",
      error: msg,
    };
  }

  // 5. Ensure backend transactional Utility template exists (completely invisible to restaurant owner)
  const defaultTemplate = (process.env.META_INVOICE_UTILITY_TEMPLATE || "order_invoice_utility").trim();
  await transport.ensureUtilityTemplate({
    wabaId: resolvedWabaId,
    accessToken,
    templateName: defaultTemplate,
  });

  // 6. Encrypt access token & store strictly scoped connection records
  const now = new Date();
  const encryptedToken = encryptAccessToken(accessToken);
  const finalMode: "EMBEDDED_SIGNUP" | "COEXISTENCE" =
    matchedPhone.platform_type === "SMB" || isCoexistenceEvent ? "COEXISTENCE" : "EMBEDDED_SIGNUP";
  const finalCoexistence = finalMode === "COEXISTENCE";
  const displayPhone = matchedPhone.display_phone_number;

  if (params.outletId) {
    await prisma.$transaction(async (tx) => {
      if (params.deliverySettings?.isDefaultSender) {
        await tx.outletWhatsAppConfig.updateMany({
          where: { tenantId: params.tenantId, isDefaultSender: true },
          data: { isDefaultSender: false },
        });
      }
      await tx.outletWhatsAppConfig.upsert({
        where: { outletId: params.outletId! },
        create: {
          tenantId: params.tenantId,
          outletId: params.outletId!,
          enabled: params.deliverySettings?.enabled ?? true,
          isDefaultSender: Boolean(params.deliverySettings?.isDefaultSender),
          phoneNumberId: matchedPhone.id,
          wabaId: resolvedWabaId!,
          displayPhone,
          accessTokenEnc: encryptedToken,
          templateName: defaultTemplate,
          connectionMode: finalMode,
          isCoexistence: finalCoexistence,
          status: "CONNECTED",
          verificationError: null,
          connectedAt: now,
          lastVerifiedAt: now,
        },
        update: {
          enabled: params.deliverySettings?.enabled ?? true,
          ...(params.deliverySettings?.isDefaultSender !== undefined
            ? { isDefaultSender: Boolean(params.deliverySettings.isDefaultSender) }
            : {}),
          phoneNumberId: matchedPhone.id,
          wabaId: resolvedWabaId!,
          displayPhone,
          accessTokenEnc: encryptedToken,
          templateName: defaultTemplate,
          connectionMode: finalMode,
          isCoexistence: finalCoexistence,
          status: "CONNECTED",
          verificationError: null,
          connectedAt: now,
          lastVerifiedAt: now,
        },
      });
    });
  } else {
    const existing = await prisma.restaurantSetting.findUnique({ where: { tenantId: params.tenantId } });
    if (existing) {
      await prisma.restaurantSetting.update({
        where: { id: existing.id },
        data: {
          autoSendWhatsAppInvoice: params.deliverySettings?.enabled ?? true,
          ...(params.deliverySettings?.sendPdfTaxInvoice !== undefined
            ? { whatsappSendPdfTaxInvoice: Boolean(params.deliverySettings.sendPdfTaxInvoice) }
            : {}),
          ...(params.deliverySettings?.sendPaymentConfirmation !== undefined
            ? { whatsappSendPaymentConfirm: Boolean(params.deliverySettings.sendPaymentConfirmation) }
            : {}),
          ...(params.deliverySettings?.sendOrderConfirmation !== undefined
            ? { whatsappSendOrderConfirm: Boolean(params.deliverySettings.sendOrderConfirmation) }
            : {}),
          whatsappPhoneNumberId: matchedPhone.id,
          whatsappWabaId: resolvedWabaId!,
          whatsappDisplayPhone: displayPhone,
          whatsappAccessToken: encryptedToken,
          whatsappTemplateName: defaultTemplate,
          whatsappConnectionMode: finalMode,
          whatsappCoexistence: finalCoexistence,
          whatsappConnectionStatus: "CONNECTED",
          whatsappVerificationError: null,
          whatsappConnectedAt: existing.whatsappConnectedAt || now,
          whatsappLastVerifiedAt: now,
          whatsappOnboardingSkipped: false,
        },
      });
    } else {
      await prisma.restaurantSetting.create({
        data: {
          tenantId: params.tenantId,
          autoSendWhatsAppInvoice: params.deliverySettings?.enabled ?? true,
          whatsappSendPdfTaxInvoice: params.deliverySettings?.sendPdfTaxInvoice ?? true,
          whatsappSendPaymentConfirm: params.deliverySettings?.sendPaymentConfirmation ?? true,
          whatsappSendOrderConfirm: params.deliverySettings?.sendOrderConfirmation ?? false,
          whatsappPhoneNumberId: matchedPhone.id,
          whatsappWabaId: resolvedWabaId!,
          whatsappDisplayPhone: displayPhone,
          whatsappAccessToken: encryptedToken,
          whatsappTemplateName: defaultTemplate,
          whatsappConnectionMode: finalMode,
          whatsappCoexistence: finalCoexistence,
          whatsappConnectionStatus: "CONNECTED",
          whatsappVerificationError: null,
          whatsappConnectedAt: now,
          whatsappLastVerifiedAt: now,
          whatsappOnboardingSkipped: false,
        },
      });
    }

    const intPayload = JSON.stringify({
      connectionMode: finalMode,
      isCoexistence: finalCoexistence,
      displayPhone,
      verifiedAt: now.toISOString(),
    });
    const existingInt = await prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId: params.tenantId, provider: "whatsapp_cloud" } },
    });
    if (existingInt) {
      await prisma.integrationConfig.update({
        where: { id: existingInt.id },
        data: { status: "CONNECTED", configJson: intPayload, lastSyncAt: now },
      });
    } else {
      await prisma.integrationConfig.create({
        data: {
          tenantId: params.tenantId,
          provider: "whatsapp_cloud",
          status: "CONNECTED",
          configJson: intPayload,
          lastSyncAt: now,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId || null,
      action: "WHATSAPP_EMBEDDED_SIGNUP_CONNECTED",
      entity: params.outletId ? "OutletWhatsAppConfig" : "RestaurantSetting",
      entityId: params.outletId || params.tenantId,
      metadataJson: JSON.stringify({
        outletId: params.outletId || null,
        displayPhone,
        connectionMode: finalMode,
        isCoexistence: finalCoexistence,
        connectedAt: now.toISOString(),
      }),
    },
  });

  return {
    ok: true,
    status: "CONNECTED",
    displayPhone,
    phoneNumberId: matchedPhone.id,
    wabaId: resolvedWabaId,
    connectionMode: finalMode,
    isCoexistence: finalCoexistence,
    connectedAt: now,
    lastVerifiedAt: now,
  };
}

async function recordVerificationFailure(tenantId: string, outletId: string | null, reason: string) {
  if (outletId) {
    await prisma.outletWhatsAppConfig
      .updateMany({
        where: { tenantId, outletId },
        data: { status: "VERIFICATION_FAILED", verificationError: reason },
      })
      .catch(() => {});
  } else {
    await prisma.restaurantSetting
      .upsert({
        where: { tenantId },
        create: {
          tenantId,
          whatsappConnectionStatus: "VERIFICATION_FAILED",
          whatsappVerificationError: reason,
        },
        update: {
          whatsappConnectionStatus: "VERIFICATION_FAILED",
          whatsappVerificationError: reason,
        },
      })
      .catch(() => {});
  }
}

export async function verifyConnectedWhatsAppNumber(
  params: { tenantId: string; outletId?: string | null },
  transport: MetaGraphTransport = defaultMetaGraphTransport
): Promise<{
  ok: boolean;
  status: string;
  displayPhone?: string | null;
  lastVerifiedAt?: Date | null;
  error?: string;
}> {
  const outletCfg = params.outletId
    ? await prisma.outletWhatsAppConfig.findFirst({
        where: { tenantId: params.tenantId, outletId: params.outletId },
      })
    : null;
  const setting = await prisma.restaurantSetting.findUnique({ where: { tenantId: params.tenantId } });

  const phoneNumberId = outletCfg?.phoneNumberId || setting?.whatsappPhoneNumberId;
  const accessToken = decryptAccessToken(outletCfg?.accessTokenEnc || setting?.whatsappAccessToken);
  const isPlatform =
    phoneNumberId === "PLATFORM_MANAGED" ||
    setting?.whatsappConnectionMode === "PLATFORM_GATEWAY" ||
    outletCfg?.connectionMode === "PLATFORM_GATEWAY";

  if (isPlatform) {
    const now = new Date();
    const verifiedPhone = outletCfg?.displayPhone || setting?.whatsappDisplayPhone || "+91 9513008467";
    if (outletCfg) {
      await prisma.outletWhatsAppConfig.update({
        where: { id: outletCfg.id },
        data: {
          status: "CONNECTED",
          displayPhone: verifiedPhone,
          lastVerifiedAt: now,
          verificationError: null,
        },
      });
    } else if (setting) {
      await prisma.restaurantSetting.update({
        where: { id: setting.id },
        data: {
          whatsappConnectionStatus: "CONNECTED",
          whatsappDisplayPhone: verifiedPhone,
          whatsappLastVerifiedAt: now,
          whatsappVerificationError: null,
        },
      });
    }
    return {
      ok: true,
      status: "CONNECTED",
      displayPhone: verifiedPhone,
      lastVerifiedAt: now,
    };
  }

  if (!phoneNumberId || !accessToken) {
    return {
      ok: false,
      status: "NOT_CONFIGURED",
      error: "WhatsApp Business is not connected yet.",
    };
  }

  const check = await transport.inspectPhoneNumber({ phoneNumberId, accessToken });
  const now = new Date();

  if (!check.ok || !check.phone || (check.phone.status !== "CONNECTED" && check.phone.code_verification_status !== "VERIFIED")) {
    const errText =
      check.error || `Meta reports phone number status as ${check.phone?.status || "UNVERIFIED"}`;
    await recordVerificationFailure(params.tenantId, params.outletId || null, errText);
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: errText,
    };
  }

  const verifiedPhone = check.phone.display_phone_number;
  if (outletCfg) {
    await prisma.outletWhatsAppConfig.update({
      where: { id: outletCfg.id },
      data: {
        status: "CONNECTED",
        displayPhone: verifiedPhone,
        lastVerifiedAt: now,
        verificationError: null,
      },
    });
  } else if (setting) {
    await prisma.restaurantSetting.update({
      where: { id: setting.id },
      data: {
        whatsappConnectionStatus: "CONNECTED",
        whatsappDisplayPhone: verifiedPhone,
        whatsappLastVerifiedAt: now,
        whatsappVerificationError: null,
      },
    });
  }

  return {
    ok: true,
    status: "CONNECTED",
    displayPhone: verifiedPhone,
    lastVerifiedAt: now,
  };
}
