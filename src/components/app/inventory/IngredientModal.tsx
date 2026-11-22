"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Boxes, 
  Check, 
  AlertCircle, 
  Barcode, 
  Layers, 
  Scale, 
  DollarSign, 
  Calendar,
  Building2
} from "lucide-react";
import { toPaise } from "@/lib/money";
import { BarcodeScannerModal } from "@/components/ui/BarcodeScannerModal";

interface IngredientModalProps {
  item: any | null; // null if creating
  suppliers: any[];
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
}

export function IngredientModal({
  item,
  suppliers,
  onClose,
  onSave,
}: IngredientModalProps) {
  const isEditing = Boolean(item);

  // Core Info
  const [name, setName] = useState(item?.name || "");
  const [sku, setSku] = useState(item?.sku || "");
  const [barcode, setBarcode] = useState(item?.barcode || "");
  const [category, setCategory] = useState(item?.category || "Produce");
  const [description, setDescription] = useState(item?.description || "");

  // Units & Conversion
  const [unit, setUnit] = useState(item?.unit || "KG");
  const [baseUnit, setBaseUnit] = useState(item?.baseUnit || item?.unit || "KG");
  const [purchaseUnit, setPurchaseUnit] = useState(item?.purchaseUnit || "");
  const [sellingUnit, setSellingUnit] = useState(item?.sellingUnit || "");
  const [conversionRatio, setConversionRatio] = useState(String(item?.conversionRatio || "1"));

  // Stock & Thresholds
  const [currentStock, setCurrentStock] = useState(String(item?.currentStock || "0"));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(item?.lowStockThreshold || "5"));
  const [reorderLevel, setReorderLevel] = useState(item?.reorderLevel ? String(item.reorderLevel) : "");

  // Pricing & Taxes
  const [costRupees, setCostRupees] = useState(
    item?.costPerUnitPaise ? String(item.costPerUnitPaise / 100) : "0"
  );
  const [sellingRupees, setSellingRupees] = useState(
    item?.sellingPricePaise ? String(item.sellingPricePaise / 100) : ""
  );
  const [taxRateBps, setTaxRateBps] = useState(String(item?.taxRateBps || "0"));

  // Logistics & Tracking
  const [supplierId, setSupplierId] = useState(item?.supplierId || item?.lowestSupplierPrice?.supplierId || "");
  const [expiryDate, setExpiryDate] = useState(
    item?.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : ""
  );
  const [batchNumber, setBatchNumber] = useState(item?.batchNumber || "");
  const [isActive, setIsActive] = useState(item?.isActive !== undefined ? item.isActive : true);

  // Scanner modal
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setSku(item.sku || "");
      setBarcode(item.barcode || "");
      setCategory(item.category || "Produce");
      setDescription(item.description || "");
      setUnit(item.unit || "KG");
      setBaseUnit(item.baseUnit || item.unit || "KG");
      setPurchaseUnit(item.purchaseUnit || "");
      setSellingUnit(item.sellingUnit || "");
      setConversionRatio(String(item.conversionRatio || "1"));
      setCurrentStock(String(item.currentStock || "0"));
      setLowStockThreshold(String(item.lowStockThreshold || "5"));
      setReorderLevel(item.reorderLevel ? String(item.reorderLevel) : "");
      setCostRupees(item.costPerUnitPaise ? String(item.costPerUnitPaise / 100) : "0");
      setSellingRupees(item.sellingPricePaise ? String(item.sellingPricePaise / 100) : "");
      setTaxRateBps(String(item.taxRateBps || "0"));
      setSupplierId(item.supplierId || item.lowestSupplierPrice?.supplierId || "");
      setExpiryDate(item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "");
      setBatchNumber(item.batchNumber || "");
      setIsActive(item.isActive !== undefined ? item.isActive : true);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product/Ingredient name is required");
      return;
    }

    const stockNum = parseFloat(currentStock);
    const thresholdNum = parseFloat(lowStockThreshold);
    const costPaise = toPaise(parseFloat(costRupees || "0"));
    const sellingPaise = sellingRupees ? toPaise(parseFloat(sellingRupees)) : null;

    if (isNaN(stockNum) || stockNum < 0) {
      setError("Please specify a valid stock quantity");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const ok = await onSave({
        id: item?.id,
        name: name.trim(),
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        category: category.trim() || "General",
        description: description.trim() || undefined,
        unit: unit.toUpperCase(),
        baseUnit: baseUnit.toUpperCase(),
        purchaseUnit: purchaseUnit.trim().toUpperCase() || undefined,
        sellingUnit: sellingUnit.trim().toUpperCase() || undefined,
        conversionRatio: parseFloat(conversionRatio) || 1,
        currentStock: stockNum,
        lowStockThreshold: isNaN(thresholdNum) ? 5 : thresholdNum,
        reorderLevel: reorderLevel ? parseFloat(reorderLevel) : undefined,
        costPerUnitPaise: costPaise,
        purchasePricePaise: costPaise,
        sellingPricePaise: sellingPaise || undefined,
        taxRateBps: parseInt(taxRateBps, 10) || 0,
        supplierId: supplierId || undefined,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        batchNumber: batchNumber.trim() || undefined,
        isActive,
      });

      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save product/ingredient");
    } finally {
      setLoading(false);
    }
  };

  const standardUnits = ["KG", "G", "L", "ML", "PCS", "PKT", "BOX", "BTL", "CTN", "DOZ"];
  const categoriesList = [
    "Produce & Vegetables",
    "Dairy & Cheese",
    "Meat & Poultry",
    "Grains & Flour",
    "Spices & Seasonings",
    "Oils & Sauces",
    "Bakery & Bread",
    "Beverages",
    "Packaging & Disposables",
    "General Inventory",
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E5EBE7] flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#16845B]/10 text-[#16845B]">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#172B25]">
                {isEditing ? `Edit ${item?.name}` : "New Inventory Item / Product"}
              </h3>
              <p className="text-xs text-[#718078]">Stock material, unit conversion &amp; bulk sale parameters</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-200 text-[#718078] hover:text-[#172B25] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3.5 bg-red-50 border-b border-red-200 flex items-center gap-2 text-xs font-semibold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-gray-700">
          {/* Section 1: Basic Product Information */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#16845B]" />
              Basic Identification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-gray-700">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Basmati Rice 1121, Whole Milk, Chicken Breast"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-xs bg-white"
                >
                  {categoriesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">SKU / Item Code</label>
                <input
                  type="text"
                  placeholder="e.g. RAW-RICE-01"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono text-xs"
                />
              </div>

              {/* Barcode field with Scan button */}
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-gray-700 flex items-center justify-between">
                  <span>Barcode (EAN-13 / Code-128 / QR)</span>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="text-[#16845B] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Barcode className="w-3.5 h-3.5" />
                    Scan with Camera
                  </button>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scan or enter barcode numbers..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 font-bold transition flex items-center gap-1"
                  >
                    <Barcode className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Units & Unit Conversion */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              Units &amp; Conversion Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">
                  Base Inventory Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setBaseUnit(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold bg-white"
                >
                  {standardUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500">Unit stored in physical ledger</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Purchase Inward Unit</label>
                <input
                  type="text"
                  placeholder="e.g. BAG, BOX, CTN"
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono uppercase"
                />
                <span className="text-[10px] text-gray-500">From supplier invoices</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Bulk Selling Unit</label>
                <input
                  type="text"
                  placeholder="e.g. GRAM, PACKET, KG"
                  value={sellingUnit}
                  onChange={(e) => setSellingUnit(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono uppercase"
                />
                <span className="text-[10px] text-gray-500">Default for bulk sales</span>
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="font-bold text-gray-700">
                  Custom Packaging Conversion Ratio
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold">1 {purchaseUnit || "Pack"} =</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0.000001"
                    value={conversionRatio}
                    onChange={(e) => setConversionRatio(e.target.value)}
                    className="w-32 px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold"
                  />
                  <span className="text-gray-700 font-bold">{unit} (Base)</span>
                </div>
                <span className="text-[10px] text-gray-500">
                  Standard metric units (1 KG = 1000 G, 1 L = 1000 ML) convert automatically. Use this ratio for custom bulk packaging.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Stock Levels & Valuation */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Stock Levels &amp; Valuation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">
                  {isEditing ? "Current Stock Level" : "Initial Opening Stock"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Reorder Level Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Optional target level"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Cost Price per {unit} (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costRupees}
                  onChange={(e) => setCostRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Bulk Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price for direct sales"
                  value={sellingRupees}
                  onChange={(e) => setSellingRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-orange-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Applicable GST Rate</label>
                <select
                  value={taxRateBps}
                  onChange={(e) => setTaxRateBps(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold bg-white"
                >
                  <option value="0">0% (Nil / Exempted)</option>
                  <option value="500">5% GST (2.5% CGST + 2.5% SGST)</option>
                  <option value="1200">12% GST (6% CGST + 6% SGST)</option>
                  <option value="1800">18% GST (9% CGST + 9% SGST)</option>
                  <option value="2800">28% GST</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Supplier & Batch Logistics */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              Supplier &amp; Expiry Logistics
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Primary Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold bg-white"
                >
                  <option value="">No Assigned Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Batch / Lot Number</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-2026-X1"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5EBE7] flex items-center justify-between bg-gray-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{isEditing ? "Save Product Changes" : "Create Inventory Item"}</span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => setBarcode(code)}
        title="Scan Item Barcode"
      />
    </div>
  );
}
