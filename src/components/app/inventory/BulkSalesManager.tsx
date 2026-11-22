"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  Plus,
  Search,
  Barcode,
  Printer,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  RotateCcw,
  Calendar,
  CreditCard,
  User,
  Phone,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { BarcodeScannerModal } from "@/components/ui/BarcodeScannerModal";
import { BulkSaleInvoiceModal } from "./BulkSaleInvoiceModal";

interface BulkSalesManagerProps {
  outlets: any[];
  selectedOutlet: string;
}

export function BulkSalesManager({ outlets, selectedOutlet }: BulkSalesManagerProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Sale Dialog State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [formOutletId, setFormOutletId] = useState(selectedOutlet || (outlets[0]?.id || ""));
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "CREDIT" | "BANK_TRANSFER">("CASH");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PENDING">("PAID");
  const [notes, setNotes] = useState("");

  // Line items state
  const [lineItems, setLineItems] = useState<
    Array<{
      inventoryItemId: string;
      productName: string;
      availableStock: number;
      quantity: number;
      sellingUnit: string;
      unitPricePaise: number;
      discountPaise: number;
      taxRateBps: number;
    }>
  >([]);

  // Barcode Scanner Modal
  const [showScanner, setShowScanner] = useState(false);

  // View Invoice Modal
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<any | null>(null);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedOutlet, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedOutlet && selectedOutlet !== "ALL") q.set("outletId", selectedOutlet);
      if (statusFilter && statusFilter !== "ALL") q.set("status", statusFilter);

      const [salesRes, itemsRes] = await Promise.all([
        apiFetch(`/api/inventory/bulk-sales?${q.toString()}`).then((r) => r.json()).catch(() => []),
        apiFetch(`/api/inventory?outletId=${selectedOutlet || "ALL"}`).then((r) => r.json()).catch(() => ({ items: [] })),
      ]);

      if (Array.isArray(salesRes)) setSales(salesRes);
      if (itemsRes?.items && Array.isArray(itemsRes.items)) {
        setInventoryItems(itemsRes.items);
      }
    } catch (err) {
      console.warn("[BulkSalesManager Load Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormOutletId(selectedOutlet || (outlets[0]?.id || ""));
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGstin("");
    setCustomerAddress("");
    setPaymentMethod("CASH");
    setPaymentStatus("PAID");
    setNotes("");
    setErrorMsg(null);

    // Initialize with 1 empty line item if available
    if (inventoryItems.length > 0) {
      const first = inventoryItems[0];
      setLineItems([
        {
          inventoryItemId: first.id,
          productName: first.name,
          availableStock: first.currentStock,
          quantity: 1,
          sellingUnit: first.sellingUnit || first.unit,
          unitPricePaise: first.sellingPricePaise || first.costPerUnitPaise || 0,
          discountPaise: 0,
          taxRateBps: first.taxRateBps || 0,
        },
      ]);
    } else {
      setLineItems([]);
    }
    setShowCreateModal(true);
  };

  const handleAddLineItem = () => {
    if (inventoryItems.length === 0) return;
    const first = inventoryItems[0];
    setLineItems((prev) => [
      ...prev,
      {
        inventoryItemId: first.id,
        productName: first.name,
        availableStock: first.currentStock,
        quantity: 1,
        sellingUnit: first.sellingUnit || first.unit,
        unitPricePaise: first.sellingPricePaise || first.costPerUnitPaise || 0,
        discountPaise: 0,
        taxRateBps: first.taxRateBps || 0,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemSelectChange = (index: number, itemId: string) => {
    const it = inventoryItems.find((i) => i.id === itemId);
    if (!it) return;

    setLineItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              inventoryItemId: it.id,
              productName: it.name,
              availableStock: it.currentStock,
              sellingUnit: it.sellingUnit || it.unit,
              unitPricePaise: it.sellingPricePaise || it.costPerUnitPaise || 0,
              taxRateBps: it.taxRateBps || 0,
            }
          : row
      )
    );
  };

  const handleLineFieldChange = (index: number, field: string, val: any) => {
    setLineItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  // Barcode scanned callback
  const handleBarcodeScanned = async (code: string) => {
    try {
      const res = await apiFetch(`/api/inventory/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data.found && data.item) {
        const it = data.item;
        setLineItems((prev) => [
          ...prev,
          {
            inventoryItemId: it.id,
            productName: it.name,
            availableStock: it.currentStock,
            quantity: 1,
            sellingUnit: it.sellingUnit || it.unit,
            unitPricePaise: it.sellingPricePaise || it.costPerUnitPaise || 0,
            discountPaise: 0,
            taxRateBps: it.taxRateBps || 0,
          },
        ]);
      } else {
        setErrorMsg(`No inventory product found matching barcode '${code}'.`);
      }
    } catch {
      setErrorMsg("Error searching scanned barcode.");
    }
  };

  // Totals Calculation
  const subtotalPaise = lineItems.reduce((acc, row) => acc + Math.round(row.quantity * row.unitPricePaise), 0);
  const totalDiscountPaise = lineItems.reduce((acc, row) => acc + (row.discountPaise || 0), 0);
  const totalTaxPaise = lineItems.reduce((acc, row) => {
    const lineSubtotal = Math.round(row.quantity * row.unitPricePaise);
    const taxable = Math.max(0, lineSubtotal - (row.discountPaise || 0));
    return acc + Math.round((taxable * (row.taxRateBps || 0)) / 10000);
  }, 0);
  const grandTotalPaise = Math.max(0, subtotalPaise - totalDiscountPaise + totalTaxPaise);

  const handleSubmitBulkSale = async (isDraft: boolean) => {
    if (lineItems.length === 0) {
      return setErrorMsg("Please add at least one product to the sale.");
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/inventory/bulk-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: formOutletId || selectedOutlet,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          customerGstin: customerGstin.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          paymentMethod,
          paymentStatus,
          notes: notes.trim() || undefined,
          isDraft,
          items: lineItems.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantity: l.quantity,
            sellingUnit: l.sellingUnit,
            unitPricePaise: l.unitPricePaise,
            discountPaise: l.discountPaise,
            taxRateBps: l.taxRateBps,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record bulk sale");

      setShowCreateModal(false);
      loadData();

      // Open invoice modal for immediate printing
      if (data.bulkSale) {
        setSelectedSaleForInvoice({
          ...data.bulkSale,
          items: lineItems,
          outlet: outlets.find((o) => o.id === formOutletId),
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete bulk sale");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefundOrCancel = async (saleId: string, action: "CANCEL" | "REFUND") => {
    const reason = prompt(`Enter reason for ${action === "CANCEL" ? "cancellation" : "refund"}:`);
    if (!reason || !reason.trim()) return;

    setActionLoadingId(saleId);
    try {
      const res = await apiFetch("/api/inventory/bulk-sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulkSaleId: saleId,
          action,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reverse sale");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to process reversal");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.invoiceNumber?.toLowerCase().includes(q) ||
      s.customerName?.toLowerCase().includes(q) ||
      s.customerPhone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="rounded-3xl border border-[#E5EBE7] bg-white p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800">
              Direct Inventory Sales
            </span>
            <span className="text-xs text-gray-500">• B2B &amp; Direct Stock Orders</span>
          </div>
          <h2 className="text-xl font-black text-[#172B25] tracking-tight">Bulk Stock Sales</h2>
          <p className="text-xs text-gray-600 max-w-xl">
            Sell available raw inventory products directly in bulk with instant unit conversions, automatic stock ledger deduction, and tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Bulk Sale
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 ml-1" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer name, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-gray-800 placeholder-gray-400 bg-transparent outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DRAFT">Draft</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={loadData}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Sales Table */}
      <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#16845B]" />
                    Loading bulk sales records...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Store className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-gray-700">No bulk sales recorded yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Click "+ New Bulk Sale" to create your first direct stock invoice.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#172B25]">
                      <button
                        onClick={() => setSelectedSaleForInvoice(sale)}
                        className="text-orange-600 hover:underline cursor-pointer"
                      >
                        {sale.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      {new Date(sale.saleDate || sale.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-800">{sale.customerName || "Walk-in"}</div>
                      {sale.customerPhone && (
                        <div className="text-[11px] text-gray-500 font-mono">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      {sale.items?.map((it: any) => `${it.productName} (${it.quantity}${it.sellingUnit})`).join(", ") || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900">
                      {formatINR(sale.totalPaise)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800">
                        {sale.paymentMethod || "CASH"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          sale.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800"
                            : sale.status === "DRAFT"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                          title="View & Print Invoice"
                        >
                          <Printer className="w-4 h-4 text-orange-600" />
                        </button>

                        {sale.status === "CONFIRMED" && (
                          <button
                            onClick={() => handleRefundOrCancel(sale.id, "REFUND")}
                            disabled={actionLoadingId === sale.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                            title="Refund & Restore Stock"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BULK SALE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-gray-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#172B25]">Create Direct Bulk Inventory Sale</h3>
                  <p className="text-xs text-gray-500">Atomic stock deduction with itemized GST invoice</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-gray-700">
              {/* Customer & Branch Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-gray-50/70 border border-gray-200">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Customer / Business Name (Walk-in)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Customer Phone</label>
                  <input
                    type="tel"
                    placeholder="Customer Mobile (e.g. 9876543210)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Customer GSTIN (Optional B2B)</label>
                  <input
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Fulfilling Outlet Branch</label>
                  <select
                    value={formOutletId}
                    onChange={(e) => setFormOutletId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products to Sell */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm text-[#172B25] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-600" />
                    Products to Sell ({lineItems.length})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                      Scan Barcode
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {lineItems.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-gray-200 bg-white shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                    >
                      {/* Product select */}
                      <div className="sm:col-span-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase text-gray-500">Inventory Item</label>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            Stock: {row.availableStock}
                          </span>
                        </div>
                        <select
                          value={row.inventoryItemId}
                          onChange={(e) => handleItemSelectChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 font-bold text-xs"
                        >
                          {inventoryItems.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} ({it.currentStock} {it.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={row.quantity}
                          onChange={(e) => handleLineFieldChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-300 font-mono font-bold text-xs"
                        />
                      </div>

                      {/* Unit */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Unit</label>
                        <input
                          type="text"
                          value={row.sellingUnit}
                          onChange={(e) => handleLineFieldChange(idx, "sellingUnit", e.target.value.toUpperCase())}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-300 font-mono text-xs uppercase"
                        />
                      </div>

                      {/* Unit Price (₹) */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Price (₹)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={row.unitPricePaise / 100}
                          onChange={(e) =>
                            handleLineFieldChange(idx, "unitPricePaise", Math.round(parseFloat(e.target.value || "0") * 100))
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-300 font-mono text-xs"
                        />
                      </div>

                      {/* Line Total & Remove */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pb-1">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block font-normal">Line Total</span>
                          <span className="font-mono font-black text-gray-900 text-xs">
                            {formatINR(Math.round(row.quantity * row.unitPricePaise))}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details & Summary */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Payment Tender</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold"
                    >
                      <option value="CASH">Cash Payment</option>
                      <option value="UPI">UPI / QR Transfer</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="CREDIT">Customer Credit Ledger</option>
                      <option value="BANK_TRANSFER">Bank Wire / NEFT</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-300 bg-white font-bold"
                    >
                      <option value="PAID">Full Payment Received</option>
                      <option value="PENDING">Pending Settlement</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-right font-medium">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">{formatINR(subtotalPaise)}</span>
                  </div>
                  {totalDiscountPaise > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-mono font-bold">-{formatINR(totalDiscountPaise)}</span>
                    </div>
                  )}
                  {totalTaxPaise > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Taxes:</span>
                      <span className="font-mono font-bold">{formatINR(totalTaxPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-orange-600 text-lg">{formatINR(grandTotalPaise)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSubmitBulkSale(true)}
                disabled={submitting || lineItems.length === 0}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition cursor-pointer disabled:opacity-50"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => handleSubmitBulkSale(false)}
                disabled={submitting || lineItems.length === 0}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Sale &amp; Deduct Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
        title="Scan Product to Add"
      />

      {/* Invoice Modal */}
      {selectedSaleForInvoice && (
        <BulkSaleInvoiceModal
          sale={selectedSaleForInvoice}
          isOpen={Boolean(selectedSaleForInvoice)}
          onClose={() => setSelectedSaleForInvoice(null)}
        />
      )}
    </div>
  );
}
