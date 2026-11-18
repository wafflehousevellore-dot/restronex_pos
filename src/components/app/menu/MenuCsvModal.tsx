"use client";

import React, { useState } from "react";
import { MenuItemData } from "./ProductFormModal";
import { CategoryData } from "./MenuCategorySidebar";
import { X, Download, Upload, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface MenuCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "EXPORT" | "IMPORT";
  items: MenuItemData[];
  categories: CategoryData[];
  onImportItems: (newItems: Array<{
    name: string;
    categoryId: string;
    pricePaise: number;
    isVeg: boolean;
    sku?: string;
    description?: string;
  }>) => Promise<void>;
}

export function MenuCsvModal({
  isOpen,
  onClose,
  mode,
  items,
  categories,
  onImportItems,
}: MenuCsvModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Handle Export
  const handleExport = () => {
    const headers = [
      "Product Name",
      "Category",
      "Price (INR)",
      "Food Classification",
      "SKU",
      "Availability",
      "Active Status",
      "Description",
    ];

    const rows = items.map((it) => [
      `"${it.name.replace(/"/g, '""')}"`,
      `"${(it.category?.name || "General").replace(/"/g, '""')}"`,
      (it.pricePaise / 100).toFixed(2),
      it.isVeg ? "VEG" : "NON_VEG",
      `"${(it.sku || "").replace(/"/g, '""')}"`,
      it.isSoldOut ? "OUT_OF_STOCK" : "IN_STOCK",
      it.isActive ? "ACTIVE" : "INACTIVE",
      `"${(it.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `restronex_menu_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  // Handle File Change for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setValidationErrors(["CSV file is empty or missing headers."]);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("product"));
    const catIdx = headers.findIndex((h) => h.includes("cat"));
    const priceIdx = headers.findIndex((h) => h.includes("price"));
    const vegIdx = headers.findIndex((h) => h.includes("veg") || h.includes("type"));
    const skuIdx = headers.findIndex((h) => h.includes("sku"));

    if (nameIdx === -1 || priceIdx === -1) {
      setValidationErrors(["CSV must contain at least 'Product Name' and 'Price' columns."]);
      return;
    }

    const rows: any[] = [];
    const errors: string[] = [];

    const catMap = new Map<string, string>();
    categories.forEach((c) => catMap.set(c.name.toLowerCase(), c.id));
    const defaultCatId = categories[0]?.id || "";

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      const pName = parts[nameIdx];
      const pPrice = parseFloat(parts[priceIdx]);
      const pCatName = catIdx !== -1 ? parts[catIdx] : "";
      const pVegStr = vegIdx !== -1 ? parts[vegIdx].toUpperCase() : "VEG";
      const pSku = skuIdx !== -1 ? parts[skuIdx] : "";

      if (!pName) {
        errors.push(`Row ${i + 1}: Missing product name.`);
        continue;
      }
      if (isNaN(pPrice) || pPrice < 0) {
        errors.push(`Row ${i + 1}: Invalid price '${parts[priceIdx]}' for product '${pName}'.`);
        continue;
      }

      const categoryId = catMap.get(pCatName.toLowerCase()) || defaultCatId;

      rows.push({
        name: pName,
        categoryId,
        categoryName: pCatName || "Default",
        priceRupees: pPrice,
        pricePaise: Math.round(pPrice * 100),
        isVeg: !pVegStr.includes("NON"),
        sku: pSku || undefined,
      });
    }

    setParsedRows(rows);
    setValidationErrors(errors);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    try {
      await onImportItems(parsedRows);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === "EXPORT" ? (
              <Download className="w-5 h-5 text-[#16845B]" />
            ) : (
              <Upload className="w-5 h-5 text-[#16845B]" />
            )}
            <span className="font-bold text-sm text-slate-900">
              {mode === "EXPORT" ? "Export Restaurant Menu" : "Import Menu from CSV"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {mode === "EXPORT" ? (
            <div className="space-y-3">
              <p className="text-slate-600">
                Download your entire restaurant menu as a structured CSV file, including prices,
                SKUs, food classification, and categories.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                <span className="font-bold block mb-1">Export Summary:</span>
                <p>• {items.length} Products</p>
                <p>• {categories.length} Categories</p>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600">
                Upload a CSV file containing columns for <strong>Product Name</strong>,{" "}
                <strong>Price</strong>, <strong>Category</strong>, and <strong>Veg/Non-Veg</strong>.
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:text-xs file:font-semibold hover:file:bg-slate-100 cursor-pointer"
              />

              {validationErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Validation Notices:
                  </span>
                  {validationErrors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-[11px]">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                  <span className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {parsedRows.length} valid products parsed and ready for import.
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={parsedRows.length === 0 || isProcessing}
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {isProcessing ? "Importing..." : `Import ${parsedRows.length} Products`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
