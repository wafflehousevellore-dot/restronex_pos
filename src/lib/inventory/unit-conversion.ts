/**
 * RestroNex Unit Conversion Engine
 * Supports metric weight, volume, discrete count, and custom packaging conversion ratios.
 */

export type StandardUnit =
  | "KG"
  | "G"
  | "MG"
  | "QUINTAL"
  | "L"
  | "ML"
  | "PCS"
  | "PKT"
  | "BOX"
  | "BTL"
  | "CTN"
  | "DOZ";

export type UnitCategory = "WEIGHT" | "VOLUME" | "COUNT" | "CUSTOM";

interface UnitDefinition {
  code: string;
  name: string;
  category: UnitCategory;
  factorToBase: number; // Factor to convert this unit to the category base unit (KG, L, or PCS)
}

const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  // Weight (Base: KG)
  KG: { code: "KG", name: "Kilogram", category: "WEIGHT", factorToBase: 1 },
  KGS: { code: "KG", name: "Kilogram", category: "WEIGHT", factorToBase: 1 },
  G: { code: "G", name: "Gram", category: "WEIGHT", factorToBase: 0.001 },
  GM: { code: "G", name: "Gram", category: "WEIGHT", factorToBase: 0.001 },
  GRAM: { code: "G", name: "Gram", category: "WEIGHT", factorToBase: 0.001 },
  GRAMS: { code: "G", name: "Gram", category: "WEIGHT", factorToBase: 0.001 },
  MG: { code: "MG", name: "Milligram", category: "WEIGHT", factorToBase: 0.000001 },
  QUINTAL: { code: "QUINTAL", name: "Quintal (100 KG)", category: "WEIGHT", factorToBase: 100 },

  // Volume (Base: L)
  L: { code: "L", name: "Litre", category: "VOLUME", factorToBase: 1 },
  LTR: { code: "L", name: "Litre", category: "VOLUME", factorToBase: 1 },
  LITRE: { code: "L", name: "Litre", category: "VOLUME", factorToBase: 1 },
  LITRES: { code: "L", name: "Litre", category: "VOLUME", factorToBase: 1 },
  LITER: { code: "L", name: "Litre", category: "VOLUME", factorToBase: 1 },
  LITERS: { code: "L", name: "Litre", category: "VOLUME", factorToBase: 1 },
  ML: { code: "ML", name: "Millilitre", category: "VOLUME", factorToBase: 0.001 },

  // Discrete Count (Base: PCS)
  PCS: { code: "PCS", name: "Piece", category: "COUNT", factorToBase: 1 },
  PIECE: { code: "PCS", name: "Piece", category: "COUNT", factorToBase: 1 },
  PIECES: { code: "PCS", name: "Piece", category: "COUNT", factorToBase: 1 },
  DOZ: { code: "DOZ", name: "Dozen (12 pcs)", category: "COUNT", factorToBase: 12 },
  DOZEN: { code: "DOZ", name: "Dozen (12 pcs)", category: "COUNT", factorToBase: 12 },
  PKT: { code: "PKT", name: "Packet", category: "COUNT", factorToBase: 1 },
  PACKET: { code: "PKT", name: "Packet", category: "COUNT", factorToBase: 1 },
  BOX: { code: "BOX", name: "Box", category: "COUNT", factorToBase: 1 },
  BTL: { code: "BTL", name: "Bottle", category: "COUNT", factorToBase: 1 },
  BOTTLE: { code: "BTL", name: "Bottle", category: "COUNT", factorToBase: 1 },
  CTN: { code: "CTN", name: "Carton", category: "COUNT", factorToBase: 1 },
  CARTON: { code: "CTN", name: "Carton", category: "COUNT", factorToBase: 1 },
};

export interface InventoryItemUnitContext {
  unit?: string | null;
  baseUnit?: string | null;
  purchaseUnit?: string | null;
  sellingUnit?: string | null;
  conversionRatio?: number | null;
}

export class UnitConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitConversionError";
  }
}

/**
 * Standardize unit string representation (e.g. "kg" -> "KG", "grams" -> "G")
 */
export function normalizeUnit(rawUnit?: string | null): string {
  if (!rawUnit) return "PCS";
  const clean = rawUnit.trim().toUpperCase();
  const def = UNIT_DEFINITIONS[clean];
  return def ? def.code : clean;
}

