import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-invoice";
import {
  getCustomerMetaMap,
  saveCustomerMeta,
  getLoyaltyConfig,
  getOffersConfig,
  determineCustomerSegment,
  determineMembershipTier,
} from "@/lib/crm-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");
  const query = url.searchParams.get("q")?.toLowerCase().trim() || "";
  const segmentFilter = url.searchParams.get("segment") || "ALL";
  const outletId = url.searchParams.get("outletId") || "";
  const isExport = url.searchParams.get("export") === "csv";

  // If specific phone lookup (e.g. POS phone search)
  if (phone) {
    const cleanPhone = phone.trim();
    const normPhone = normalizeWhatsAppPhone(cleanPhone);
    const [customer, consent, metaMap, offersConfig] = await Promise.all([
      prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone: cleanPhone } },
        include: {
          loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 10 },
          consents: { where: { channel: "WHATSAPP" }, take: 1 },
        },
      }),
      prisma.customerConsent.findUnique({
        where: { tenantId_phone_channel: { tenantId, phone: normPhone, channel: "WHATSAPP" } },
      }),
      getCustomerMetaMap(tenantId),
      getOffersConfig(tenantId),
    ]);

    if (!customer) return NextResponse.json(null);

    const meta = metaMap[customer.id] || metaMap[customer.phone] || {};
    const segment = determineCustomerSegment({
      visitCount: customer.visitCount,
      totalSpentPaise: customer.totalSpentPaise,
      birthday: meta.birthday,
    });
    const tier = determineMembershipTier(customer.totalSpentPaise, offersConfig.membershipTiers);

    const payload = {
      ...customer,
      birthday: meta.birthday || null,
      anniversary: meta.anniversary || null,
      tags: meta.tags || [],
      notes: meta.notes || "",
      preferredOutletId: meta.preferredOutletId || null,
      segment,
      tier,
      whatsappOptIn: consent ? consent.optIn : customer.consents?.[0]?.optIn ?? true,
      marketingOptIn: consent ? consent.marketingOptIn : customer.consents?.[0]?.marketingOptIn ?? false,
    };

    return NextResponse.json({
      ...payload,
      customer: payload,
    });
  }

  // Full customer list query
  const [customers, consents, metaMap, offersConfig, latestOrders] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    }),
    prisma.customerConsent.findMany({
      where: { tenantId, channel: "WHATSAPP" },
    }),
    getCustomerMetaMap(tenantId),
    getOffersConfig(tenantId),
    prisma.order.findMany({
      where: { tenantId, isPaid: true },
      select: { customerPhone: true, customerId: true, createdAt: true, outletId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Index consents and last orders
  const consentByPhone = new Map(consents.map((c) => [c.phone, c]));
  const lastOrderByPhone = new Map<string, { lastOrderAt: Date; outletId: string }>();
  for (const o of latestOrders) {
    const key = o.customerPhone || o.customerId;
    if (key && !lastOrderByPhone.has(key)) {
      lastOrderByPhone.set(key, { lastOrderAt: o.createdAt, outletId: o.outletId });
    }
  }

  let enriched = customers.map((cu) => {
    const c = consentByPhone.get(normalizeWhatsAppPhone(cu.phone)) || consentByPhone.get(cu.phone);
    const meta = metaMap[cu.id] || metaMap[cu.phone] || {};
    const lastOrderInfo = lastOrderByPhone.get(cu.phone) || (cu.id ? lastOrderByPhone.get(cu.id) : null);

    const segment = determineCustomerSegment({
      visitCount: cu.visitCount,
      totalSpentPaise: cu.totalSpentPaise,
      lastOrderAt: lastOrderInfo?.lastOrderAt || null,
      birthday: meta.birthday,
    });
    const tier = determineMembershipTier(cu.totalSpentPaise, offersConfig.membershipTiers);

    return {
      id: cu.id,
      tenantId: cu.tenantId,
      name: cu.name,
      phone: cu.phone,
      email: cu.email,
      loyaltyPoints: cu.loyaltyPoints,
      totalSpentPaise: cu.totalSpentPaise,
      visitCount: cu.visitCount,
      createdAt: cu.createdAt,
      lastOrderAt: lastOrderInfo?.lastOrderAt || null,
      preferredOutletId: meta.preferredOutletId || lastOrderInfo?.outletId || null,
      birthday: meta.birthday || null,
      anniversary: meta.anniversary || null,
      tags: meta.tags || [],
      notes: meta.notes || "",
      segment,
      tier,
      whatsappOptIn: c ? c.optIn : true,
      marketingOptIn: c ? c.marketingOptIn : false,
      loyaltyTxns: cu.loyaltyTxns || [],
    };
  });

  // Filter by search query
  if (query) {
    enriched = enriched.filter((c) => {
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        c.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  }

  // Filter by segment
  if (segmentFilter !== "ALL") {
    enriched = enriched.filter((c) => c.segment === segmentFilter);
  }

  // Filter by outlet
  if (outletId) {
    enriched = enriched.filter((c) => c.preferredOutletId === outletId);
  }

  // Handle CSV export request
  if (isExport) {
    const csvHeaders = [
      "ID",
      "Customer Name",
      "Phone",
      "Email",
      "Segment",
      "Tier",
      "Visits",
      "Total Spent (Rs)",
      "Loyalty Balance",
      "WhatsApp E-Bills",
      "Marketing Opt-In",
      "Birthday",
      "Tags",
      "Created At",
    ];

    const csvRows = enriched.map((c) => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${c.segment}"`,
      `"${c.tier.name}"`,
      c.visitCount,
      (c.totalSpentPaise / 100).toFixed(2),
      c.loyaltyPoints,
      c.whatsappOptIn ? "YES" : "NO",
      c.marketingOptIn ? "YES" : "NO",
      `"${c.birthday || ""}"`,
      `"${c.tags.join("; ")}"`,
      `"${new Date(c.createdAt).toISOString()}"`,
    ]);

    const csvString = [csvHeaders.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="restronex_customers_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // High-level aggregates
  const totalCustomers = customers.length;
  const activeLoyaltyMembers = customers.filter((c) => c.loyaltyPoints > 0).length;
  const totalPointsInCirculation = customers.reduce((sum, c) => sum + Math.max(0, c.loyaltyPoints), 0);
  const totalRevenuePaise = customers.reduce((sum, c) => sum + (c.totalSpentPaise || 0), 0);
  const totalVisits = customers.reduce((sum, c) => sum + (c.visitCount || 0), 0);
  const averageOrderValuePaise = totalVisits > 0 ? Math.round(totalRevenuePaise / totalVisits) : 0;
  const repeatCustomersCount = customers.filter((c) => c.visitCount > 1).length;
  const repeatCustomerRate = totalCustomers > 0 ? Math.round((repeatCustomersCount / totalCustomers) * 100) : 0;
  const marketingOptInCount = enriched.filter((c) => c.marketingOptIn).length;
  const marketingOptInRate = totalCustomers > 0 ? Math.round((marketingOptInCount / totalCustomers) * 100) : 0;

  return NextResponse.json({
    customers: enriched,
    metrics: {
      totalCustomers,
      activeLoyaltyMembers,
      totalPointsInCirculation,
      totalRevenuePaise,
      averageOrderValuePaise,
      repeatCustomerRate,
      marketingOptInRate,
      repeatCustomersCount,
      marketingOptInCount,
    },
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
  const {
    name,
    phone,
    email,
    birthday,
    anniversary,
    tags,
    notes,
    preferredOutletId,
    whatsappOptIn,
    marketingOptIn,
    welcomeBonus,
  } = body;

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const cleanPhone = phone.trim();
  const normPhone = normalizeWhatsAppPhone(cleanPhone);

  const existingCustomer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone: cleanPhone } },
  });

  const loyaltyConfig = await getLoyaltyConfig(tenantId);
  const isNew = !existingCustomer;
  const initialPoints = isNew && welcomeBonus && loyaltyConfig.enabled ? loyaltyConfig.welcomeBonusPoints : 0;

  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: cleanPhone } },
    create: {
      tenantId,
      name: name?.trim() || "Guest Customer",
      phone: cleanPhone,
      email: email?.trim() || null,
      loyaltyPoints: initialPoints,
      visitCount: 0,
      totalSpentPaise: 0,
    },
    update: {
      name: name?.trim() || undefined,
      email: email?.trim() || undefined,
    },
  });

  // If welcome bonus given to new customer, log loyalty transaction
  if (initialPoints > 0) {
    await prisma.loyaltyTxn.create({
      data: {
        customerId: customer.id,
        points: initialPoints,
        type: "BONUS",
        reference: "Welcome Bonus Enrollment Points",
      },
    });
  }

  // Save CRM metadata
  await saveCustomerMeta(tenantId, customer.id, {
    birthday: birthday || undefined,
    anniversary: anniversary || undefined,
    tags: Array.isArray(tags) ? tags : undefined,
    notes: notes || undefined,
    preferredOutletId: preferredOutletId || undefined,
  });

  // Update Consents
  if (typeof whatsappOptIn === "boolean" || typeof marketingOptIn === "boolean") {
    await prisma.customerConsent.upsert({
      where: { tenantId_phone_channel: { tenantId, phone: normPhone, channel: "WHATSAPP" } },
      create: {
        tenantId,
        customerId: customer.id,
        phone: normPhone,
        channel: "WHATSAPP",
        optIn: typeof whatsappOptIn === "boolean" ? whatsappOptIn : true,
        marketingOptIn: typeof marketingOptIn === "boolean" ? marketingOptIn : false,
        optInSource: "CRM_ADMIN",
      },
      update: {
        customerId: customer.id,
        ...(typeof whatsappOptIn === "boolean" ? { optIn: whatsappOptIn } : {}),
        ...(typeof marketingOptIn === "boolean" ? { marketingOptIn } : {}),
        recordedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ success: true, customer });
}
