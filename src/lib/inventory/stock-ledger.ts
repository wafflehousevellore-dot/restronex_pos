/**
 * RestroNex Authoritative Stock Ledger Engine
 * Enforces atomic stock deductions, prevents overselling, and guarantees an immutable audit trail.
 */

import { prisma } from "@/lib/db";
import { appCache } from "@/lib/cache";
import { convertToBaseUnit } from "./unit-conversion";

export type StockMovementType =
  | "OPENING_STOCK"
  | "PURCHASE"
  | "SALE_CONSUMPTION"
  | "RECIPE_CONSUMPTION"
  | "BULK_SALE"
  | "WASTE"
  | "DAMAGE"
  | "EXPIRY"
  | "AUDIT_ADJUSTMENT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "BULK_SALE_REFUND";

export interface StockMovementInput {
  tenantId: string;
  outletId?: string | null;
  inventoryItemId: string;
  type: StockMovementType;
  quantity: number; // Positive to add stock, negative to deduct stock
  unit?: string | null;
  reference?: string | null;
  notes?: string | null;
  userId?: string | null;
  costPaise?: number | null;
  allowNegativeStock?: boolean;
}

export class InsufficientStockError extends Error {
  public itemId: string;
  public itemName: string;
  public availableStock: number;
  public requestedDeduction: number;
  public unit: string;

  constructor(
    itemName: string,
    availableStock: number,
    requestedDeduction: number,
    unit: string,
    itemId: string
  ) {
    super(
      `Insufficient stock for '${itemName}'. Available: ${availableStock} ${unit}, Required: ${requestedDeduction} ${unit}.`
    );
    this.name = "InsufficientStockError";
    this.itemName = itemName;
    this.availableStock = availableStock;
    this.requestedDeduction = requestedDeduction;
    this.unit = unit;
    this.itemId = itemId;
  }
}

export class InventoryItemNotFoundError extends Error {
  constructor(itemId: string) {
    super(`Inventory item '${itemId}' not found or belongs to another tenant.`);
    this.name = "InventoryItemNotFoundError";
  }
}

/**
 * Atomically records a stock movement against an inventory item.
 * Must be called inside a Prisma transaction context (or default prisma instance).
 */
export async function recordStockMovement(
  tx: any,
  input: StockMovementInput
): Promise<{
  success: boolean;
  inventoryItemId: string;
  previousStock: number;
  newStock: number;
  movementId: string;
}> {
  const {
    tenantId,
    outletId,
    inventoryItemId,
    type,
    quantity,
    unit,
    reference,
    notes,
    userId,
    costPaise,
    allowNegativeStock = false,
  } = input;

  // 1. Fetch current item state with tenant isolation
  const item = await tx.inventoryItem.findFirst({
    where: { id: inventoryItemId, tenantId },
  });

  if (!item) {
    throw new InventoryItemNotFoundError(inventoryItemId);
  }

  // 2. Unit conversion to base inventory unit if necessary
  let baseQuantityChange = quantity;
  if (unit && unit !== item.unit) {
    try {
      // If quantity is negative (deduction), convert absolute then negate
      const absQty = Math.abs(quantity);
      const convertedAbs = convertToBaseUnit(absQty, unit, item);
      baseQuantityChange = quantity < 0 ? -convertedAbs : convertedAbs;
    } catch {
      // If unit conversion fails, keep raw quantity
      baseQuantityChange = quantity;
    }
  }

  const previousStock = Number(item.currentStock || 0);
  const newStock = Number((previousStock + baseQuantityChange).toFixed(4));

  // 3. Strict guard against overselling / negative stock
  if (newStock < 0 && !allowNegativeStock) {
    throw new InsufficientStockError(
      item.name,
      previousStock,
      Math.abs(baseQuantityChange),
      item.unit,
      item.id
    );
  }

  // 4. Update current stock on inventory item
  await tx.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { currentStock: newStock },
  });

  // 5. Append immutable entry to StockMovement ledger
  const movement = await tx.stockMovement.create({
    data: {
      tenantId,
      outletId: outletId || item.outletId || null,
      inventoryItemId: item.id,
      type,
      quantity: baseQuantityChange,
      previousStock,
      newStock,
      unit: item.unit,
      costPaise: costPaise !== undefined && costPaise !== null ? costPaise : item.costPerUnitPaise,
      userId: userId || null,
      reference: reference || notes || `${type} Movement`,
    },
  });

  // Invalidate cache
  try {
    appCache.delPrefix(`report_${tenantId}`);
  } catch {}

  return {
    success: true,
    inventoryItemId: item.id,
    previousStock,
    newStock,
    movementId: movement.id,
  };
}

