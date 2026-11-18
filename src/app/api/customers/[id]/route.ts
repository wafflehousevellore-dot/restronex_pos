import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-invoice";
import {
  getCustomerMetaMap,
  saveCustomerMeta,
  getOffersConfig,
  determineCustomerSegment,
  determineMembershipTier,
} from "@/lib/crm-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const { id } = await params;

  const [customer, metaMap, offersConfig] = await Promise.all([
    prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 50 },
        consents: { where: { channel: "WHATSAPP" }, take: 1 },
      },
    }),
    getCustomerMetaMap(tenantId),
    getOffersConfig(tenantId),
  ]);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Fetch full order & invoice history
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      OR: [{ customerId: customer.id }, { customerPhone: customer.phone }],
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      orderNumber: true,
      type: true,
      status: true,
      totalPaise: true,
      subtotalPaise: true,
      discountPaise: true,
      taxPaise: true,
      isPaid: true,
      paidAt: true,
      createdAt: true,
      channel: true,
      outlet: { select: { id: true, name: true } },
    },
  });

  const meta = metaMap[customer.id] || metaMap[customer.phone] || {};
  const segment = determineCustomerSegment({
    visitCount: customer.visitCount,
    totalSpentPaise: customer.totalSpentPaise,
    lastOrderAt: orders[0]?.createdAt || null,
    birthday: meta.birthday,
  });
  const tier = determineMembershipTier(customer.totalSpentPaise, offersConfig.membershipTiers);

  return NextResponse.json({
    customer: {
      ...customer,
      birthday: meta.birthday || null,
      anniversary: meta.anniversary || null,
      tags: meta.tags || [],
      notes: meta.notes || "",
      preferredOutletId: meta.preferredOutletId || orders[0]?.outlet?.id || null,
      segment,
      tier,
      whatsappOptIn: customer.consents?.[0]?.optIn ?? true,
      marketingOptIn: customer.consents?.[0]?.marketingOptIn ?? false,
    },
    orders,
    loyaltyTxns: customer.loyaltyTxns,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const {
    name,
    email,
    birthday,
    anniversary,
    tags,
    notes,
    preferredOutletId,
    whatsappOptIn,
    marketingOptIn,
  } = body;

  const updatedCustomer = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      name: name?.trim() || customer.name,
      email: email !== undefined ? (email ? email.trim() : null) : customer.email,
    },
  });

  // Save CRM metadata
  await saveCustomerMeta(tenantId, customer.id, {
    birthday: birthday !== undefined ? birthday : undefined,
    anniversary: anniversary !== undefined ? anniversary : undefined,
    tags: Array.isArray(tags) ? tags : undefined,
    notes: notes !== undefined ? notes : undefined,
    preferredOutletId: preferredOutletId !== undefined ? preferredOutletId : undefined,
  });

  // Update Consents if provided
  if (typeof whatsappOptIn === "boolean" || typeof marketingOptIn === "boolean") {
    const normPhone = normalizeWhatsAppPhone(customer.phone);
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

  return NextResponse.json({ success: true, customer: updatedCustomer });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  await prisma.customer.delete({
    where: { id: customer.id },
  });

  return NextResponse.json({ success: true });
}
