import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import {
  getMetaAppCapabilityStatus,
  verifyConnectedWhatsAppNumber,
} from "@/lib/meta-whatsapp-onboarding";
import { resolveWhatsAppConfig } from "@/lib/whatsapp-invoice";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId") || null;
  const metaCap = getMetaAppCapabilityStatus();

  const [setting, outletConfigs, effective, lastSuccessLog, logs] = await Promise.all([
    prisma.restaurantSetting.findUnique({ where: { tenantId } }),
    prisma.outletWhatsAppConfig.findMany({
      where: { tenantId },
      include: { outlet: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    resolveWhatsAppConfig(tenantId, outletId),
    prisma.whatsAppDeliveryLog.findFirst({
      where: { tenantId, status: { in: ["SENT", "DELIVERED", "READ"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, recipientPhone: true, status: true },
    }),
    prisma.whatsAppDeliveryLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { order: { select: { orderNumber: true } } },
    }),
  ]);

  const rawStatus = effective.status || "NOT_CONFIGURED";
  const uiStatus =
    !metaCap.configured && rawStatus !== "CONNECTED" && rawStatus !== "DISCONNECTED"
      ? "SETUP_REQUIRED"
      : rawStatus;

  const availableSenders = [
    ...(setting?.whatsappDisplayPhone && setting?.whatsappConnectionStatus === "CONNECTED"
      ? [
          {
            scope: "TENANT",
            outletId: null,
            label: `Organization Main (${setting.whatsappDisplayPhone})`,
            displayPhone: setting.whatsappDisplayPhone,
            status: setting.whatsappConnectionStatus,
            isDefaultSender: !setting.defaultWhatsAppOutletId,
            isCoexistence: Boolean(setting.whatsappCoexistence),
            connectedAt: setting.whatsappConnectedAt,
            lastVerifiedAt: setting.whatsappLastVerifiedAt,
          },
        ]
      : []),
    ...outletConfigs.map((oc) => ({
      scope: "OUTLET",
      outletId: oc.outletId,
      label: `${oc.outlet.name}${oc.displayPhone ? ` (${oc.displayPhone})` : ""}`,
      displayPhone: oc.displayPhone || "",
      status: oc.status,
      isDefaultSender:
        setting?.defaultWhatsAppOutletId === oc.outletId || Boolean(oc.isDefaultSender),
      isCoexistence: Boolean(oc.isCoexistence),
      connectedAt: oc.connectedAt,
      lastVerifiedAt: oc.lastVerifiedAt,
    })),
  ];

  // Zero sensitive credentials (no PhoneNumberId, WABA ID, access token, verify token, or template names)
  return NextResponse.json({
    metaPartnerConfigured: metaCap.configured,
    metaAppId: metaCap.metaAppId,
    embeddedSignupConfigId: metaCap.configId,
    missingMetaPrerequisites: metaCap.missingPrerequisites,
    source: effective.source,
    status: uiStatus,
    displayPhone: effective.displayPhone || null,
    connectionMode: effective.connectionMode || "EMBEDDED_SIGNUP",
    isCoexistence: effective.isCoexistence,
    connectedAt: effective.connectedAt,
    lastVerifiedAt: effective.lastVerifiedAt,
    verificationError: setting?.whatsappVerificationError || null,
    whatsappOnboardingSkipped: setting?.whatsappOnboardingSkipped ?? false,
    deliverySettings: {
      enabled: effective.enabled,
      sendPdfTaxInvoice: setting?.whatsappSendPdfTaxInvoice ?? true,
      sendPaymentConfirmation: setting?.whatsappSendPaymentConfirm ?? true,
      sendOrderConfirmation: setting?.whatsappSendOrderConfirm ?? false,
      defaultWhatsAppOutletId: setting?.defaultWhatsAppOutletId || null,
    },
    availableSenders,
    lastSuccessfulDelivery: lastSuccessLog
      ? {
          id: lastSuccessLog.id,
          at: lastSuccessLog.createdAt,
          status: lastSuccessLog.status,
        }
      : null,
    recentLogs: logs.map((l) => ({
      id: l.id,
      orderId: l.orderId,
      orderNumber: l.order?.orderNumber || "TEST",
      recipientPhone: l.recipientPhone,
      status: l.status,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem || !["OWNER", "HEAD_OFFICE"].includes(mem.role)) {
    return NextResponse.json(
      { error: "Only owners can manage WhatsApp Business integration." },
      { status: 403 }
    );
  }

  const action = String(body?.action || "");
  const outletId = body?.outletId ? String(body.outletId) : null;

  if (outletId) {
    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, tenantId } });
    if (!outlet) {
      return NextResponse.json({ error: "Outlet does not belong to active tenant" }, { status: 403 });
    }
  }

  // Strictly block manual API credential/token injection from UI
  if (action === "SAVE" || body.accessToken || body.phoneNumberId || body.wabaId) {
    return NextResponse.json(
      {
        error:
          "Manual Meta API credentials cannot be entered manually. Connect securely using Meta Embedded Signup OTP verification.",
      },
      { status: 400 }
    );
  }

  if (action === "VERIFY_CONNECTION") {
    const res = await verifyConnectedWhatsAppNumber({ tenantId, outletId });
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  }

  if (action === "DISCONNECT") {
    if (outletId) {
      await prisma.outletWhatsAppConfig.updateMany({
        where: { tenantId, outletId },
        data: {
          enabled: false,
          isDefaultSender: false,
          accessTokenEnc: null,
          phoneNumberId: null,
          status: "DISCONNECTED",
          verificationError: null,
        },
      });
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
          whatsappCoexistence: false,
          whatsappConnectionStatus: "DISCONNECTED",
          whatsappVerificationError: null,
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

    return NextResponse.json({
      ok: true,
      status: "DISCONNECTED",
      message: "WhatsApp Business disconnected cleanly. All historical invoices, sales, and customer data remain preserved.",
    });
  }

  if (action === "UPDATE_DELIVERY_SETTINGS") {
    const {
      enabled,
      sendPdfTaxInvoice,
      sendPaymentConfirmation,
      sendOrderConfirmation,
      defaultWhatsAppOutletId,
    } = body;

    if (outletId) {
      await prisma.outletWhatsAppConfig.updateMany({
        where: { tenantId, outletId },
        data: {
          ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
        },
      });
    }

    await prisma.restaurantSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        autoSendWhatsAppInvoice: enabled ?? false,
        whatsappSendPdfTaxInvoice: sendPdfTaxInvoice ?? true,
        whatsappSendPaymentConfirm: sendPaymentConfirmation ?? true,
        whatsappSendOrderConfirm: sendOrderConfirmation ?? false,
        defaultWhatsAppOutletId: defaultWhatsAppOutletId || null,
      },
      update: {
        ...(enabled !== undefined && !outletId ? { autoSendWhatsAppInvoice: Boolean(enabled) } : {}),
        ...(sendPdfTaxInvoice !== undefined ? { whatsappSendPdfTaxInvoice: Boolean(sendPdfTaxInvoice) } : {}),
        ...(sendPaymentConfirmation !== undefined
          ? { whatsappSendPaymentConfirm: Boolean(sendPaymentConfirmation) }
          : {}),
        ...(sendOrderConfirmation !== undefined ? { whatsappSendOrderConfirm: Boolean(sendOrderConfirmation) } : {}),
        ...(defaultWhatsAppOutletId !== undefined
          ? { defaultWhatsAppOutletId: defaultWhatsAppOutletId || null }
          : {}),
      },
    });

    if (defaultWhatsAppOutletId !== undefined) {
      await prisma.outletWhatsAppConfig.updateMany({
        where: { tenantId },
        data: { isDefaultSender: false },
      });
      if (defaultWhatsAppOutletId) {
        await prisma.outletWhatsAppConfig.updateMany({
          where: { tenantId, outletId: defaultWhatsAppOutletId },
          data: { isDefaultSender: true },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "WhatsApp automatic delivery preferences updated.",
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
