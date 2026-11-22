import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache } from "@/lib/cache";
import { recordStockMovement } from "@/lib/inventory/stock-ledger";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supplierId = req.nextUrl.searchParams.get("supplierId");
  const status = req.nextUrl.searchParams.get("status");
  const outletId = req.nextUrl.searchParams.get("outletId");

  const where: any = { tenantId };
  if (supplierId && supplierId !== "ALL") where.supplierId = supplierId;
  if (status && status !== "ALL") where.status = status;
  if (outletId && outletId !== "ALL") where.outletId = outletId;

  const [orders, auditLogs] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true },
        },
        outlet: {
          select: { id: true, name: true, city: true },
        },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, sku: true } },
          },
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

  // Backward compatibility: map metadata from audit logs if items table is empty for legacy rows
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
    const items = o.items.length > 0 ? o.items : meta.items || [];
    return {
      ...o,
      items,
      notes: o.notes || meta.notes || null,
      expectedDeliveryDate: meta.expectedDeliveryDate || null,
      outletId: o.outletId || meta.outletId || null,
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
  const taxPaise = parseInt(String(body.taxPaise || "0"), 10) || 0;
  const discountPaise = parseInt(String(body.discountPaise || "0"), 10) || 0;
  const freightPaise = parseInt(String(body.freightPaise || "0"), 10) || 0;
  const status = body.status || "SUBMITTED";
  const items = Array.isArray(body.items) ? body.items : [];
  const outletId = body.outletId || null;

  const po = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: body.supplierId,
        outletId,
        poNumber,
        supplierInvoiceNumber: body.supplierInvoiceNumber?.trim() || null,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
        status,
        totalPaise,
        taxPaise,
        discountPaise,
        freightPaise,
        paymentStatus: body.paymentStatus || "UNPAID",
        paymentMethod: body.paymentMethod || null,
        attachmentUrl: body.attachmentUrl || null,
        notes: body.notes?.trim() || null,
        receivedAt: status === "RECEIVED" ? new Date() : null,
        receivedById: status === "RECEIVED" ? userId : null,
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    // Create line items
    for (const item of items) {
      if (item.inventoryItemId) {
        const qty = parseFloat(item.quantity || "0") || 0;
        const unitCost = parseInt(String(item.unitCostPaise || "0"), 10) || 0;
        const lineTax = parseInt(String(item.taxPaise || "0"), 10) || 0;
        const lineDiscount = parseInt(String(item.discountPaise || "0"), 10) || 0;
        const lineTotal = parseInt(String(item.totalPaise || (qty * unitCost)), 10) || 0;

        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: created.id,
            inventoryItemId: item.inventoryItemId,
            productName: item.name || "Item",
            quantity: qty,
            unit: item.unit || "PCS",
            unitCostPaise: unitCost,
            taxPaise: lineTax,
            discountPaise: lineDiscount,
            totalPaise: lineTotal,
            receivedQty: status === "RECEIVED" ? qty : 0,
          },
        });

        // If created directly as RECEIVED, increment stock via Stock Ledger
        if (status === "RECEIVED" && qty > 0) {
          await recordStockMovement(tx, {
            tenantId,
            outletId,
            inventoryItemId: item.inventoryItemId,
            type: "PURCHASE",
            quantity: qty,
            unit: item.unit,
            reference: `PO #${poNumber} Received Inward`,
            userId,
            costPaise: unitCost,
          });
        }
      }
    }

    return created;
  });

  // Save audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "PURCHASE_ORDER_CREATED",
      entity: "PurchaseOrder",
      entityId: po.id,
      metadataJson: JSON.stringify({
        poNumber: po.poNumber,
        items,
        notes: body.notes || null,
        outletId,
        status,
      }),
    },
  });

  appCache.delPrefix(`report_${tenantId}`);
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
    include: { supplier: true, items: true },
  });
  if (!po) return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: po.tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Handle Goods Receipt (Receiving Items into Stock)
  if (action === "RECEIVE_PO") {
    if (po.status === "RECEIVED") {
      return NextResponse.json({ error: "Purchase Order is already marked as received" }, { status: 400 });
    }

    const itemsToReceive = Array.isArray(receivedItems) && receivedItems.length > 0 ? receivedItems : po.items;
    const targetOutlet = outletId || po.outletId;

    await prisma.$transaction(async (tx) => {
      for (const item of itemsToReceive) {
        const qty = parseFloat(item.quantity || item.receivedQty || "0");
        const invId = item.inventoryItemId;

        if (qty > 0 && invId) {
          // Increment stock atomically via Stock Ledger
          await recordStockMovement(tx, {
            tenantId: po.tenantId,
            outletId: targetOutlet,
            inventoryItemId: invId,
            type: "PURCHASE",
            quantity: qty,
            unit: item.unit,
            reference: `PO #${po.poNumber} Goods Received: ${item.productName || item.name || "Item"} ×${qty}`,
            userId,
            costPaise: item.unitCostPaise,
          });

          // Update line item receivedQty if matching line item exists
          if (item.id) {
            await tx.purchaseOrderItem.update({
              where: { id: item.id },
              data: { receivedQty: qty },
            });
          }
        }
      }

      // Mark PO as received
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: "RECEIVED",
          outletId: targetOutlet,
          receivedAt: new Date(),
          receivedById: userId,
        },
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
          itemsToReceive,
          outletId: targetOutlet,
        }),
      },
    });

    return NextResponse.json({ ok: true, received: true, poNumber: po.poNumber });
  }

  // General Status & Details Update
  const updateData: any = {};
  if (status) updateData.status = status;
  if (body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
  if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
  if (body.supplierInvoiceNumber) updateData.supplierInvoiceNumber = body.supplierInvoiceNumber;
  if (body.notes) updateData.notes = body.notes;

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: updateData,
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