/**
 * Convert an input quantity from a source unit into the inventory item's authoritative base unit.
 *
 * Example:
 * Base unit: KG. Sold: 500 grams.
 * convertToBaseUnit(500, "G", { baseUnit: "KG" }) => 0.5 (kg)
 *
 * Example with custom packaging ratio:
 * Base unit: PCS. Purchase unit: BOX. conversionRatio: 24 (24 pcs per box).
 * convertToBaseUnit(2, "BOX", { baseUnit: "PCS", purchaseUnit: "BOX", conversionRatio: 24 }) => 48 (pcs)
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: string,
  context: InventoryItemUnitContext
): number {
  if (quantity === 0) return 0;
  if (isNaN(quantity)) throw new UnitConversionError("Invalid numerical quantity for unit conversion");

  const normalizedFrom = normalizeUnit(fromUnit);
  const baseUnit = normalizeUnit(context.baseUnit || context.unit || "KG");

  // Same unit: identity conversion
  if (normalizedFrom === baseUnit) {
    return quantity;
  }

  // Check custom packaging conversion ratio on the item
  const purchaseUnit = context.purchaseUnit ? normalizeUnit(context.purchaseUnit) : null;
  const sellingUnit = context.sellingUnit ? normalizeUnit(context.sellingUnit) : null;
  const customRatio = context.conversionRatio && context.conversionRatio > 0 ? context.conversionRatio : null;

  if (customRatio) {
    // If fromUnit matches purchase unit, multiply by conversion ratio
    // e.g. 1 Box = 24 Pieces -> 2 Boxes = 48 Pieces
    if (purchaseUnit && normalizedFrom === purchaseUnit) {
      return quantity * customRatio;
    }
    // If fromUnit matches selling unit, divide by conversion ratio (or apply custom ratio)
    // e.g. selling unit = 100g portion -> conversionRatio 10 portions per KG
    if (sellingUnit && normalizedFrom === sellingUnit) {
      return quantity / customRatio;
    }
  }

  // Check standard metric conversion definitions
  const defFrom = UNIT_DEFINITIONS[normalizedFrom];
  const defBase = UNIT_DEFINITIONS[baseUnit];

  if (defFrom && defBase) {
    if (defFrom.category !== defBase.category) {
      throw new UnitConversionError(
        `Cannot convert incompatible units: '${normalizedFrom}' (${defFrom.category}) to '${baseUnit}' (${defBase.category}). Configure a custom conversion ratio.`
      );
    }

    // Convert: (quantity * fromFactor) / baseFactor
    const valueInCategoryBase = quantity * defFrom.factorToBase;
    const valueInTargetBase = valueInCategoryBase / defBase.factorToBase;
    return Number(valueInTargetBase.toFixed(6));
  }

  // If one unit is unknown or no standard conversion exists
  throw new UnitConversionError(
    `No unit conversion rule found between '${fromUnit}' and item base unit '${baseUnit}'. Please specify conversion ratio.`
  );
}

/**
 * Convert a base unit quantity into a specified display/selling unit.
 */
export function convertFromBaseUnit(
  baseQuantity: number,
  toUnit: string,
  context: InventoryItemUnitContext
): number {
  if (baseQuantity === 0) return 0;
  if (isNaN(baseQuantity)) throw new UnitConversionError("Invalid numerical quantity");

  const normalizedTo = normalizeUnit(toUnit);
  const baseUnit = normalizeUnit(context.baseUnit || context.unit || "KG");

  if (normalizedTo === baseUnit) {
    return baseQuantity;
  }

  const purchaseUnit = context.purchaseUnit ? normalizeUnit(context.purchaseUnit) : null;
  const sellingUnit = context.sellingUnit ? normalizeUnit(context.sellingUnit) : null;
  const customRatio = context.conversionRatio && context.conversionRatio > 0 ? context.conversionRatio : null;

  if (customRatio) {
    if (purchaseUnit && normalizedTo === purchaseUnit) {
      return baseQuantity / customRatio;
    }
    if (sellingUnit && normalizedTo === sellingUnit) {
      return baseQuantity * customRatio;
    }
  }

  const defBase = UNIT_DEFINITIONS[baseUnit];
  const defTo = UNIT_DEFINITIONS[normalizedTo];

  if (defBase && defTo) {
    if (defBase.category !== defTo.category) {
      throw new UnitConversionError(
        `Cannot convert incompatible units: '${baseUnit}' (${defBase.category}) to '${normalizedTo}' (${defTo.category}).`
      );
    }

    const valueInCatBase = baseQuantity * defBase.factorToBase;
    const valueInTarget = valueInCatBase / defTo.factorToBase;
    return Number(valueInTarget.toFixed(6));
  }

  throw new UnitConversionError(`Unknown conversion from '${baseUnit}' to '${toUnit}'.`);
}

/**
 * Returns formatted string representation with unit
 */
export function formatStockQuantity(qty: number, unit?: string | null): string {
  const norm = normalizeUnit(unit);
  const rounded = Number(qty.toFixed(3));
  return `${rounded} ${norm}`;
}