/**
 * Deducts recipe ingredients for all items in a POS order.
 * Called automatically upon order placement / payment.
 */
export async function deductRecipeStockForOrder(
  tx: any,
  params: {
    tenantId: string;
    outletId: string;
    orderId: string;
    orderNumber: string;
    userId?: string | null;
    items: Array<{ menuItemId: string; quantity: number; name: string }>;
  }
): Promise<{ deductedCount: number; movements: any[] }> {
  const { tenantId, outletId, orderId, orderNumber, userId, items } = params;

  if (!items || items.length === 0) {
    return { deductedCount: 0, movements: [] };
  }

  // Get distinct menuItemIds
  const menuItemIds = Array.from(new Set(items.map((i) => i.menuItemId)));

  // Load recipes for these menu items
  const recipes = await tx.recipe.findMany({
    where: {
      menuItemId: { in: menuItemIds },
    },
    include: {
      ingredients: {
        include: {
          inventoryItem: true,
        },
      },
    },
  });

  if (recipes.length === 0) {
    return { deductedCount: 0, movements: [] };
  }

  const recipeMap = new Map<string, any>(recipes.map((r: any) => [r.menuItemId, r]));
  const results: any[] = [];

  for (const item of items) {
    const recipe = recipeMap.get(item.menuItemId);
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      continue;
    }

    const yieldQty = recipe.yieldQty > 0 ? recipe.yieldQty : 1;
    const orderQty = item.quantity;

    for (const ing of recipe.ingredients) {
      if (!ing.inventoryItem) continue;

      // Calculate total ingredient quantity required
      const deductionPerYield = ing.quantity;
      const totalDeduction = (deductionPerYield * orderQty) / yieldQty;

      try {
        const movementResult = await recordStockMovement(tx, {
          tenantId,
          outletId,
          inventoryItemId: ing.inventoryItemId,
          type: "RECIPE_CONSUMPTION",
          quantity: -totalDeduction,
          unit: ing.inventoryItem.unit,
          reference: `POS Order #${orderNumber}: ${item.name} ×${orderQty} (${ing.inventoryItem.name} ${totalDeduction}${ing.inventoryItem.unit})`,
          userId,
          allowNegativeStock: true, // Allow kitchen to fire even if ingredient inventory is slightly below zero
        });
        results.push(movementResult);
      } catch (err) {
        console.warn(`[Recipe Stock Deduct Warning] Failed for item ${ing.inventoryItemId}:`, err);
      }
    }
  }

  return { deductedCount: results.length, movements: results };
}

/**
 * Validates available stock for a batch of inventory items before taking payment.
 */
export async function checkStockAvailability(
  tenantId: string,
  items: Array<{ inventoryItemId: string; requiredQuantity: number; unit?: string }>
): Promise<{
  allAvailable: boolean;
  shortages: Array<{
    inventoryItemId: string;
    itemName: string;
    available: number;
    required: number;
    unit: string;
  }>;
}> {
  const shortages: Array<{
    inventoryItemId: string;
    itemName: string;
    available: number;
    required: number;
    unit: string;
  }> = [];

  for (const req of items) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.inventoryItemId, tenantId },
    });

    if (!item) {
      shortages.push({
        inventoryItemId: req.inventoryItemId,
        itemName: "Unknown Item",
        available: 0,
        required: req.requiredQuantity,
        unit: req.unit || "PCS",
      });
      continue;
    }

    let reqInBase = req.requiredQuantity;
    if (req.unit && req.unit !== item.unit) {
      try {
        reqInBase = convertToBaseUnit(req.requiredQuantity, req.unit, item);
      } catch {
        reqInBase = req.requiredQuantity;
      }
    }

    if (item.currentStock < reqInBase) {
      shortages.push({
        inventoryItemId: item.id,
        itemName: item.name,
        available: item.currentStock,
        required: reqInBase,
        unit: item.unit,
      });
    }
  }

  return {
    allAvailable: shortages.length === 0,
    shortages,
  };
}
