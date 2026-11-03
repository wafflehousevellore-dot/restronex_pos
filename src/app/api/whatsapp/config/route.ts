import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const setting = await prisma.restaurantSetting.findUnique({ where: { tenantId } });
  const config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: "whatsapp_cloud" } },
  });

  const parsedConfig = config?.configJson ? JSON.parse(config.configJson) : {};

  return NextResponse.json({
    enabled: setting?.autoSendWhatsAppInvoice || false,
    phoneNumberId: setting?.whatsappPhoneNumberId || parsedConfig.phoneNumberId || "",
    hasAccessToken: !!(setting?.whatsappAccessToken || parsedConfig.accessToken),
    wabaId: parsedConfig.wabaId || "",
    templateName: parsedConfig.templateName || "order_invoice_utility",
    status: config?.status || "CONFIGURED",
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem || mem.role !== "OWNER") return NextResponse.json({ error: "Only owners can configure WhatsApp" }, { status: 403 });

  const { enabled, phoneNumberId, accessToken, wabaId, templateName } = body;

  await prisma.restaurantSetting.upsert({
    where: { tenantId },
    create: {
      tenantId,
      autoSendWhatsAppInvoice: !!enabled,
      whatsappPhoneNumberId: phoneNumberId?.trim() || null,
      whatsappAccessToken: accessToken?.trim() || null,
    },
    update: {
      autoSendWhatsAppInvoice: !!enabled,
      ...(phoneNumberId !== undefined ? { whatsappPhoneNumberId: phoneNumberId.trim() || null } : {}),
      ...(accessToken ? { whatsappAccessToken: accessToken.trim() } : {}),
    },
  });

  const configJson = JSON.stringify({
    phoneNumberId: phoneNumberId?.trim(),
    wabaId: wabaId?.trim(),
    templateName: templateName?.trim() || "order_invoice_utility",
    hasAccessToken: !!accessToken,
  });

  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider: "whatsapp_cloud" } },
    create: {
      tenantId,
      provider: "whatsapp_cloud",
      status: accessToken ? "CONNECTED" : "CONFIGURED",
      configJson,
      lastSyncAt: new Date(),
    },
    update: {
      status: accessToken ? "CONNECTED" : "CONFIGURED",
      configJson,
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, message: "WhatsApp Cloud API credentials saved successfully." });
}
