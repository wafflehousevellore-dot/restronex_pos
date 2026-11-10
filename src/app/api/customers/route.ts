import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-invoice";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");

  if (phone) {
    const cleanPhone = phone.trim();
    const normPhone = normalizeWhatsAppPhone(cleanPhone);
    const [customer, consent] = await Promise.all([
      prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone: cleanPhone } },
        include: {
          loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 5 },
          consents: { where: { channel: "WHATSAPP" }, take: 1 },
        },
      }),
      prisma.customerConsent.findUnique({
        where: { tenantId_phone_channel: { tenantId, phone: normPhone, channel: "WHATSAPP" } },
      }),
    ]);

    if (!customer) return NextResponse.json(null);
    return NextResponse.json({
      ...customer,
      whatsappOptIn: consent ? consent.optIn : customer.consents?.[0]?.optIn ?? true,
      marketingOptIn: consent ? consent.marketingOptIn : customer.consents?.[0]?.marketingOptIn ?? false,
    });
  }

  const [customers, consents] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 2 },
      },
    }),
    prisma.customerConsent.findMany({
      where: { tenantId, channel: "WHATSAPP" },
    }),
  ]);

  const consentByPhone = new Map(consents.map((c) => [c.phone, c]));

  return NextResponse.json(
    customers.map((cu) => {
      const c = consentByPhone.get(normalizeWhatsAppPhone(cu.phone)) || consentByPhone.get(cu.phone);
      return {
        ...cu,
        whatsappOptIn: c ? c.optIn : true,
        marketingOptIn: c ? c.marketingOptIn : false,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, phone, email, whatsappOptIn, marketingOptIn } = body;

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const cleanPhone = phone.trim();
  const normPhone = normalizeWhatsAppPhone(cleanPhone);

  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: cleanPhone } },
    create: {
      tenantId,
      name: name?.trim() || "Guest Customer",
      phone: cleanPhone,
      email: email?.trim() || null,
      loyaltyPoints: 0,
    },
    update: {
      name: name?.trim() || undefined,
      email: email?.trim() || undefined,
    },
  });

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
        optInSource: "CUSTOMER_SETTINGS",
      },
      update: {
        customerId: customer.id,
        ...(typeof whatsappOptIn === "boolean" ? { optIn: whatsappOptIn } : {}),
        ...(typeof marketingOptIn === "boolean" ? { marketingOptIn } : {}),
        recordedAt: new Date(),
      },
    });
  }

  return NextResponse.json(customer);
}
