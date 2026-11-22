/**
 * RESTRO NEX — Comprehensive Verification Test Suite
 * Mobile App PWA + Advanced Inventory & Bulk Sales Engine
 */

import {
  convertToBaseUnit,
  convertFromBaseUnit,
  normalizeUnit,
  formatStockQuantity,
  UnitConversionError,
} from "../src/lib/inventory/unit-conversion";
import {
  calculateBulkSaleTotals,
  generateBulkSaleInvoiceNumber,
} from "../src/lib/inventory/bulk-sales-service";
import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`, details ? details : "");
    failed++;
  }
}

async function runTests() {
  console.log("=========================================================");
  console.log("RESTRO NEX — MOBILE & INVENTORY SUITE VERIFICATION");
  console.log("=========================================================\n");

  // -----------------------------------------------------------------
  // 1. UNIT CONVERSION ENGINE
  // -----------------------------------------------------------------
  console.log("📦 1. Testing Unit Conversion Engine...");

  // Standard metric weight conversions (baseUnit: G)
  const gFromKg = convertToBaseUnit(2.5, "KG", { baseUnit: "G" });
  assert(gFromKg === 2500, "2.5 KG converts to 2500 G (baseUnit: G)");

  const kgFromG = convertFromBaseUnit(1500, "KG", { baseUnit: "G" });
  assert(kgFromG === 1.5, "1500 G converts to 1.5 KG (baseUnit: G)");

  const gFromQuintal = convertToBaseUnit(1, "QUINTAL", { baseUnit: "G" });
  assert(gFromQuintal === 100000, "1 QUINTAL converts to 100,000 G (baseUnit: G)");

  // Standard volume conversions (baseUnit: ML)
  const mlFromL = convertToBaseUnit(3.75, "L", { baseUnit: "ML" });
  assert(mlFromL === 3750, "3.75 L converts to 3750 ML (baseUnit: ML)");

  const lFromMl = convertFromBaseUnit(750, "L", { baseUnit: "ML" });
  assert(lFromMl === 0.75, "750 ML converts to 0.75 L (baseUnit: ML)");

  // Packaging & Count conversions (baseUnit: PCS)
  const pcsFromDoz = convertToBaseUnit(3, "DOZ", { baseUnit: "PCS" });
  assert(pcsFromDoz === 36, "3 DOZ converts to 36 PCS (baseUnit: PCS)");

  // Custom Packaging Conversion Ratios
  // E.g., Item with baseUnit: PCS, purchaseUnit: BOX, ratio 24
  const boxContext = { baseUnit: "PCS", purchaseUnit: "BOX", conversionRatio: 24 };
  const pcsFromBox = convertToBaseUnit(5, "BOX", boxContext);
  assert(pcsFromBox === 120, "5 BOX (ratio 24) converts to 120 PCS");

  const boxesFromPcs = convertFromBaseUnit(120, "BOX", boxContext);
  assert(boxesFromPcs === 5, "120 PCS (ratio 24) converts to 5 BOX");

  // Normalized Unit Aliases
  assert(normalizeUnit("kgs") === "KG", "Alias 'kgs' normalizes to 'KG'");
  assert(normalizeUnit("Liters") === "L", "Alias 'Liters' normalizes to 'L'");
  assert(normalizeUnit("pieces") === "PCS", "Alias 'pieces' normalizes to 'PCS'");

  // Formatting
  assert(formatStockQuantity(2.500, "KG") === "2.5 KG", "Formats 2.500 KG cleanly");
  assert(formatStockQuantity(10, "PCS") === "10 PCS", "Formats 10 PCS cleanly");

  // Incompatible unit conversion error check
  let threwExpected = false;
  try {
    convertToBaseUnit(10, "KG", { baseUnit: "L" });
  } catch (err: any) {
    if (err instanceof UnitConversionError) {
      threwExpected = true;
    }
  }
  assert(threwExpected, "Throws UnitConversionError for incompatible units (KG -> L)");

  // -----------------------------------------------------------------
  // 2. BULK SALES CALCULATION ENGINE
  // -----------------------------------------------------------------
  console.log("\n💰 2. Testing Bulk Sales Calculation & Invoice Engine...");

  // Test Invoice Number Generation
  const invoiceNum = generateBulkSaleInvoiceNumber();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const expectedPrefix = `BS-${year}${month}${day}-`;
  assert(
    invoiceNum.startsWith(expectedPrefix) && /^BS-\d{8}-[A-Z0-9]{4,8}$/.test(invoiceNum),
    `Invoice number format is BS-YYYYMMDD-XXXX (${invoiceNum})`
  );

  // Test Bulk Sale Financial Breakdown
  // Item 1: 10 units @ ₹500 (50000 paise) each = ₹5000 (500000 paise), 5% tax (500 bps), discount ₹200 (20000 paise)
  // Item 2: 2 units @ ₹1200 (120000 paise) each = ₹2400 (240000 paise), 18% tax (1800 bps), discount ₹0
  const calculationResult = calculateBulkSaleTotals({
    items: [
      {
        inventoryItemId: "item_1",
        quantity: 10,
        unitPricePaise: 50000,
        taxRateBps: 500, // 5%
        discountPaise: 20000,
      },
      {
        inventoryItemId: "item_2",
        quantity: 2,
        unitPricePaise: 120000,
        taxRateBps: 1800, // 18%
        discountPaise: 0,
      },
    ],
    overallDiscountPaise: 10000, // ₹100 overall discount
    deliveryChargePaise: 15000,  // ₹150 delivery charge
    packagingChargePaise: 5000,  // ₹50 packaging charge
  });

  // Verification of math:
  // Item 1 gross = 500,000 paise. Discount = 20,000 paise. Net taxable = 480,000 paise.
  // Tax 5% = 24,000 paise (CGST: 12,000, SGST: 12,000). Total = 504,000 paise.
  // Item 2 gross = 240,000 paise. Discount = 0. Net taxable = 240,000 paise.
  // Tax 18% = 43,200 paise (CGST: 21,600, SGST: 21,600). Total = 283,200 paise.
  // Subtotal = 740,000 paise.
  // Line discounts = 20,000 paise. Overall discount = 10,000 paise. Total discount = 30,000 paise.
  // Total tax = 67,200 paise.
  // Additional charges = 15,000 + 5,000 = 20,000 paise.
  // Grand total = (740,000 - 30,000) + 67,200 + 20,000 = 797,200 paise (₹7,972).
  assert(calculationResult.subtotalPaise === 740000, "Subtotal is 740,000 paise (₹7,400)");
  assert(calculationResult.totalDiscountPaise === 30000, "Total discount is 30,000 paise (₹300)");
  assert(calculationResult.taxPaise === 67200, "Total GST is 67,200 paise (₹672)");
  assert(calculationResult.cgstPaise === 33600, "CGST is 33,600 paise (50% of GST)");
  assert(calculationResult.sgstPaise === 33600, "SGST is 33,600 paise (50% of GST)");
  assert(calculationResult.grandTotalPaise === 797200, "Grand total matches exact net payable (₹7,972)");

  // -----------------------------------------------------------------
  // 3. PWA ASSETS & SERVICE WORKER VERIFICATION
  // -----------------------------------------------------------------
  console.log("\n📱 3. Testing PWA Configuration & Safe Caching...");

  const swPath = path.join(__dirname, "../public/sw.js");
  const swExists = fs.existsSync(swPath);
  assert(swExists, "Service worker public/sw.js exists");

  if (swExists) {
    const swContent = fs.readFileSync(swPath, "utf-8");
    assert(
      swContent.includes('startsWith("/api/")') && swContent.includes('startsWith("/sign-in")'),
      "Service worker explicitly bypasses all /api/ and auth routes from cache (no sensitive data cached)"
    );
    assert(
      swContent.includes("skipWaiting") || swContent.includes("SKIP_WAITING"),
      "Service worker supports atomic app update activation"
    );
  }

  const manifestPath = path.join(__dirname, "../src/app/manifest.ts");
  const manifestExists = fs.existsSync(manifestPath);
  assert(manifestExists, "App manifest generator src/app/manifest.ts exists");

  // -----------------------------------------------------------------
  // 4. SUMMARY
  // -----------------------------------------------------------------
  console.log("\n=========================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
