import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supplierId = req.nextUrl.searchParams.get("supplierId");
  const status = req.nextUrl.searchParams.get("status");

  const where: any = { tenantId };
  if (supplierId && supplierId !== "ALL") where.supplierId = supplierId;
  if (status && status !== "ALL") where.status = status;

  const [orders, auditLogs] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: {
        tenantId,
        entity: "PurchaseOrder",
        action: "PURCHASE_ORDER_CREATED",
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  // Map metadata (items, notes, deliveryDate) from creation audit logs
  const metaMap = new Map<string, any>();
  auditLogs.forEach((log) => {
    if (log.entityId && log.metadataJson) {
      try {
        metaMap.set(log.entityId, JSON.parse(log.metadataJson));
      } catch {}
    }
  });

  const enrichedOrders = orders.map((o) => {
    const meta = metaMap.get(o.id) || {};
    return {
      ...o,
      items: meta.items || [],
      notes: meta.notes || null,
      expectedDeliveryDate: meta.expectedDeliveryDate || null,
      outletId: meta.outletId || null,
    };
  });

  return NextResponse.json(enrichedOrders);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!body.supplierId) {
    return NextResponse.json({ error: "Supplier is required" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: body.supplierId, tenantId },
  });
  if (!supplier) {
    return NextResponse.json({ error: "Invalid supplier" }, { status: 404 });
  }

  // Count existing POs to auto-generate PO Number if missing
  const count = await prisma.purchaseOrder.count({ where: { tenantId } });
  const poNumber = body.poNumber?.trim() || `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const totalPaise = parseInt(String(body.totalPaise || "0"), 10) || 0;
  const status = body.status || "SUBMITTED";

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      supplierId: body.supplierId,
      poNumber,
      status,
      totalPaise,
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  });

  // Save line items and notes in AuditLog
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "PURCHASE_ORDER_CREATED",
      entity: "PurchaseOrder",
      entityId: po.id,
      metadataJson: JSON.stringify({
        poNumber: po.poNumber,
        items: body.items || [],
        notes: body.notes || null,
        expectedDeliveryDate: body.expectedDeliveryDate || null,
        outletId: body.outletId || null,
      }),
    },
  });

  return NextResponse.json({ ok: true, purchaseOrder: po });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { poId, status, action, receivedItems, outletId } = body;

  if (!poId) return NextResponse.json({ error: "poId required" }, { status: 400 });

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { supplier: true },
  });
  if (!po) return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: po.tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Handle Goods Receipt (Receiving Items into Stock)
  if (action === "RECEIVE_PO" && Array.isArray(receivedItems) && receivedItems.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const item of receivedItems) {
        const qty = parseFloat(item.quantity || "0");
        if (qty > 0 && item.inventoryItemId) {
          // Increment stock
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: { currentStock: { increment: qty } },
          });

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              tenantId: po.tenantId,
              outletId: outletId || null,
              inventoryItemId: item.inventoryItemId,
              type: "PURCHASE",
              quantity: qty,
              reference: `PO #${po.poNumber}: ${item.name || "Item"} ×${qty} ${item.unit || ""}`,
            },
          });
        }
      }

      // Mark PO as received
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: "RECEIVED" },
      });
    });

    appCache.delPrefix(`report_${po.tenantId}`);

    await prisma.auditLog.create({
      data: {
        tenantId: po.tenantId,
        userId,
        action: "PURCHASE_ORDER_RECEIVED",
        entity: "PurchaseOrder",
        entityId: po.id,
        metadataJson: JSON.stringify({
          poNumber: po.poNumber,
          receivedItems,
        }),
      },
    });

    return NextResponse.json({ ok: true, received: true, poNumber: po.poNumber });
  }

  // General Status Update
  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: status || po.status },
  });

  return NextResponse.json({ ok: true, purchaseOrder: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const poId = req.nextUrl.searchParams.get("poId");
  if (!poId) return NextResponse.json({ error: "poId required" }, { status: 400 });

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) return NextResponse.json({ error: "PO not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: po.tenantId } });
  if (!memCheck || memCheck.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (po.status === "RECEIVED") {
    return NextResponse.json({ error: "Cannot delete a received purchase order" }, { status: 400 });
  }

  await prisma.purchaseOrder.delete({ where: { id: poId } });
  return NextResponse.json({ ok: true, deleted: true });
}
