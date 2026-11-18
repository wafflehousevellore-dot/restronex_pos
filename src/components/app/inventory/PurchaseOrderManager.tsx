"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatINR, toPaise } from "@/lib/money";
import { 
  ShoppingBag, 
  Plus, 
  Check, 
  X, 
  Printer, 
  Trash2, 
  Clock, 
  PackageCheck, 
  AlertCircle, 
  Search, 
  FileText 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PurchaseOrderManagerProps {
  suppliers: any[];
  inventoryItems: any[];
  onStockUpdated: () => void;
}

export function PurchaseOrderManager({
  suppliers,
  inventoryItems,
  onStockUpdated,
}: PurchaseOrderManagerProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // New PO Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poDeliveryDate, setPoDeliveryDate] = useState("");
  const [poLines, setPoLines] = useState<
    { inventoryItemId: string; quantity: string; unitPriceRupees: string }[]
  >([]);

  // Goods Receipt Modal
  const [receivingPo, setReceivingPo] = useState<any | null>(null);
  const [receivedQtyMap, setReceivedQtyMap] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== "ALL") q.set("status", statusFilter);

      const res = await apiFetch(`/api/purchases?${q.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch {
      setToast({ type: "error", text: "Failed to load purchase orders" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setPoSupplierId(suppliers[0]?.id || "");
    setPoNotes("");
    setPoDeliveryDate(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    if (inventoryItems.length > 0) {
      const first = inventoryItems[0];
      setPoLines([
        {
          inventoryItemId: first.id,
          quantity: "10",
          unitPriceRupees: String((first.costPerUnitPaise || 0) / 100),
        },
      ]);
    } else {
      setPoLines([]);
    }
    setShowCreateModal(true);
  };

  // Add line to PO
  const handleAddLine = () => {
    const first = inventoryItems[0];
    if (!first) return;
    setPoLines((prev) => [
      ...prev,
      {
        inventoryItemId: first.id,
        quantity: "5",
        unitPriceRupees: String((first.costPerUnitPaise || 0) / 100),
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setPoLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: string, val: string) => {
    setPoLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      // Auto-populate price if ingredient changed
      if (field === "inventoryItemId") {
        const item = inventoryItems.find((i) => i.id === val);
        if (item) {
          next[idx].unitPriceRupees = String((item.costPerUnitPaise || 0) / 100);
        }
      }
      return next;
    });
  };

  // Computed total for new PO
  const computedPoTotalPaise = useMemo(() => {
    let sum = 0;
    poLines.forEach((l) => {
      const q = parseFloat(l.quantity || "0") || 0;
      const p = parseFloat(l.unitPriceRupees || "0") || 0;
      sum += toPaise(q * p);
    });
    return sum;
  }, [poLines]);

  // Submit PO
  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId) {
      setToast({ type: "error", text: "Please select a supplier." });
      return;
    }

    const validItems = poLines
      .filter((l) => l.inventoryItemId && parseFloat(l.quantity) > 0)
      .map((l) => {
        const inv = inventoryItems.find((i) => i.id === l.inventoryItemId);
        const qty = parseFloat(l.quantity);
        const price = parseFloat(l.unitPriceRupees || "0");
        return {
          inventoryItemId: l.inventoryItemId,
          name: inv?.name || "Item",
          unit: inv?.unit || "KG",
          quantity: qty,
          unitPricePaise: toPaise(price),
          subtotalPaise: toPaise(qty * price),
        };
      });

    if (validItems.length === 0) {
      setToast({ type: "error", text: "Add at least one ingredient line." });
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiFetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: poSupplierId,
          totalPaise: computedPoTotalPaise,
          items: validItems,
          notes: poNotes,
          expectedDeliveryDate: poDeliveryDate,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        setToast({ type: "error", text: j.error || "Failed to create PO" });
      } else {
        setToast({ type: "success", text: `PO #${j.purchaseOrder?.poNumber} generated successfully` });
        setShowCreateModal(false);
        loadOrders();
      }
    } catch {
      setToast({ type: "error", text: "Error creating purchase order" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Receive Goods dialog
  const handleOpenReceive = (po: any) => {
    setReceivingPo(po);
    const initialMap: Record<string, string> = {};
    (po.items || []).forEach((item: any) => {
      initialMap[item.inventoryItemId] = String(item.quantity || "1");
    });
    setReceivedQtyMap(initialMap);
  };

  // Confirm Goods Receipt
  const handleConfirmReceive = async () => {
    if (!receivingPo) return;

    setActionLoading(true);
    try {
      const receivedItems = (receivingPo.items || []).map((it: any) => ({
        inventoryItemId: it.inventoryItemId,
        name: it.name,
        unit: it.unit,
        quantity: parseFloat(receivedQtyMap[it.inventoryItemId] || String(it.quantity || "0")),
      }));

      const res = await apiFetch("/api/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECEIVE_PO",
          poId: receivingPo.id,
          receivedItems,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        setToast({ type: "error", text: j.error || "Failed to receive goods" });
      } else {
        setToast({ type: "success", text: `PO #${receivingPo.poNumber} goods received into stock!` });
        setReceivingPo(null);
        loadOrders();
        onStockUpdated();
      }
    } catch {
      setToast({ type: "error", text: "Error confirming goods receipt" });
    } finally {
      setActionLoading(false);
    }
  };

  // Print PO
  const handlePrintPo = (po: any) => {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Purchase Order ${po.poNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #172B25; }
            h2 { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f4f6f5; }
            .total { font-weight: bold; font-size: 14px; text-align: right; margin-top: 16px; }
          </style>
        </head>
        <body>
          <h2>PURCHASE ORDER: ${po.poNumber}</h2>
          <div>Supplier: <strong>${po.supplier?.name}</strong></div>
          <div>Phone: ${po.supplier?.phone || "N/A"}</div>
          <div>Date: ${new Date(po.createdAt).toLocaleDateString()}</div>
          ${po.expectedDeliveryDate ? `<div>Expected Delivery: ${po.expectedDeliveryDate}</div>` : ""}
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              ${(po.items || []).map((it: any) => `
                <tr>
                  <td>${it.name}</td>
                  <td>${it.quantity} ${it.unit}</td>
                  <td>${formatINR(it.unitPricePaise)}</td>
                  <td>${formatINR(it.subtotalPaise)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="total">Total PO Amount: ${formatINR(po.totalPaise)}</div>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const numMatch = o.poNumber.toLowerCase().includes(q);
        const supMatch = o.supplier?.name.toLowerCase().includes(q);
        if (!numMatch && !supMatch) return false;
      }
      return true;
    });
  }, [orders, search]);

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-xs">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["ALL", "SUBMITTED", "RECEIVED", "DRAFT", "CANCELLED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? "bg-[#172B25] text-white shadow-xs"
                  : "bg-gray-50 text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search & New PO Button */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO # or vendor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] placeholder-[#718078] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-[#16845B] hover:bg-[#126b49] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-[#718078]">Loading purchase orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <ShoppingBag className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Purchase Orders</h3>
          <p className="text-xs text-[#718078] mt-1">
            No orders match your filter. Click "Create Purchase Order" above to place vendor orders.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Items Ordered</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {filteredOrders.map((po) => {
                  const isSubmitted = po.status === "SUBMITTED";
                  const isReceived = po.status === "RECEIVED";

                  return (
                    <tr key={po.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#172B25] text-sm">{po.poNumber}</div>
                        {po.expectedDeliveryDate && (
                          <div className="text-[11px] text-[#718078] flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Due: {po.expectedDeliveryDate}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172B25]">{po.supplier?.name}</div>
                        <div className="text-[11px] text-[#718078]">{po.supplier?.phone || "No phone"}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isSubmitted
                              ? "bg-blue-100 text-blue-800"
                              : isReceived
                              ? "bg-emerald-100 text-emerald-800"
                              : po.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-xs font-semibold text-[#172B25]">
                          {(po.items || []).length} items
                        </div>
                        <div className="text-[11px] text-[#718078] truncate">
                          {(po.items || []).map((i: any) => `${i.name} (${i.quantity} ${i.unit})`).join(", ")}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-[#16845B] text-sm">
                          {formatINR(po.totalPaise)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#718078]">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receive Goods action */}
                          {isSubmitted && (
                            <button
                              type="button"
                              onClick={() => handleOpenReceive(po)}
                              className="px-3 py-1.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              <span>Receive Goods</span>
                            </button>
                          )}

                          {/* Print PO */}
                          <button
                            type="button"
                            onClick={() => handlePrintPo(po)}
                            className="p-1.5 hover:bg-gray-100 text-[#718078] hover:text-[#172B25] rounded-lg transition cursor-pointer"
                            title="Print PO"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receive Goods Modal */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-[#E5EBE7] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#16845B]">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#172B25]">
                    Receive Goods: {receivingPo.poNumber}
                  </h3>
                  <p className="text-xs text-[#718078]">Confirm quantities received into stock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-[#718078] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(receivingPo.items || []).map((item: any) => (
                <div
                  key={item.inventoryItemId}
                  className="bg-gray-50 p-2.5 rounded-xl border border-[#E5EBE7] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#172B25]">{item.name}</div>
                    <div className="text-[11px] text-[#718078]">
                      Ordered: {item.quantity} {item.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-28">
                    <span className="text-[11px] text-[#718078]">Got:</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={receivedQtyMap[item.inventoryItemId] || ""}
                      onChange={(e) =>
                        setReceivedQtyMap({
                          ...receivedQtyMap,
                          [item.inventoryItemId]: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1 bg-white border border-[#E5EBE7] rounded-lg text-xs font-bold text-[#172B25]"
                    />
                    <span className="text-xs font-bold text-[#718078]">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading ? "Receiving..." : "Confirm & Update Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden">
            <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#172B25]">New Purchase Order</h3>
                  <p className="text-xs text-[#718078]">Order raw ingredients from vendor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-[#718078] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-5 space-y-4">
              {/* Supplier & Delivery Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">
                    Supplier / Vendor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Expected Delivery</label>
                  <input
                    type="date"
                    value={poDeliveryDate}
                    onChange={(e) => setPoDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#172B25]">Order Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-[#16845B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {poLines.map((line, idx) => {
                    const inv = inventoryItems.find((i) => i.id === line.inventoryItemId);

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-[#E5EBE7]"
                      >
                        <select
                          value={line.inventoryItemId}
                          onChange={(e) => handleUpdateLine(idx, "inventoryItemId", e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-[#E5EBE7] rounded-lg text-xs font-semibold text-[#172B25]"
                        >
                          {inventoryItems.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.unit})
                            </option>
                          ))}
                        </select>

                        <div className="w-20">
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={line.quantity}
                            onChange={(e) => handleUpdateLine(idx, "quantity", e.target.value)}
                            placeholder="Qty"
                            className="w-full px-2 py-1.5 bg-white border border-[#E5EBE7] rounded-lg text-xs font-bold text-[#172B25]"
                          />
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unitPriceRupees}
                            onChange={(e) => handleUpdateLine(idx, "unitPriceRupees", e.target.value)}
                            placeholder="₹/Unit"
                            className="w-full px-2 py-1.5 bg-white border border-[#E5EBE7] rounded-lg text-xs font-bold text-[#172B25]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total & Notes */}
              <div className="bg-[#F4F6F5] p-3 rounded-2xl border border-[#E5EBE7] flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#172B25]">Estimated Total:</span>
                <span className="text-lg font-black text-[#16845B]">
                  {formatINR(computedPoTotalPaise)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B25]">Delivery Instructions / Notes</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Deliver to rear kitchen entrance before 11 AM"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || poLines.length === 0}
                  className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {actionLoading ? "Creating..." : "Submit PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
