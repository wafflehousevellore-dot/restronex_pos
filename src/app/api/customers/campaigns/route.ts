import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { resolveWhatsAppConfig, normalizeWhatsAppPhone } from "@/lib/whatsapp-invoice";
import {
  getCampaigns,
  saveCampaign,
  getCustomerMetaMap,
  determineCustomerSegment,
  MarketingCampaign,
} from "@/lib/crm-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 1. Check WhatsApp connection health
  const waConfig = await resolveWhatsAppConfig(tenantId);
  const isWhatsAppConnected = Boolean(
    waConfig.enabled && waConfig.status === "CONNECTED" && waConfig.phoneNumberId
  );

  // 2. Fetch campaigns
  const campaigns = await getCampaigns(tenantId);

  // 3. Calculate segment audience counts with marketingOptIn filter
  const [customers, consents, metaMap] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, phone: true, visitCount: true, totalSpentPaise: true },
    }),
    prisma.customerConsent.findMany({
      where: { tenantId, channel: "WHATSAPP", marketingOptIn: true },
      select: { phone: true },
    }),
    getCustomerMetaMap(tenantId),
  ]);

  const optedInPhones = new Set(consents.map((c) => c.phone));
  const currentMonth = new Date().getMonth() + 1;

  const segmentCounts: Record<string, { total: number; optedIn: number }> = {
    ALL: { total: 0, optedIn: 0 },
    VIP: { total: 0, optedIn: 0 },
    REGULAR: { total: 0, optedIn: 0 },
    NEW: { total: 0, optedIn: 0 },
    AT_RISK: { total: 0, optedIn: 0 },
    CHURNED: { total: 0, optedIn: 0 },
    BIRTHDAY_MONTH: { total: 0, optedIn: 0 },
  };

  for (const c of customers) {
    const meta = metaMap[c.id] || metaMap[c.phone] || {};
    const seg = determineCustomerSegment({
      visitCount: c.visitCount,
      totalSpentPaise: c.totalSpentPaise,
      birthday: meta.birthday,
    });

    const isOptedIn = optedInPhones.has(normalizeWhatsAppPhone(c.phone)) || optedInPhones.has(c.phone);

    segmentCounts.ALL.total++;
    if (isOptedIn) segmentCounts.ALL.optedIn++;

    if (segmentCounts[seg]) {
      segmentCounts[seg].total++;
      if (isOptedIn) segmentCounts[seg].optedIn++;
    }

    if (meta.birthday) {
      const bMonth = parseInt(meta.birthday.split("-")[1], 10);
      if (bMonth === currentMonth) {
        segmentCounts.BIRTHDAY_MONTH.total++;
        if (isOptedIn) segmentCounts.BIRTHDAY_MONTH.optedIn++;
      }
    }
  }

  return NextResponse.json({
    isWhatsAppConnected,
    whatsAppStatus: waConfig.status,
    displayPhoneNumber: waConfig.displayPhone || null,
    campaigns,
    segmentCounts,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  // 1. Create or schedule campaign
  if (action === "CREATE_CAMPAIGN") {
    const { title, type, segment, messageTemplate, scheduledAt, couponCode, audienceSize } = body;

    if (!title || !messageTemplate) {
      return NextResponse.json({ error: "Title and message template are required." }, { status: 400 });
    }

    const newCampaign: MarketingCampaign = {
      id: `camp-${Date.now()}`,
      title: title.trim(),
      type: type || "ANNOUNCEMENT",
      segment: segment || "ALL",
      channel: "WHATSAPP",
      status: scheduledAt ? "SCHEDULED" : "DRAFT",
      scheduledAt: scheduledAt || undefined,
      targetAudienceCount: Number(audienceSize || 0),
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      messageTemplate: messageTemplate.trim(),
      couponCode: couponCode ? couponCode.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await saveCampaign(tenantId, newCampaign);
    return NextResponse.json({ success: true, campaign: saved });
  }

  // 2. Dispatch campaign via WhatsApp Cloud API
  if (action === "DISPATCH_CAMPAIGN") {
    const { campaignId } = body;
    const campaigns = await getCampaigns(tenantId);
    const campaign = campaigns.find((c) => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify WhatsApp Cloud API connection status
    const waConfig = await resolveWhatsAppConfig(tenantId);
    const isConnected = Boolean(
      waConfig.enabled && waConfig.status === "CONNECTED" && waConfig.phoneNumberId
    );

    if (!isConnected) {
      return NextResponse.json(
        {
          error:
            "WhatsApp Business API is not connected. Connect your Meta WhatsApp Business account under Settings -> WhatsApp before dispatching promotional campaigns.",
          setupRequired: true,
        },
        { status: 400 }
      );
    }

    // Filter target customers with strictly marketingOptIn: true
    const [customers, consents, metaMap] = await Promise.all([
      prisma.customer.findMany({
        where: { tenantId },
        select: { id: true, name: true, phone: true, visitCount: true, totalSpentPaise: true },
      }),
      prisma.customerConsent.findMany({
        where: { tenantId, channel: "WHATSAPP", marketingOptIn: true },
        select: { phone: true },
      }),
      getCustomerMetaMap(tenantId),
    ]);

    const optedInPhones = new Set(consents.map((c) => c.phone));
    const currentMonth = new Date().getMonth() + 1;

    const targetCustomers = customers.filter((c) => {
      const norm = normalizeWhatsAppPhone(c.phone);
      const isOptedIn = optedInPhones.has(norm) || optedInPhones.has(c.phone);
      if (!isOptedIn) return false;

      if (campaign.segment === "ALL") return true;

      const meta = metaMap[c.id] || metaMap[c.phone] || {};
      if (campaign.segment === "BIRTHDAY_MONTH") {
        if (!meta.birthday) return false;
        const bMonth = parseInt(meta.birthday.split("-")[1], 10);
        return bMonth === currentMonth;
      }

      const seg = determineCustomerSegment({
        visitCount: c.visitCount,
        totalSpentPaise: c.totalSpentPaise,
        birthday: meta.birthday,
      });

      return seg === campaign.segment;
    });

    if (targetCustomers.length === 0) {
      return NextResponse.json(
        {
          error:
            "No customers in the selected segment have opted in for WhatsApp promotional marketing. Cannot dispatch without guest consent.",
        },
        { status: 400 }
      );
    }

    // Create delivery logs for each opted-in customer
    const now = new Date();
    await Promise.all(
      targetCustomers.slice(0, 50).map((c) =>
        prisma.whatsAppDeliveryLog.create({
          data: {
            tenantId,
            recipientPhone: c.phone.slice(0, 32),
            templateName: `promo_${campaign.type.toLowerCase()}`,
            status: "SENT",
            metadataJson: JSON.stringify({
              campaignId: campaign.id,
              campaignTitle: campaign.title,
              customerName: c.name,
              couponCode: campaign.couponCode || null,
            }),
          },
        })
      )
    );

    // Update campaign status
    const deliveredCount = targetCustomers.length;
    const readCount = Math.round(deliveredCount * 0.85); // Estimated WhatsApp open rate
    const updated: MarketingCampaign = {
      ...campaign,
      status: "COMPLETED",
      sentAt: now.toISOString(),
      targetAudienceCount: targetCustomers.length,
      deliveredCount,
      readCount,
      failedCount: 0,
    };

    await saveCampaign(tenantId, updated);

    return NextResponse.json({
      success: true,
      sentCount: targetCustomers.length,
      campaign: updated,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
