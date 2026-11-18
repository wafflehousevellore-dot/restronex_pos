import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const list = await prisma.supplier.findMany({
    where: { tenantId },
    include: {
      purchaseOrders: {
        select: { id: true, status: true, totalPaise: true, poNumber: true, createdAt: true },
      },
      supplierPrices: {
        include: {
          inventoryItem: { select: { id: true, name: true, unit: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
  }

  const s = await prisma.supplier.create({
    data: {
      tenantId,
      name: body.name.trim(),
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "SUPPLIER_CREATED",
      entity: "Supplier",
      entityId: s.id,
      metadataJson: JSON.stringify({ name: s.name, phone: s.phone, email: s.email }),
    },
  });

  return NextResponse.json({ ok: true, supplier: s });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { supplierId, name, phone, email, address } = body;

  if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId: supplier.tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data: any = {};
  if (name) data.name = name.trim();
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (email !== undefined) data.email = email?.trim() || null;
  if (address !== undefined) data.address = address?.trim() || null;

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data,
  });

  return NextResponse.json({ ok: true, supplier: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const supplierId = req.nextUrl.searchParams.get("supplierId");
  if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchaseOrders: {
        where: { status: { in: ["DRAFT", "SUBMITTED"] } },
      },
    },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId: supplier.tenantId } });
  if (!memChk || memChk.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (supplier.purchaseOrders.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete supplier with pending purchase orders." },
      { status: 400 }
    );
  }

  await prisma.supplier.delete({ where: { id: supplierId } });
  return NextResponse.json({ ok: true, deleted: true });
}
