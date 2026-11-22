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

  const outletId = req.nextUrl.searchParams.get("outletId");
  const search = req.nextUrl.searchParams.get("search");
  const category = req.nextUrl.searchParams.get("category");

  const itemWhere: any = { tenantId };
  if (outletId && outletId !== "ALL") {
    itemWhere.OR = [{ outletId: null }, { outletId }];
  }
  if (category && category !== "ALL") {
    itemWhere.category = category;
  }
  if (search) {
    itemWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  const movementWhere: any = { tenantId };
  if (outletId && outletId !== "ALL") {
    movementWhere.outletId = outletId;
  }

  // Date boundaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

  const [items, movements, pendingPos, bulkSalesSummary, purchasesSummary] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: itemWhere,
      orderBy: { name: "asc" },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        outlet: { select: { id: true, name: true } },
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
    prisma.bulkSale.aggregate({
      where: {
        tenantId,
        status: "CONFIRMED",
        ...(outletId && outletId !== "ALL" ? { outletId } : {}),
      },
      _count: { id: true },
      _sum: { totalPaise: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        tenantId,
        status: { in: ["RECEIVED", "PARTIALLY_RECEIVED", "SUBMITTED"] },
        ...(outletId && outletId !== "ALL" ? { outletId } : {}),
      },
      _count: { id: true },
      _sum: { totalPaise: true },
    }),
  ]);

  // Enrich items with computed health & asset value
  let totalAvailableStock = 0;
  let expiringProductsCount = 0;

  const enrichedItems = items.map((it) => {
    const costPaise = it.costPerUnitPaise || it.purchasePricePaise || it.averageCostPaise || 0;
    const stockValuePaise = Math.round(it.currentStock * costPaise);
    const isOutOfStock = it.currentStock <= 0;
    const isLowStock = it.currentStock > 0 && it.currentStock <= it.lowStockThreshold;
    const lowestSupplierPrice = it.supplierPrices.length > 0 ? it.supplierPrices[0] : null;

    totalAvailableStock += Math.max(0, it.currentStock);

    if (it.expiryDate && new Date(it.expiryDate) <= thirtyDaysAhead && new Date(it.expiryDate) >= todayStart) {
      expiringProductsCount++;
    }

    return {
      ...it,
      costPerUnitPaise: costPaise,
      stockValuePaise,
      isOutOfStock,
      isLowStock,
      recipesCount: it.recipeIngredients.length,
      lowestSupplierPrice,
    };
  });

  // Calculate real-time dashboard summary metrics from actual database records
  const totalStockValuePaise = enrichedItems.reduce((acc, it) => acc + it.stockValuePaise, 0);
  const lowStockCount = enrichedItems.filter((it) => it.isLowStock).length;
  const outOfStockCount = enrichedItems.filter((it) => it.isOutOfStock).length;

  // Today's consumption, bulk sales, and wastage from stock movements
  let todayConsumptionPaise = 0;
  let todayWastagePaise = 0;
  let totalWastagePaiseAllTime = 0;

  const itemCostMap = new Map(items.map((it) => [it.id, it.costPerUnitPaise || it.purchasePricePaise || 0]));

  movements.forEach((m) => {
    const costPerUnit = itemCostMap.get(m.inventoryItemId) || m.costPaise || 0;
    const movementDate = new Date(m.createdAt);

    if (m.type === "WASTE" || m.type === "DAMAGE" || m.type === "EXPIRY") {
      totalWastagePaiseAllTime += Math.round(Math.abs(m.quantity) * costPerUnit);
    }

    if (movementDate >= todayStart) {
      if (m.type === "SALE_CONSUMPTION" || m.type === "RECIPE_CONSUMPTION") {
        todayConsumptionPaise += Math.round(Math.abs(m.quantity) * costPerUnit);
      } else if (m.type === "WASTE" || m.type === "DAMAGE" || m.type === "EXPIRY") {
        todayWastagePaise += Math.round(Math.abs(m.quantity) * costPerUnit);
      }
    }
  });

  // Category valuation breakdown for charts
  const categoryMap = new Map<string, { count: number; valuePaise: number }>();
  enrichedItems.forEach((it) => {
    const cat = it.category || "General";
    const existing = categoryMap.get(cat) || { count: 0, valuePaise: 0 };
    categoryMap.set(cat, {
      count: existing.count + 1,
      valuePaise: existing.valuePaise + it.stockValuePaise,
    });
  });

  const categoryValuations = Array.from(categoryMap.entries()).map(([cat, data]) => ({
    category: cat,
    itemsCount: data.count,
    valuePaise: data.valuePaise,
  }));

  return NextResponse.json({
    items: enrichedItems,
    movements,
    metrics: {
      totalItems: enrichedItems.length,
      totalAvailableStock: Number(totalAvailableStock.toFixed(2)),
      totalStockValuePaise,
      lowStockCount,
      outOfStockCount,
      expiringCount: expiringProductsCount,
      pendingPurchaseOrders: pendingPos,
      totalPurchasesCount: purchasesSummary._count.id || 0,
      totalPurchasesValuePaise: purchasesSummary._sum.totalPaise || 0,
      totalBulkSalesCount: bulkSalesSummary._count.id || 0,
      totalBulkSalesValuePaise: bulkSalesSummary._sum.totalPaise || 0,
      inventoryWastagePaise: totalWastagePaiseAllTime,
      todayConsumptionPaise,
      todayWastagePaise,
    },
    charts: {
      categoryValuations,
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
    return NextResponse.json({ error: "Product/Ingredient name is required" }, { status: 400 });
  }

  const unit = (body.unit || "KG").toUpperCase();
  const baseUnit = body.baseUnit ? body.baseUnit.toUpperCase() : unit;
  const currentStock = Math.max(0, parseFloat(body.currentStock || body.openingStock || "0") || 0);
  const lowStockThreshold = Math.max(0, parseFloat(body.lowStockThreshold || "5") || 5);
  const costPerUnitPaise = Math.max(0, parseInt(body.costPerUnitPaise || body.purchasePricePaise || "0", 10) || 0);

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId,
      name: body.name.trim(),
      unit,
      baseUnit,
      purchaseUnit: body.purchaseUnit ? body.purchaseUnit.toUpperCase() : null,
      sellingUnit: body.sellingUnit ? body.sellingUnit.toUpperCase() : null,
      conversionRatio: Math.max(0.000001, parseFloat(body.conversionRatio || "1") || 1),
      openingStock: currentStock,
      currentStock,
      lowStockThreshold,
      reorderLevel: body.reorderLevel ? parseFloat(body.reorderLevel) : null,
      costPerUnitPaise,
      purchasePricePaise: costPerUnitPaise,
      averageCostPaise: costPerUnitPaise,
      sellingPricePaise: body.sellingPricePaise ? parseInt(body.sellingPricePaise, 10) : null,
      taxRateBps: body.taxRateBps ? parseInt(body.taxRateBps, 10) : 0,
      sku: body.sku?.trim() || null,
      barcode: body.barcode?.trim() || null,
      category: body.category?.trim() || "General",
      description: body.description?.trim() || null,
      imageUrl: body.imageUrl || null,
      supplierId: body.supplierId || null,
      outletId: body.outletId || null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      batchNumber: body.batchNumber?.trim() || null,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    },
  });

  // If opening stock provided, record initial stock movement via Stock Ledger
  if (currentStock > 0) {
    await recordStockMovement(prisma, {
      tenantId,
      outletId: body.outletId || null,
      inventoryItemId: item.id,
      type: "OPENING_STOCK",
      quantity: currentStock,
      unit: item.unit,
      reference: body.notes || "Initial Opening Stock",
      userId,
      costPaise: costPerUnitPaise,
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
        sku: item.sku,
        barcode: item.barcode,
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
    purchasePricePaise,
    sellingPricePaise,
    lowStockThreshold, 
    reorderLevel,
    unit, 
    baseUnit,
    purchaseUnit,
    sellingUnit,
    conversionRatio,
    name, 
    sku,
    barcode,
    category,
    description,
    supplierId,
    outletId,
    targetOutletId,
    expiryDate,
    batchNumber,
    isActive
  } = body;

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: item.tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const qtyNum = Math.abs(parseFloat(quantity || "0"));

  // Stock Adjustment actions via Stock Ledger
  if (action === "RESTOCK") {
    await recordStockMovement(prisma, {
      tenantId: item.tenantId,
      outletId: outletId || item.outletId,
      inventoryItemId: item.id,
      type: "PURCHASE",
      quantity: qtyNum,
      unit: unit || item.unit,
      reference: notes || "Restock inward receipt",
      userId,
    });
  } else if (action === "WASTE") {
    await recordStockMovement(prisma, {
      tenantId: item.tenantId,
      outletId: outletId || item.outletId,
      inventoryItemId: item.id,
      type: "WASTE",
      quantity: -qtyNum,
      unit: unit || item.unit,
      reference: notes || "Spoilage / Wastage recorded",
      userId,
    });
  } else if (action === "DAMAGE") {
    await recordStockMovement(prisma, {
      tenantId: item.tenantId,
      outletId: outletId || item.outletId,
      inventoryItemId: item.id,
      type: "DAMAGE",
      quantity: -qtyNum,
      unit: unit || item.unit,
      reference: notes || "Damaged goods deduction",
      userId,
    });
  } else if (action === "EXPIRY") {
    await recordStockMovement(prisma, {
      tenantId: item.tenantId,
      outletId: outletId || item.outletId,
      inventoryItemId: item.id,
      type: "EXPIRY",
      quantity: -qtyNum,
      unit: unit || item.unit,
      reference: notes || "Expired raw materials discarded",
      userId,
    });
  } else if (action === "ADJUST") {
    const targetStock = parseFloat(quantity || "0");
    const diff = targetStock - item.currentStock;
    await recordStockMovement(prisma, {
      tenantId: item.tenantId,
      outletId: outletId || item.outletId,
      inventoryItemId: item.id,
      type: "AUDIT_ADJUSTMENT",
      quantity: diff,
      unit: item.unit,
      reference: notes || `Audit Count Adjustment (${item.currentStock} -> ${targetStock})`,
      userId,
      allowNegativeStock: targetStock < 0,
    });
  } else if (action === "TRANSFER" && targetOutletId) {
    if (item.currentStock < qtyNum) {
      return NextResponse.json({ error: "Insufficient stock available for transfer" }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await recordStockMovement(tx, {
        tenantId: item.tenantId,
        outletId: outletId || item.outletId,
        inventoryItemId: item.id,
        type: "TRANSFER_OUT",
        quantity: -qtyNum,
        unit: item.unit,
        reference: notes || `Transfer OUT to branch ${targetOutletId}`,
        userId,
      });
      await recordStockMovement(tx, {
        tenantId: item.tenantId,
        outletId: targetOutletId,
        inventoryItemId: item.id,
        type: "TRANSFER_IN",
        quantity: qtyNum,
        unit: item.unit,
        reference: notes || `Transfer IN from branch ${outletId || "Main"}`,
        userId,
      });
    });
  }

  // Update item master attributes
  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (unit) updateData.unit = unit.toUpperCase();
  if (baseUnit) updateData.baseUnit = baseUnit.toUpperCase();
  if (purchaseUnit !== undefined) updateData.purchaseUnit = purchaseUnit ? purchaseUnit.toUpperCase() : null;
  if (sellingUnit !== undefined) updateData.sellingUnit = sellingUnit ? sellingUnit.toUpperCase() : null;
  if (conversionRatio !== undefined) updateData.conversionRatio = Math.max(0.000001, parseFloat(conversionRatio) || 1);
  if (costPerUnitPaise !== undefined || purchasePricePaise !== undefined) {
    const cost = parseInt(costPerUnitPaise || purchasePricePaise, 10);
    updateData.costPerUnitPaise = cost;
    updateData.purchasePricePaise = cost;
  }
  if (sellingPricePaise !== undefined) {
    updateData.sellingPricePaise = sellingPricePaise ? parseInt(sellingPricePaise, 10) : null;
  }
  if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseFloat(lowStockThreshold);
  if (reorderLevel !== undefined) updateData.reorderLevel = reorderLevel ? parseFloat(reorderLevel) : null;
  if (sku !== undefined) updateData.sku = sku?.trim() || null;
  if (barcode !== undefined) updateData.barcode = barcode?.trim() || null;
  if (category !== undefined) updateData.category = category?.trim() || "General";
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (supplierId !== undefined) updateData.supplierId = supplierId || null;
  if (outletId !== undefined) updateData.outletId = outletId || null;
  if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
  if (batchNumber !== undefined) updateData.batchNumber = batchNumber?.trim() || null;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

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
        newStock: updated.currentStock,
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
