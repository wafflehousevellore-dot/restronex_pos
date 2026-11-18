"use client";

import React, { useState } from "react";
import {
  Percent,
  Check,
  Building2,
  FileText,
  ShieldCheck,
  Plus,
  HelpCircle,
} from "lucide-react";
import { RestaurantTaxPolicy } from "@/app/api/tax/route";
import { TaxRateModal } from "./TaxRateModal";

interface TaxConfigRow {
  id: string;
  name: string;
  rateBps: number;
  isActive: boolean;
}

interface TaxConfigurationViewProps {
  policy: RestaurantTaxPolicy;
  taxConfigs: TaxConfigRow[];
  fssaiNumber?: string | null;
  serviceChargePct?: number;
  onRefresh: () => void;
  isOwnerOrManager: boolean;
}

export function TaxConfigurationView({
  policy: initialPolicy,
  taxConfigs,
  fssaiNumber: initialFssai,
  serviceChargePct: initialServiceCharge,
  onRefresh,
  isOwnerOrManager,
}: TaxConfigurationViewProps) {
  const [pricingMode, setPricingMode] = useState<"INCLUSIVE" | "EXCLUSIVE">(initialPolicy.pricingMode || "EXCLUSIVE");
  const [gstScheme, setGstScheme] = useState<"REGULAR" | "COMPOSITION">(initialPolicy.gstScheme || "REGULAR");
  const [gstNumber, setGstNumber] = useState(initialPolicy.gstNumber || "");
  const [legalName, setLegalName] = useState(initialPolicy.legalEntityName || "");
  const [fssai, setFssai] = useState(initialFssai || "");
  const [serviceCharge, setServiceCharge] = useState(String(initialServiceCharge || 0));
  const [defaultSac, setDefaultSac] = useState(initialPolicy.defaultSacCode || "996331");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAddRateModalOpen, setIsAddRateModalOpen] = useState(false);

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricingMode,
          gstScheme,
          gstNumber: gstNumber.trim() || null,
          legalEntityName: legalName.trim() || null,
          fssaiNumber: fssai.trim() || null,
          serviceChargePct: Number(serviceCharge) || 0,
          defaultSacCode: defaultSac.trim(),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onRefresh();
      } else {
        alert("Failed to update tax policy.");
      }
    } catch {
      alert("Error saving tax policy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tax Rates & GST Rates Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] bg-[#F8FAF9] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-bold text-[#172B25]">
              Active GST &amp; VAT Tax Rates
            </h3>
          </div>
          {isOwnerOrManager && (
            <button
              onClick={() => setIsAddRateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Tax Rate</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9]/50 text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                <th className="py-2.5 px-5">Tax Rate Name</th>
                <th className="py-2.5 px-5">Effective Percentage</th>
                <th className="py-2.5 px-5">Central Tax (CGST)</th>
                <th className="py-2.5 px-5">State Tax (SGST)</th>
                <th className="py-2.5 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {taxConfigs.map((tax) => {
                const totalPct = (tax.rateBps / 100).toFixed(2);
                const halfPct = (tax.rateBps / 200).toFixed(2);

                return (
                  <tr key={tax.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-5 font-bold text-[#172B25]">{tax.name}</td>
                    <td className="py-3 px-5 font-mono text-xs font-bold text-[#16845B]">
                      {totalPct}%
                    </td>
                    <td className="py-3 px-5 font-mono text-xs text-[#718078]">
                      {halfPct}%
                    </td>
                    <td className="py-3 px-5 font-mono text-xs text-[#718078]">
                      {halfPct}%
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST Policy & Pricing Mode Form */}
      <form onSubmit={handleSavePolicy} className="rounded-xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-5 text-xs">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-bold text-[#172B25]">
              GST Registration &amp; Pricing Policy Configuration
            </h3>
          </div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Policy Saved Successfully
            </span>
          )}
        </div>

        {/* Pricing Mode Option Cards */}
        <div className="space-y-2">
          <label className="font-bold text-[#172B25] flex items-center gap-1.5">
            <span>Menu Pricing &amp; Tax Calculation Mode</span>
            <HelpCircle className="h-3.5 w-3.5 text-[#718078]" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setPricingMode("EXCLUSIVE")}
              className={`rounded-xl border p-4 cursor-pointer transition ${
                pricingMode === "EXCLUSIVE"
                  ? "border-[#16845B] bg-[#16845B]/5 shadow-xs"
                  : "border-[#E5EBE7] bg-white hover:bg-[#F8FAF9]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#172B25]">Tax Exclusive (Recommended)</span>
                <input
                  type="radio"
                  name="pricingMode"
                  checked={pricingMode === "EXCLUSIVE"}
                  onChange={() => setPricingMode("EXCLUSIVE")}
                  className="text-[#16845B]"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#718078] leading-relaxed">
                Menu prices display item rate. GST (5%) is calculated and added onto the bill subtotal at checkout.
              </p>
              <div className="mt-2 font-mono text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded">
                Example: Paneer Tikka (₹200) + 5% GST (₹10) = ₹210 Total Bill
              </div>
            </div>

            <div
              onClick={() => setPricingMode("INCLUSIVE")}
              className={`rounded-xl border p-4 cursor-pointer transition ${
                pricingMode === "INCLUSIVE"
                  ? "border-[#16845B] bg-[#16845B]/5 shadow-xs"
                  : "border-[#E5EBE7] bg-white hover:bg-[#F8FAF9]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#172B25]">Tax Inclusive</span>
                <input
                  type="radio"
                  name="pricingMode"
                  checked={pricingMode === "INCLUSIVE"}
                  onChange={() => setPricingMode("INCLUSIVE")}
                  className="text-[#16845B]"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#718078] leading-relaxed">
                Menu prices are all-inclusive. Taxes are backward-calculated from item price for GSTR-1 compliance.
              </p>
              <div className="mt-2 font-mono text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded">
                Example: Paneer Tikka (₹200) = ₹190.48 Base + ₹9.52 GST
              </div>
            </div>
          </div>
        </div>

        {/* GST Registration Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              GSTIN (Goods &amp; Services Tax ID)
            </label>
            <input
              type="text"
              placeholder="e.g. 27AABCR1234F1Z5"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-mono text-xs uppercase text-[#172B25] outline-none focus:border-[#16845B]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              Legal Registered Entity Name
            </label>
            <input
              type="text"
              placeholder="e.g. RestroNex Hospitality Pvt Ltd"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-xs text-[#172B25] outline-none focus:border-[#16845B]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              FSSAI License Number
            </label>
            <input
              type="text"
              placeholder="e.g. 11521012000345"
              value={fssai}
              onChange={(e) => setFssai(e.target.value)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-mono text-xs text-[#172B25] outline-none focus:border-[#16845B]"
            />
          </div>
        </div>

        {/* SAC / HSN Code and Service Charge */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              Default SAC Code (Service Accounting Code)
            </label>
            <select
              value={defaultSac}
              onChange={(e) => setDefaultSac(e.target.value)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-mono text-xs text-[#172B25] outline-none focus:border-[#16845B]"
            >
              <option value="996331">SAC 996331 - Restaurant &amp; Dine-in Services</option>
              <option value="996332">SAC 996332 - Takeaway &amp; Food Delivery</option>
              <option value="996334">SAC 996334 - Outdoor Catering Services</option>
              <option value="2202">HSN 2202 - Aerated / Bottled Beverages</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              Service Charge Percentage (%)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="20"
              placeholder="0"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-mono text-xs text-[#172B25] outline-none focus:border-[#16845B]"
            />
            <span className="text-[10px] text-[#718078]">
              Optional restaurant service fee (GST applies on service charge)
            </span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[#172B25]">
              GST Composition Scheme
            </label>
            <select
              value={gstScheme}
              onChange={(e) => setGstScheme(e.target.value as any)}
              className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-xs text-[#172B25] outline-none focus:border-[#16845B]"
            >
              <option value="REGULAR">Regular GST Scheme (5% No-ITC Standard)</option>
              <option value="COMPOSITION">Composition Scheme (Small Taxpayer)</option>
            </select>
          </div>
        </div>

        {isOwnerOrManager && (
          <div className="pt-2 text-right">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#16845B] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? "Saving Policy..." : "Update Tax Configuration"}</span>
            </button>
          </div>
        )}
      </form>

      {/* Add Tax Rate Modal */}
      <TaxRateModal
        isOpen={isAddRateModalOpen}
        onClose={() => setIsAddRateModalOpen(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </div>
  );
}
