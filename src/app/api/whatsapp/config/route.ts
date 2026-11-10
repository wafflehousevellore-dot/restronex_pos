import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { maskCredential } from "@/lib/encryption";
import {
  decryptAccessToken,
  encryptAccessToken,
  resolveWhatsAppConfig,
} from "@/lib/whatsapp-invoice";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId") || null;

  const [setting, outletConfigs, effective] = await Promise.all([
    prisma.restaurantSetting.findUnique({ where: { tenantId } }),
    prisma.outletWhatsAppConfig.findMany({
      where: { tenantId },
      include: { outlet: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    resolveWhatsAppConfig(tenantId, outletId),
  ]);

  const tenantToken = decryptAccessToken(setting?.whatsappAccessToken);

  return NextResponse.json({
    // Effective active configuration for selected outlet (or tenant default)
    source: effective.source,
    enabled: effective.enabled,
    phoneNumberId: effective.phoneNumberId || "",
    wabaId: effective.wabaId || "",
    displayPhone: effective.displayPhone || "",
    templateName: effective.templateName || "order_invoice_utility",
    connectionMode: effective.connectionMode || "META_CLOUD_API",
    status: effective.status || "NOT_CONFIGURED",
    hasAccessToken: Boolean(effective.accessToken),
    maskedToken: maskCredential(effective.accessToken),
    qrFooterEnabled: setting?.qrFooterEnabled ?? true,
    whatsappOnboardingSkipped: setting?.whatsappOnboardingSkipped ?? false,
    printerOnboardingSkipped: setting?.printerOnboardingSkipped ?? false,
    autoPrintBill: setting?.autoPrintBill ?? true,
    tenantConfig: {
      enabled: setting?.autoSendWhatsAppInvoice ?? false,
      phoneNumberId: setting?.whatsappPhoneNumberId || "",
      wabaId: setting?.whatsappWabaId || "",
      displayPhone: setting?.whatsappDisplayPhone || "",
      templateName: setting?.whatsappTemplateName || "order_invoice_utility",
      hasAccessToken: Boolean(tenantToken),
      maskedToken: maskCredential(tenantToken),
      status:
        setting?.whatsappPhoneNumberId && tenantToken
          ? setting?.whatsappConnectionStatus || "CONNECTED"
          : "NOT_CONFIGURED",
    },
    outletConfigs: outletConfigs.map((oc) => ({
      id: oc.id,
      outletId: oc.outletId,
      outletName: oc.outlet.name,
      enabled: oc.enabled,
      phoneNumberId: oc.phoneNumberId || "",
      wabaId: oc.wabaId || "",
      displayPhone: oc.displayPhone || "",
      templateName: oc.templateName || "order_invoice_utility",
      hasAccessToken: Boolean(oc.accessTokenEnc),
      maskedToken: maskCredential(decryptAccessToken(oc.accessTokenEnc)),
      status: oc.status,
      lastVerifiedAt: oc.lastVerifiedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem || !["OWNER", "HEAD_OFFICE"].includes(mem.role)) {
    return NextResponse.json({ error: "Only owners can configure WhatsApp Business" }, { status: 403 });
  }

  const {
    action = "SAVE",
    outletId,
    enabled,
    phoneNumberId,
    accessToken,
    wabaId,
    displayPhone,
    templateName,
    connectionMode = "META_CLOUD_API",
    embeddedCode,
  } = body as {
    action?: "SAVE" | "DISCONNECT";
    outletId?: string;
    enabled?: boolean;
    phoneNumberId?: string;
    accessToken?: string;
    wabaId?: string;
    displayPhone?: string;
    templateName?: string;
    connectionMode?: string;
    embeddedCode?: string;
  };

  // Verify outlet belongs strictly to this tenant if outletId is passed
  if (outletId) {
    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, tenantId } });
    if (!outlet) {
      return NextResponse.json({ error: "Outlet does not belong to active tenant" }, { status: 403 });
    }
  }

  // Handle explicit disconnect action
  if (action === "DISCONNECT") {
    if (outletId) {
      await prisma.outletWhatsAppConfig.deleteMany({ where: { tenantId, outletId } });
    } else {
      await prisma.restaurantSetting.upsert({
        where: { tenantId },
        create: {
          tenantId,
          autoSendWhatsAppInvoice: false,
          whatsappConnectionStatus: "DISCONNECTED",
        },
        update: {
          autoSendWhatsAppInvoice: false,
          whatsappAccessToken: null,
          whatsappPhoneNumberId: null,
          whatsappWabaId: null,
          whatsappDisplayPhone: null,
          whatsappConnectionStatus: "DISCONNECTED",
        },
      });
      await prisma.integrationConfig.upsert({
        where: { tenantId_provider: { tenantId, provider: "whatsapp_cloud" } },
        create: { tenantId, provider: "whatsapp_cloud", status: "DISCONNECTED", configJson: "{}" },
        update: { status: "DISCONNECTED", lastSyncAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "WHATSAPP_DISCONNECTED",
        entity: outletId ? "OutletWhatsAppConfig" : "RestaurantSetting",
        entityId: outletId || tenantId,
      },
    });

    return NextResponse.json({ ok: true, status: "DISCONNECTED", message: "WhatsApp Business disconnected." });
  }

  // Optional Meta Embedded Signup OAuth code exchange server-side
  let exchangedToken: string | null = null;
  if (embeddedCode && process.env.NEXT_PUBLIC_META_APP_ID && process.env.META_APP_SECRET) {
    try {
      const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
      tokenUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_META_APP_ID);
      tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET);
      tokenUrl.searchParams.set("code", embeddedCode);
      const exRes = await fetch(tokenUrl.toString());
      const exJson = await exRes.json();
      if (exRes.ok && exJson.access_token) {
        exchangedToken = exJson.access_token;
      }
    } catch {}
  }

  const plainToken = (exchangedToken || accessToken || "").trim();
  const encryptedToken = plainToken ? encryptAccessToken(plainToken) : undefined;

  if (outletId) {
    const existingOutletCfg = await prisma.outletWhatsAppConfig.findFirst({
      where: { tenantId, outletId },
    });
    const finalPhoneId = phoneNumberId !== undefined ? phoneNumberId.trim() || null : existingOutletCfg?.phoneNumberId || null;
    const finalHasToken = Boolean(encryptedToken || existingOutletCfg?.accessTokenEnc);
    const nextStatus = finalPhoneId && finalHasToken ? "CONNECTED" : "NOT_CONFIGURED";

    await prisma.outletWhatsAppConfig.upsert({
      where: { outletId },
      create: {
        tenantId,
        outletId,
        enabled: enabled ?? true,
        phoneNumberId: finalPhoneId,
        wabaId: wabaId?.trim() || null,
        displayPhone: displayPhone?.trim() || null,
        accessTokenEnc: encryptedToken || null,
        templateName: templateName?.trim() || "order_invoice_utility",
        connectionMode,
        status: nextStatus,
        lastVerifiedAt: nextStatus === "CONNECTED" ? new Date() : null,
      },
      update: {
        ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
        ...(phoneNumberId !== undefined ? { phoneNumberId: phoneNumberId.trim() || null } : {}),
        ...(wabaId !== undefined ? { wabaId: wabaId.trim() || null } : {}),
        ...(displayPhone !== undefined ? { displayPhone: displayPhone.trim() || null } : {}),
        ...(encryptedToken ? { accessTokenEnc: encryptedToken } : {}),
        ...(templateName !== undefined ? { templateName: templateName.trim() || "order_invoice_utility" } : {}),
        connectionMode,
        status: nextStatus,
        lastVerifiedAt: nextStatus === "CONNECTED" ? new Date() : existingOutletCfg?.lastVerifiedAt,
      },
    });
  } else {
    const existingSetting = await prisma.restaurantSetting.findUnique({ where: { tenantId } });
    const finalPhoneId =
      phoneNumberId !== undefined ? phoneNumberId.trim() || null : existingSetting?.whatsappPhoneNumberId || null;
    const finalHasToken = Boolean(encryptedToken || existingSetting?.whatsappAccessToken);
    const nextStatus = finalPhoneId && finalHasToken ? "CONNECTED" : "NOT_CONFIGURED";

    await prisma.restaurantSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        autoSendWhatsAppInvoice: enabled ?? Boolean(finalPhoneId && finalHasToken),
        whatsappPhoneNumberId: finalPhoneId,
        whatsappAccessToken: encryptedToken || null,
        whatsappWabaId: wabaId?.trim() || null,
        whatsappDisplayPhone: displayPhone?.trim() || null,
        whatsappTemplateName: templateName?.trim() || "order_invoice_utility",
        whatsappConnectionMode: connectionMode,
        whatsappConnectionStatus: nextStatus,
        whatsappOnboardingSkipped: false,
      },
      update: {
        ...(enabled !== undefined ? { autoSendWhatsAppInvoice: Boolean(enabled) } : {}),
        ...(phoneNumberId !== undefined ? { whatsappPhoneNumberId: phoneNumberId.trim() || null } : {}),
        ...(encryptedToken ? { whatsappAccessToken: encryptedToken } : {}),
        ...(wabaId !== undefined ? { whatsappWabaId: wabaId.trim() || null } : {}),
        ...(displayPhone !== undefined ? { whatsappDisplayPhone: displayPhone.trim() || null } : {}),
        ...(templateName !== undefined ? { whatsappTemplateName: templateName.trim() || "order_invoice_utility" } : {}),
        whatsappConnectionMode: connectionMode,
        whatsappConnectionStatus: nextStatus,
        whatsappOnboardingSkipped: false,
      },
    });

    await prisma.integrationConfig.upsert({
      where: { tenantId_provider: { tenantId, provider: "whatsapp_cloud" } },
      create: {
        tenantId,
        provider: "whatsapp_cloud",
        status: nextStatus,
        configJson: JSON.stringify({
          phoneNumberId: finalPhoneId,
          wabaId: wabaId?.trim() || existingSetting?.whatsappWabaId || null,
          displayPhone: displayPhone?.trim() || existingSetting?.whatsappDisplayPhone || null,
          templateName: templateName?.trim() || "order_invoice_utility",
          connectionMode,
          tokenEncrypted: true,
        }),
        lastSyncAt: new Date(),
      },
      update: {
        status: nextStatus,
        configJson: JSON.stringify({
          phoneNumberId: finalPhoneId,
          wabaId: wabaId?.trim() || existingSetting?.whatsappWabaId || null,
          displayPhone: displayPhone?.trim() || existingSetting?.whatsappDisplayPhone || null,
          templateName: templateName?.trim() || "order_invoice_utility",
          connectionMode,
          tokenEncrypted: true,
        }),
        lastSyncAt: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "WHATSAPP_CONFIG_SAVED",
      entity: outletId ? "OutletWhatsAppConfig" : "RestaurantSetting",
      entityId: outletId || tenantId,
      metadataJson: JSON.stringify({
        outletId: outletId || null,
        connectionMode,
        hasTokenUpdated: Boolean(encryptedToken),
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    message: "WhatsApp Business Cloud API credentials saved securely.",
  });
}
