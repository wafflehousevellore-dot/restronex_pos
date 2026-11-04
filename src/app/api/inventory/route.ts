import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [items, movements] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: {
        recipeIngredients: {
          include: {
            recipe: {
              include: {
                menuItem: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.stockMovement.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return NextResponse.json({ items, movements });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId,
      name: body.name.trim(),
      unit: body.unit || "KG",
      currentStock: parseFloat(body.currentStock || "0"),
      lowStockThreshold: parseFloat(body.lowStockThreshold || "5"),
      costPerUnitPaise: parseInt(body.costPerUnitPaise || "0", 10),
    },
  });

  if (body.currentStock && parseFloat(body.currentStock) > 0) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        inventoryItemId: item.id,
        type: "PURCHASE",
        quantity: parseFloat(body.currentStock),
        reference: "Opening initial stock",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "INVENTORY_ITEM_CREATED",
      entity: "InventoryItem",
      entityId: item.id,
      metadataJson: JSON.stringify({ name: item.name, stock: item.currentStock }),
    },
  });

  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { itemId, action, quantity, notes, costPerUnitPaise, lowStockThreshold } = body;

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: item.tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let newStock = item.currentStock;
  const qtyNum = parseFloat(quantity || "0");

  if (action === "RESTOCK") {
    newStock += qtyNum;
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        inventoryItemId: item.id,
        type: "PURCHASE",
        quantity: qtyNum,
        reference: notes || "Restock delivery received",
      },
    });
  } else if (action === "WASTE") {
    newStock = Math.max(0, newStock - qtyNum);
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        inventoryItemId: item.id,
        type: "WASTE",
        quantity: qtyNum,
        reference: notes || "Spoilage / waste log",
      },
    });
  } else if (action === "ADJUST") {
    const diff = qtyNum - item.currentStock;
    newStock = qtyNum;
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        inventoryItemId: item.id,
        type: "AUDIT_ADJUSTMENT",
        quantity: diff,
        reference: notes || "Physical stock count audit adjustment",
      },
    });
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      currentStock: newStock,
      ...(costPerUnitPaise !== undefined ? { costPerUnitPaise: parseInt(costPerUnitPaise, 10) } : {}),
      ...(lowStockThreshold !== undefined ? { lowStockThreshold: parseFloat(lowStockThreshold) } : {}),
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: item.tenantId } });
  if (!memCheck || memCheck.role !== "OWNER") return NextResponse.json({ error: "Only owners can delete materials" }, { status: 403 });

  await prisma.inventoryItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
