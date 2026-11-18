"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Save, Tag, Calendar, MessageSquare, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: any) => Promise<void>;
  customer?: any | null; // null if adding new
  outlets?: { id: string; name: string }[];
}

const COMMON_TAGS = ["VIP", "Regular", "Family", "Vegetarian", "Vegan", "Wine Lover", "Celebration", "High Spender"];

export function CustomerModal({
  isOpen,
  onClose,
  onSave,
  customer,
  outlets = [],
}: CustomerModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    anniversary: "",
    preferredOutletId: "",
    notes: "",
    whatsappOptIn: true,
    marketingOptIn: false,
    welcomeBonus: true,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        birthday: customer.birthday || "",
        anniversary: customer.anniversary || "",
        preferredOutletId: customer.preferredOutletId || "",
        notes: customer.notes || "",
        whatsappOptIn: customer.whatsappOptIn !== false,
        marketingOptIn: Boolean(customer.marketingOptIn),
        welcomeBonus: false,
      });
      setTags(Array.isArray(customer.tags) ? customer.tags : []);
    } else {
      setFormData({
        name: "",
        phone: "",
        email: "",
        birthday: "",
        anniversary: "",
        preferredOutletId: "",
        notes: "",
        whatsappOptIn: true,
        marketingOptIn: true,
        welcomeBonus: true,
      });
      setTags([]);
    }
    setError(null);
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = (t: string) => {
    const clean = t.trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        ...formData,
        tags,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-[#E5EBE7] shadow-xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16845B]/10 text-[#16845B]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#172B25]">
                {customer ? "Edit Customer Profile" : "Register New Diner Profile"}
              </h2>
              <p className="text-xs text-[#718078]">
                {customer ? `Updating ${customer.phone}` : "Tenant-shared CRM profile & loyalty balance"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#718078] hover:bg-[#E5EBE7] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-bold text-[#172B25]">Customer Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-[#172B25]">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                disabled={Boolean(customer)}
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-bold text-[#172B25]">Email Address</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rahul@example.com"
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-[#172B25]">Preferred Outlet</Label>
              <select
                value={formData.preferredOutletId}
                onChange={(e) => setFormData({ ...formData, preferredOutletId: e.target.value })}
                className="mt-1 w-full bg-[#F8FAF9] border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 text-[#172B25] focus:outline-hidden"
              >
                <option value="">Any / Central Outlets</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-600" /> Birthday (for Annual Rewards)
              </Label>
              <Input
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-600" /> Anniversary
              </Label>
              <Input
                type="date"
                value={formData.anniversary}
                onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
              />
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-[#16845B]" /> Tags & Preferences
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Type tag & press enter (e.g. Jain, Corner Table)"
                className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-8 rounded-xl flex-1 text-[#172B25]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddTag(tagInput)}
                className="h-8 text-xs font-bold rounded-xl border-[#E5EBE7]"
              >
                Add Tag
              </Button>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleAddTag(t)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition cursor-pointer border ${
                    tags.includes(t)
                      ? "bg-[#16845B] text-white border-[#16845B]"
                      : "bg-[#F8FAF9] text-[#718078] border-[#E5EBE7] hover:border-[#16845B]/40"
                  }`}
                >
                  + {t}
                </button>
              ))}
            </div>

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 p-2 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7]">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E5EBE7] px-2.5 py-1 text-xs font-bold text-[#172B25] shadow-2xs"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-red-500 hover:text-red-700 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-bold text-[#172B25]">Internal Guest Notes</Label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Prefers spicy food, usually dines with family on weekends, allergic to peanuts."
              rows={2}
              className="mt-1 w-full rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-2.5 text-xs text-[#172B25] focus:outline-hidden"
            />
          </div>

          {/* WhatsApp Consents */}
          <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3.5 space-y-2.5">
            <div className="text-xs font-extrabold text-[#172B25] flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-[#16845B]" /> WhatsApp Communication Consents
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={formData.whatsappOptIn}
                onChange={(e) => setFormData({ ...formData, whatsappOptIn: e.target.checked })}
                className="mt-0.5 rounded text-[#16845B] focus:ring-[#16845B]"
              />
              <div>
                <span className="font-bold text-[#172B25]">Send Transactional E-Bills & Tax Invoices</span>
                <p className="text-[11px] text-[#718078]">Instant PDF bill & payment receipts delivered to WhatsApp.</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={formData.marketingOptIn}
                onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
                className="mt-0.5 rounded text-[#16845B] focus:ring-[#16845B]"
              />
              <div>
                <span className="font-bold text-[#172B25]">Promotional Marketing Opt-In</span>
                <p className="text-[11px] text-[#718078]">
                  Guest has agreed to receive seasonal offers, birthday greetings, and VIP promos.
                </p>
              </div>
            </label>

            {!customer && (
              <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-1 border-t border-[#E5EBE7]">
                <input
                  type="checkbox"
                  checked={formData.welcomeBonus}
                  onChange={(e) => setFormData({ ...formData, welcomeBonus: e.target.checked })}
                  className="mt-0.5 rounded text-[#16845B] focus:ring-[#16845B]"
                />
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Award className="h-3.5 w-3.5" />
                  Grant 50 Welcome Bonus Loyalty Points on Registration
                </div>
              </label>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5EBE7]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border-[#E5EBE7] text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {submitting ? "Saving..." : customer ? "Save Changes" : "Create Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
