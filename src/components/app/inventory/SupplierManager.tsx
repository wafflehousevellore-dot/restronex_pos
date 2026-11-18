"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { 
  Building2, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Search, 
  ShoppingBag, 
  AlertCircle 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface SupplierManagerProps {
  suppliers: any[];
  onRefresh: () => void;
}

export function SupplierManager({ suppliers, onRefresh }: SupplierManagerProps) {
  const [search, setSearch] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleOpenCreate = () => {
    setIsNew(true);
    setForm({ name: "", phone: "", email: "", address: "" });
    setEditingSupplier(null);
  };

  const handleOpenEdit = (sup: any) => {
    setIsNew(false);
    setForm({
      name: sup.name || "",
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
    });
    setEditingSupplier(sup);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isNew) {
        const res = await apiFetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to create supplier");
        setToast({ type: "success", text: `Supplier ${form.name} added` });
      } else {
        const res = await apiFetch("/api/suppliers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId: editingSupplier.id, ...form }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to update supplier");
        setToast({ type: "success", text: `Supplier ${form.name} updated` });
      }

      setIsNew(false);
      setEditingSupplier(null);
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      const res = await apiFetch(`/api/suppliers?supplierId=${supplierId}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) {
        setToast({ type: "error", text: j.error || "Cannot delete supplier" });
      } else {
        setToast({ type: "success", text: "Supplier removed" });
        onRefresh();
      }
    } catch {
      setToast({ type: "error", text: "Error deleting supplier" });
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone || "").includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  });

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
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor by name, phone or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] placeholder-[#718078] focus:outline-none focus:border-[#16845B]"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 bg-[#16845B] hover:bg-[#126b49] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <Building2 className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Suppliers Found</h3>
          <p className="text-xs text-[#718078] mt-1">
            Click "+ Add New Supplier" above to add food distributors and raw material vendors.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white rounded-2xl p-4 border border-[#E5EBE7] shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 text-[#16845B]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#172B25]">{sup.name}</h4>
                      <span className="text-[10px] text-[#718078] uppercase font-semibold">
                        Registered Vendor
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sup)}
                      className="p-1 hover:bg-gray-100 text-[#718078] hover:text-[#172B25] rounded-lg transition cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sup.id)}
                      className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                      title="Delete Supplier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-[#718078]">
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-[#16845B]" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-[#16845B]" />
                      <span>{sup.email}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-[#16845B]" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom POs count */}
              <div className="pt-2 border-t border-[#E5EBE7] flex items-center justify-between text-[11px]">
                <span className="text-[#718078]">Purchase Orders</span>
                <span className="font-extrabold text-[#172B25] bg-gray-100 px-2 py-0.5 rounded-full">
                  {(sup.purchaseOrders || []).length} POs
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Supplier Modal */}
      {(isNew || editingSupplier) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden">
            <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
              <h3 className="text-sm font-black text-[#172B25]">
                {isNew ? "New Vendor Supplier" : `Edit ${editingSupplier?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNew(false);
                  setEditingSupplier(null);
                }}
                className="p-1 rounded-full hover:bg-gray-200 text-[#718078] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B25]">
                  Supplier Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Metro Wholesale, Amul Dairy Depot"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="orders@vendor.com"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B25]">Address / Warehouse Location</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Sector 18, APMC Market"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditingSupplier(null);
                  }}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {loading ? "Saving..." : isNew ? "Add Supplier" : "Update Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
