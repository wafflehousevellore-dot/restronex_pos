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

  const outletId = req.nextUrl.searchParams.get("outletId");
  const search = req.nextUrl.searchParams.get("search");

  const itemWhere: any = { tenantId };
  if (search) {
    itemWhere.name = { contains: search, mode: "insensitive" };
  }

  const movementWhere: any = { tenantId };
  if (outletId && outletId !== "ALL") {
    movementWhere.outletId = outletId;
  }

  // Today start date for metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [items, movements, pendingPos] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: itemWhere,
      orderBy: { name: "asc" },
      include: {
        recipeIngredients: {
          include: {
            recipe: {
              include: {
                menuItem: { select: { id: true, name: true, pricePaise: true } },
              },
            },
          },
        },
        supplierPrices: {
          include: {
            supplier: { select: { id: true, name: true } },
          },
          orderBy: { pricePaise: "asc" },
        },
      },
    }),
    prisma.stockMovement.findMany({
      where: movementWhere,
      orderBy: { createdAt: "desc" },
      include: {
        outlet: { select: { id: true, name: true, city: true } },
      },
      take: 100,
    }),
    prisma.purchaseOrder.count({
      where: {
        tenantId,
        status: { in: ["DRAFT", "SUBMITTED"] },
      },
    }),
  ]);

  // Enrich items with computed health & asset value
  const enrichedItems = items.map((it) => {
    const stockValuePaise = Math.round(it.currentStock * it.costPerUnitPaise);
    const isOutOfStock = it.currentStock <= 0;
    const isLowStock = it.currentStock > 0 && it.currentStock <= it.lowStockThreshold;
    const lowestSupplierPrice = it.supplierPrices.length > 0 ? it.supplierPrices[0] : null;

    return {
      ...it,
      stockValuePaise,
      isOutOfStock,
      isLowStock,
      recipesCount: it.recipeIngredients.length,
      lowestSupplierPrice,
    };
  });

  // Calculate real-time dashboard summary metrics
  const totalStockValuePaise = enrichedItems.reduce((acc, it) => acc + it.stockValuePaise, 0);
  const lowStockCount = enrichedItems.filter((it) => it.isLowStock).length;
  const outOfStockCount = enrichedItems.filter((it) => it.isOutOfStock).length;

  // Today's consumption and wastage from stock movements
  let todayConsumptionPaise = 0;
  let todayWastagePaise = 0;

  const itemCostMap = new Map(items.map((it) => [it.id, it.costPerUnitPaise]));

  movements.forEach((m) => {
    const costPerUnit = itemCostMap.get(m.inventoryItemId) || 0;
    const movementDate = new Date(m.createdAt);

    if (movementDate >= todayStart) {
      if (m.type === "SALE_CONSUMPTION") {
        todayConsumptionPaise += Math.round(Math.abs(m.quantity) * costPerUnit);
      } else if (m.type === "WASTE" || m.type === "DAMAGE" || m.type === "EXPIRY") {
        todayWastagePaise += Math.round(Math.abs(m.quantity) * costPerUnit);
      }
    }
  });

  return NextResponse.json({
    items: enrichedItems,
    movements,
    metrics: {
      totalItems: enrichedItems.length,
      totalStockValuePaise,
      lowStockCount,
      outOfStockCount,
      pendingPurchaseOrders: pendingPos,
      todayConsumptionPaise,
      todayWastagePaise,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Ingredient name is required" }, { status: 400 });
  }

  const unit = (body.unit || "KG").toUpperCase();
  const currentStock = Math.max(0, parseFloat(body.currentStock || "0") || 0);
  const lowStockThreshold = Math.max(0, parseFloat(body.lowStockThreshold || "5") || 5);
  const costPerUnitPaise = Math.max(0, parseInt(body.costPerUnitPaise || "0", 10) || 0);

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId,
      name: body.name.trim(),
      unit,
      currentStock,
      lowStockThreshold,
      costPerUnitPaise,
    },
  });

  // If opening stock provided, record initial stock movement
  if (currentStock > 0) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        outletId: body.outletId || null,
        inventoryItemId: item.id,
        type: "OPENING_STOCK",
        quantity: currentStock,
        reference: body.notes || "Initial Opening Stock",
      },
    });
  }

  // If supplier price provided, link supplier
  if (body.supplierId && costPerUnitPaise > 0) {
    await prisma.supplierPrice.upsert({
      where: {
        inventoryItemId_supplierId: {
          inventoryItemId: item.id,
          supplierId: body.supplierId,
        },
      },
      create: {
        tenantId,
        inventoryItemId: item.id,
        supplierId: body.supplierId,
        pricePaise: costPerUnitPaise,
      },
      update: {
        pricePaise: costPerUnitPaise,
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
      metadataJson: JSON.stringify({
        name: item.name,
        unit: item.unit,
        stock: item.currentStock,
        costPerUnitPaise: item.costPerUnitPaise,
      }),
    },
  });

  appCache.delPrefix(`report_${tenantId}`);
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { 
    itemId, 
    action, 
    quantity, 
    notes, 
    costPerUnitPaise, 
    lowStockThreshold, 
    unit, 
    name, 
    outletId,
    targetOutletId 
  } = body;

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: item.tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let newStock = item.currentStock;
  const qtyNum = Math.abs(parseFloat(quantity || "0"));

  // 1. Restock / Inward Purchase
  if (action === "RESTOCK") {
    newStock += qtyNum;
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        outletId: outletId || null,
        inventoryItemId: item.id,
        type: "PURCHASE",
        quantity: qtyNum,
        reference: notes || "Restock inward receipt",
      },
    });
  }
  // 2. Wastage / Spoilage
  else if (action === "WASTE") {
    newStock = Math.max(0, newStock - qtyNum);
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        outletId: outletId || null,
        inventoryItemId: item.id,
        type: "WASTE",
        quantity: -qtyNum,
        reference: notes || "Spoilage / Wastage recorded",
      },
    });
  }
  // 3. Damaged stock
  else if (action === "DAMAGE") {
    newStock = Math.max(0, newStock - qtyNum);
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        outletId: outletId || null,
        inventoryItemId: item.id,
        type: "DAMAGE",
        quantity: -qtyNum,
        reference: notes || "Damaged goods deduction",
      },
    });
  }
  // 4. Expired stock
  else if (action === "EXPIRY") {
    newStock = Math.max(0, newStock - qtyNum);
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        outletId: outletId || null,
        inventoryItemId: item.id,
        type: "EXPIRY",
        quantity: -qtyNum,
        reference: notes || "Expired raw materials discarded",
      },
    });
  }
  // 5. Physical Audit Count Correction
  else if (action === "ADJUST") {
    const targetStock = parseFloat(quantity || "0");
    const diff = targetStock - item.currentStock;
    newStock = Math.max(0, targetStock);
    await prisma.stockMovement.create({
      data: {
        tenantId: item.tenantId,
        outletId: outletId || null,
        inventoryItemId: item.id,
        type: "AUDIT_ADJUSTMENT",
        quantity: diff,
        reference: notes || `Audit Count Adjustment (${item.currentStock} -> ${targetStock})`,
      },
    });
  }
  // 6. Multi-outlet Inter-branch Transfer
  else if (action === "TRANSFER" && targetOutletId) {
    if (newStock < qtyNum) {
      return NextResponse.json({ error: "Insufficient stock available for transfer" }, { status: 400 });
    }
    // Transactional transfer movements
    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          tenantId: item.tenantId,
          outletId: outletId || null,
          inventoryItemId: item.id,
          type: "TRANSFER_OUT",
          quantity: -qtyNum,
          reference: notes || `Transfer OUT to branch ${targetOutletId}`,
        },
      }),
      prisma.stockMovement.create({
        data: {
          tenantId: item.tenantId,
          outletId: targetOutletId,
          inventoryItemId: item.id,
          type: "TRANSFER_IN",
          quantity: qtyNum,
          reference: notes || `Transfer IN from branch ${outletId || "Main"}`,
        },
      }),
    ]);
  }

  // Update item master attributes
  const updateData: any = {
    currentStock: newStock,
  };
  if (name) updateData.name = name.trim();
  if (unit) updateData.unit = unit.toUpperCase();
  if (costPerUnitPaise !== undefined) updateData.costPerUnitPaise = parseInt(costPerUnitPaise, 10);
  if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseFloat(lowStockThreshold);

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: updateData,
  });

  appCache.delPrefix(`report_${item.tenantId}`);

  await prisma.auditLog.create({
    data: {
      tenantId: item.tenantId,
      userId,
      action: action ? `INVENTORY_${action}` : "INVENTORY_UPDATED",
      entity: "InventoryItem",
      entityId: item.id,
      metadataJson: JSON.stringify({
        action,
        previousStock: item.currentStock,
        newStock,
        notes,
      }),
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      recipeIngredients: {
        include: {
          recipe: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: item.tenantId } });
  if (!memCheck || memCheck.role !== "OWNER") {
    return NextResponse.json({ error: "Only restaurant owners can delete inventory materials" }, { status: 403 });
  }

  // Check if ingredient is linked to active dish recipes
  if (item.recipeIngredients.length > 0) {
    const dishes = item.recipeIngredients.map((ri) => ri.recipe.menuItem?.name).filter(Boolean);
    return NextResponse.json(
      {
        error: `Cannot delete ingredient. It is actively used in recipes for: ${dishes.slice(0, 3).join(", ")}${
          dishes.length > 3 ? "..." : ""
        }. Please remove it from recipes first.`,
      },
      { status: 400 }
    );
  }

  await prisma.inventoryItem.delete({ where: { id: itemId } });
  appCache.delPrefix(`report_${item.tenantId}`);

  await prisma.auditLog.create({
    data: {
      tenantId: item.tenantId,
      userId,
      action: "INVENTORY_ITEM_DELETED",
      entity: "InventoryItem",
      entityId: itemId,
      metadataJson: JSON.stringify({ name: item.name }),
    },
  });

  return NextResponse.json({ ok: true, deleted: true });
}
