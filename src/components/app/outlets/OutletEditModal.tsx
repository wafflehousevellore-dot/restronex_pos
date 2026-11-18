"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Building2, 
  Check, 
  AlertCircle, 
  MapPin, 
  Clock, 
  Phone 
} from "lucide-react";

interface OutletEditModalProps {
  outlet: any | null; // null if creating
  tenantId: string;
  maxOutlets: number;
  activeCount: number;
  onClose: () => void;
  onSave: (payload: {
    outletId?: string;
    tenantId: string;
    name: string;
    city: string;
    address: string;
    phone: string;
    openingHours: string;
    serviceModes: string;
    status?: string;
  }) => Promise<boolean>;
}

export function OutletEditModal({
  outlet,
  tenantId,
  maxOutlets,
  activeCount,
  onClose,
  onSave,
}: OutletEditModalProps) {
  const isEditing = Boolean(outlet);

  const [name, setName] = useState(outlet?.name || "");
  const [city, setCity] = useState(outlet?.city || "Bengaluru");
  const [address, setAddress] = useState(outlet?.address || "");
  const [phone, setPhone] = useState(outlet?.phone || "");
  const [openingHours, setOpeningHours] = useState(outlet?.openingHours || "11:00 AM - 11:00 PM");

  // Service modes toggles
  const initialModes = (outlet?.serviceModes || "DINE_IN,TAKEAWAY,DELIVERY").split(",").map((s: string) => s.trim());
  const [dineIn, setDineIn] = useState(initialModes.includes("DINE_IN"));
  const [takeaway, setTakeaway] = useState(initialModes.includes("TAKEAWAY"));
  const [delivery, setDelivery] = useState(initialModes.includes("DELIVERY"));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (outlet) {
      setName(outlet.name || "");
      setCity(outlet.city || "Bengaluru");
      setAddress(outlet.address || "");
      setPhone(outlet.phone || "");
      setOpeningHours(outlet.openingHours || "11:00 AM - 11:00 PM");
      const modes = (outlet.serviceModes || "DINE_IN,TAKEAWAY,DELIVERY").split(",").map((s: string) => s.trim());
      setDineIn(modes.includes("DINE_IN"));
      setTakeaway(modes.includes("TAKEAWAY"));
      setDelivery(modes.includes("DELIVERY"));
    }
  }, [outlet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Outlet branch name is required.");
      return;
    }

    // Check limit on create
    if (!isEditing && activeCount >= maxOutlets) {
      setError(`Plan limit reached: You can create up to ${maxOutlets} active outlets on your plan. Upgrade your plan to add more.`);
      return;
    }

    const modes: string[] = [];
    if (dineIn) modes.push("DINE_IN");
    if (takeaway) modes.push("TAKEAWAY");
    if (delivery) modes.push("DELIVERY");

    if (modes.length === 0) {
      setError("Select at least one active service mode (Dine-in, Takeaway, or Delivery).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ok = await onSave({
        outletId: outlet?.id,
        tenantId,
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        openingHours: openingHours.trim(),
        serviceModes: modes.join(","),
      });

      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save outlet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">
                {isEditing ? `Edit ${outlet?.name}` : "Create New Branch Outlet"}
              </h3>
              <p className="text-xs text-[#718078]">
                {isEditing ? "Configure branch settings & service modes" : "Expand your restaurant footprint"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-[#718078] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Plan Limit Info Banner */}
          {!isEditing && (
            <div className="bg-[#F4F6F5] p-3 rounded-2xl border border-[#E5EBE7] flex items-center justify-between text-xs">
              <span className="text-[#718078] font-semibold">Active Branches</span>
              <span className="font-bold text-[#172B25]">
                {activeCount} of {maxOutlets} allowed
              </span>
            </div>
          )}

          {/* Name & City */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Indiranagar Branch"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">City Location</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#172B25]">Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 Feet Road, 12th Main"
              className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          {/* Phone & Operating Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#172B25]">Operating Hours</label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="11:00 AM - 11:30 PM"
                className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
              />
            </div>
          </div>

          {/* Service Modes Checkboxes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#172B25]">Active Service Modes</label>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-[#E5EBE7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={dineIn}
                  onChange={(e) => setDineIn(e.target.checked)}
                  className="accent-[#16845B] rounded h-4 w-4"
                />
                <span className="text-xs font-bold text-[#172B25]">Dine-in</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-[#E5EBE7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={takeaway}
                  onChange={(e) => setTakeaway(e.target.checked)}
                  className="accent-[#16845B] rounded h-4 w-4"
                />
                <span className="text-xs font-bold text-[#172B25]">Takeaway</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-[#E5EBE7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={delivery}
                  onChange={(e) => setDelivery(e.target.checked)}
                  className="accent-[#16845B] rounded h-4 w-4"
                />
                <span className="text-xs font-bold text-[#172B25]">Delivery</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditing ? "Update Branch" : "Create Branch"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
