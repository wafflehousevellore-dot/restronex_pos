"use client";

import React, { useState } from "react";
import {
  Ticket,
  Award,
  Plus,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  Tag,
  Percent,
  Sparkles,
  Save,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Coupon, MembershipTier } from "@/lib/crm-service";

interface OffersMembershipViewProps {
  tiers: MembershipTier[];
  coupons: Coupon[];
  onSaveTiers: (tiers: MembershipTier[]) => Promise<void>;
  onSaveCoupon: (coupon: Partial<Coupon>) => Promise<void>;
  onToggleCoupon: (couponId: string) => Promise<void>;
  onDeleteCoupon: (couponId: string) => Promise<void>;
  outlets?: { id: string; name: string }[];
  loading: boolean;
}

export function OffersMembershipView({
  tiers,
  coupons,
  onSaveTiers,
  onSaveCoupon,
  onToggleCoupon,
  onDeleteCoupon,
  outlets = [],
}: OffersMembershipViewProps) {
  // Coupon Modal State
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: "",
    title: "",
    discountType: "PERCENT" as "PERCENT" | "FLAT",
    discountValue: 15,
    minOrderValuePaise: 50000,
    maxDiscountPaise: 25000,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    usageLimitTotal: 500,
    applicableSegments: ["ALL"],
    outletIds: [] as string[],
    allowStackingWithLoyalty: false,
    isActive: true,
  });

  // Tiers Modal State
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editableTiers, setEditableTiers] = useState<MembershipTier[]>(tiers);

  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: "",
      title: "",
      discountType: "PERCENT",
      discountValue: 15,
      minOrderValuePaise: 50000,
      maxDiscountPaise: 25000,
      validFrom: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      usageLimitTotal: 500,
      applicableSegments: ["ALL"],
      outletIds: [],
      allowStackingWithLoyalty: false,
      isActive: true,
    });
    setCouponModalOpen(true);
  };

  const openEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code,
      title: c.title,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderValuePaise: c.minOrderValuePaise,
      maxDiscountPaise: c.maxDiscountPaise,
      validFrom: c.validFrom ? new Date(c.validFrom).toISOString().slice(0, 10) : "",
      validUntil: c.validUntil ? new Date(c.validUntil).toISOString().slice(0, 10) : "",
      usageLimitTotal: c.usageLimitTotal,
      applicableSegments: c.applicableSegments || ["ALL"],
      outletIds: c.outletIds || [],
      allowStackingWithLoyalty: Boolean(c.allowStackingWithLoyalty),
      isActive: c.isActive,
    });
    setCouponModalOpen(true);
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveCoupon({
      id: editingCoupon?.id,
      code: couponForm.code,
      title: couponForm.title,
      discountType: couponForm.discountType,
      discountValue: Number(couponForm.discountValue),
      minOrderValuePaise: Number(couponForm.minOrderValuePaise),
      maxDiscountPaise: Number(couponForm.maxDiscountPaise),
      validFrom: new Date(couponForm.validFrom).toISOString(),
      validUntil: new Date(couponForm.validUntil).toISOString(),
      usageLimitTotal: Number(couponForm.usageLimitTotal),
      applicableSegments: couponForm.applicableSegments,
      outletIds: couponForm.outletIds,
      allowStackingWithLoyalty: couponForm.allowStackingWithLoyalty,
      isActive: couponForm.isActive,
    });
    setCouponModalOpen(false);
  };

  const handleSaveTiersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveTiers(editableTiers);
    setTierModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Membership Tiers Section */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#172B25]">Customer Membership Tiers</h2>
              <p className="text-xs text-[#718078]">
                Automatic tier progression based on lifetime spend with custom multipliers and perks
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditableTiers(tiers);
              setTierModalOpen(true);
            }}
            className="rounded-xl border-[#E5EBE7] text-xs font-bold gap-1 cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5 text-[#16845B]" /> Configure Tiers
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-2xs hover:shadow-xs transition space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${t.color}`}>
                  {t.badge}
                </span>
                <span className="text-xs font-black text-amber-600 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> {t.pointsMultiplier}x Points
                </span>
              </div>

              <div>
                <h3 className="text-sm font-black text-[#172B25]">{t.name}</h3>
                <p className="text-xs text-[#718078] mt-0.5">
                  Min Spend: <b>₹{Math.round(t.minSpendPaise / 100).toLocaleString()}</b>
                </p>
              </div>

              <div className="rounded-xl bg-[#F8FAF9] p-2.5 border border-[#E5EBE7] text-xs space-y-1">
                <div className="flex justify-between font-bold text-[#172B25]">
                  <span>Loyalty Boost:</span>
                  <span className="text-[#16845B]">+{Math.round((t.pointsMultiplier - 1) * 100)}%</span>
                </div>
                <div className="flex justify-between font-bold text-[#172B25]">
                  <span>Complimentary Off:</span>
                  <span className="text-purple-700">{t.discountPercent}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Promotional Coupons Section */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#16845B]">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#172B25]">Promotional Coupons & Vouchers</h2>
              <p className="text-xs text-[#718078]">
                POS discount promo codes with minimum order values, caps, segment locks and stacking controls
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={openCreateCoupon}
            className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-4 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create Coupon
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.length === 0 ? (
            <div className="col-span-full py-14 text-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-[#F8FAF9]">
              No promotional coupons configured yet. Click &quot;Create Coupon&quot; to add your first discount code.
            </div>
          ) : (
            coupons.map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition space-y-3 relative ${
                  c.isActive ? "border-[#E5EBE7] bg-white" : "border-gray-200 bg-gray-50/70 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black px-2.5 py-1 rounded-xl bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] tracking-wider">
                      {c.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        c.isActive ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {c.isActive ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleCoupon(c.id)}
                      className="p-1 rounded-lg text-[#718078] hover:bg-[#E5EBE7] cursor-pointer"
                      title={c.isActive ? "Pause Coupon" : "Activate Coupon"}
                    >
                      {c.isActive ? <CheckCircle2 className="h-4 w-4 text-[#16845B]" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => openEditCoupon(c)}
                      className="p-1 rounded-lg text-[#718078] hover:bg-[#E5EBE7] cursor-pointer"
                      title="Edit Coupon"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete coupon "${c.code}"?`)) onDeleteCoupon(c.id);
                      }}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-[#172B25]">{c.title}</h3>
                  <div className="text-base font-black text-emerald-700 mt-1 flex items-center gap-1">
                    {c.discountType === "PERCENT" ? (
                      <>
                        <Percent className="h-4 w-4" /> {c.discountValue}% OFF
                      </>
                    ) : (
                      <>Flat ₹{c.discountValue} OFF</>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-[#F8FAF9] p-2.5 border border-[#E5EBE7] text-[11px] space-y-1 text-[#718078]">
                  <div className="flex justify-between">
                    <span>Min Order:</span>
                    <span className="font-bold text-[#172B25]">
                      ₹{Math.round(c.minOrderValuePaise / 100)}
                    </span>
                  </div>
                  {c.maxDiscountPaise > 0 && (
                    <div className="flex justify-between">
                      <span>Max Discount Cap:</span>
                      <span className="font-bold text-[#172B25]">
                        ₹{Math.round(c.maxDiscountPaise / 100)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Total Redemptions:</span>
                    <span className="font-bold text-[#172B25]">
                      {c.usedCount} / {c.usageLimitTotal || "∞"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expires:</span>
                    <span className="font-bold text-[#172B25]">
                      {new Date(c.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 font-semibold">
                    Target: {c.applicableSegments?.join(", ") || "ALL"}
                  </span>
                  {c.allowStackingWithLoyalty && (
                    <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 font-bold">
                      Stackable with Loyalty
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Coupon Modal */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5EBE7] shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
              <h3 className="text-sm font-black text-[#172B25]">
                {editingCoupon ? "Edit Promotional Coupon" : "Create Promotional Coupon"}
              </h3>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="rounded-full p-1 text-[#718078] hover:bg-[#E5EBE7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCouponSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Coupon Code</Label>
                  <Input
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. FESTIVE20"
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-mono uppercase font-black"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Discount Type</Label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discountType: e.target.value as any })
                    }
                    className="mt-1 w-full bg-[#F8FAF9] border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 font-bold"
                  >
                    <option value="PERCENT">Percentage Off (%)</option>
                    <option value="FLAT">Flat Rupee Off (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Offer Title / Description</Label>
                <Input
                  value={couponForm.title}
                  onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                  placeholder="e.g. 20% Off on Weekend Family Feast"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">
                    {couponForm.discountType === "PERCENT" ? "Discount %" : "Discount (₹)"}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={couponForm.discountValue}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })
                    }
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Min Bill (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={couponForm.minOrderValuePaise / 100}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        minOrderValuePaise: Number(e.target.value) * 100,
                      })
                    }
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Max Cap (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={couponForm.maxDiscountPaise / 100}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        maxDiscountPaise: Number(e.target.value) * 100,
                      })
                    }
                    placeholder="0 = No cap"
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Valid From</Label>
                  <Input
                    type="date"
                    value={couponForm.validFrom}
                    onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Valid Until</Label>
                  <Input
                    type="date"
                    value={couponForm.validUntil}
                    onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Total Redemptions Limit</Label>
                  <Input
                    type="number"
                    min={1}
                    value={couponForm.usageLimitTotal}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, usageLimitTotal: Number(e.target.value) })
                    }
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Target Segment</Label>
                  <select
                    value={couponForm.applicableSegments[0] || "ALL"}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, applicableSegments: [e.target.value] })
                    }
                    className="mt-1 w-full bg-[#F8FAF9] border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 font-bold"
                  >
                    <option value="ALL">All Diners</option>
                    <option value="VIP">VIP Diners Only</option>
                    <option value="NEW">New First-Time Diners</option>
                    <option value="AT_RISK">At-Risk & Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5EBE7]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#172B25]">
                  <input
                    type="checkbox"
                    checked={couponForm.allowStackingWithLoyalty}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        allowStackingWithLoyalty: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-[#16845B]"
                  />
                  <span>Allow Stacking with Loyalty Points Redemption</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EBE7]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCouponModalOpen(false)}
                  className="rounded-xl border-[#E5EBE7] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5"
                >
                  {editingCoupon ? "Save Changes" : "Create Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tiers Configuration Modal */}
      {tierModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#E5EBE7] shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
              <h3 className="text-sm font-black text-[#172B25]">Configure Membership Tiers</h3>
              <button
                onClick={() => setTierModalOpen(false)}
                className="rounded-full p-1 text-[#718078] hover:bg-[#E5EBE7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTiersSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {editableTiers.map((t, idx) => (
                <div key={t.id} className="p-3.5 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#172B25]">{t.name}</span>
                    <span className="text-[10px] font-bold text-[#718078]">Tier #{idx + 1}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <Label className="text-[10px] font-bold text-[#718078]">Min Spend (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={t.minSpendPaise / 100}
                        onChange={(e) => {
                          const updated = [...editableTiers];
                          updated[idx].minSpendPaise = Number(e.target.value) * 100;
                          setEditableTiers(updated);
                        }}
                        className="mt-0.5 bg-white border-[#E5EBE7] text-xs h-8 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-[#718078]">Multiplier (x)</Label>
                      <Input
                        type="number"
                        min={1}
                        step={0.1}
                        value={t.pointsMultiplier}
                        onChange={(e) => {
                          const updated = [...editableTiers];
                          updated[idx].pointsMultiplier = Number(e.target.value);
                          setEditableTiers(updated);
                        }}
                        className="mt-0.5 bg-white border-[#E5EBE7] text-xs h-8 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-[#718078]">Bill Off (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={t.discountPercent}
                        onChange={(e) => {
                          const updated = [...editableTiers];
                          updated[idx].discountPercent = Number(e.target.value);
                          setEditableTiers(updated);
                        }}
                        className="mt-0.5 bg-white border-[#E5EBE7] text-xs h-8 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EBE7]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTierModalOpen(false)}
                  className="rounded-xl border-[#E5EBE7] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5"
                >
                  Save Tier Rules
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
