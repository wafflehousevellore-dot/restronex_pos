import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");

  if (phone) {
    const cleanPhone = phone.trim();
    const customer = await prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: cleanPhone } },
      include: {
        loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    return NextResponse.json(customer || null);
  }

  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 2 },
    },
  });

  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { name, phone, email } = body;

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const cleanPhone = phone.trim();

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

  return NextResponse.json(customer);
}
