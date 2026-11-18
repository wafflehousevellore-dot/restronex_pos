"use client";

import React, { useState } from "react";
import {
  Award,
  Save,
  Coins,
  Settings2,
  Calendar,
  Gift,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoyaltyConfig } from "@/lib/crm-service";

interface LoyaltyProgramViewProps {
  config: LoyaltyConfig;
  stats: {
    totalBalance: number;
    activeMembers: number;
    recentIssued: number;
    recentRedeemed: number;
  };
  transactions: any[];
  onSaveConfig: (updated: Partial<LoyaltyConfig>) => Promise<void>;
  loading: boolean;
}

export function LoyaltyProgramView({
  config,
  stats,
  transactions,
  onSaveConfig,
  loading,
}: LoyaltyProgramViewProps) {
  const [form, setForm] = useState<LoyaltyConfig>(config);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSaveConfig(form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Circulating Balance
            </span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900">
            {stats.totalBalance.toLocaleString()} <span className="text-xs font-bold">pts</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700">Worth ₹{stats.totalBalance.toLocaleString()} credit</p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
              Active Earners
            </span>
            <Award className="h-4 w-4 text-[#16845B]" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#172B25]">
            {stats.activeMembers.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-[#718078]">Diners with points balance</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Recent Points Issued
            </span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">
            +{stats.recentIssued.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">Earned on paid orders</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Recent Redemptions
            </span>
            <ArrowDownLeft className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-900">
            -{stats.recentRedeemed.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-purple-700">Redeemed for bill discounts</p>
        </div>
      </div>

      {/* Program Configuration Form */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#172B25]">Loyalty & Rewards Program Rules</h2>
              <p className="text-xs text-[#718078]">
                Configure earning rate, redemption thresholds, points-to-rupee valuation and bonus perks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#172B25] cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 rounded text-[#16845B] focus:ring-[#16845B]"
              />
              <span>Program Enabled</span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {savedSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Loyalty program rules saved successfully!
            </div>
          )}

          {/* Core Earning & Redemption */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-bold text-[#172B25]">Points per ₹100 Spent</Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.pointsPerHundredRupees}
                  onChange={(e) =>
                    setForm({ ...form, pointsPerHundredRupees: Number(e.target.value) })
                  }
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-12 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  pts
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">e.g. 5 pts = 5% rewards return</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B25]">Value per Point (₹)</Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={form.rupeesPerPoint}
                  onChange={(e) => setForm({ ...form, rupeesPerPoint: Number(e.target.value) })}
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-8 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  ₹
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">1 pt = ₹1 discount on bill</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B25]">Min Redemption Points</Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={0}
                  value={form.minRedemptionPoints}
                  onChange={(e) =>
                    setForm({ ...form, minRedemptionPoints: Number(e.target.value) })
                  }
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-12 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  pts
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">Threshold required to redeem</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B25]">Max Points per Bill</Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={0}
                  value={form.maxRedemptionPoints}
                  onChange={(e) =>
                    setForm({ ...form, maxRedemptionPoints: Number(e.target.value) })
                  }
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-12 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  pts
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">Cap per individual bill (0 = uncapped)</p>
            </div>
          </div>

          {/* Caps & Bonuses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-[#E5EBE7]">
            <div>
              <Label className="text-xs font-bold text-[#172B25]">Max Bill Discount Cap (%)</Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={form.maxDiscountPercentage}
                  onChange={(e) =>
                    setForm({ ...form, maxDiscountPercentage: Number(e.target.value) })
                  }
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-8 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  %
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">Max % of subtotal paid by points</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B25]">Points Validity (Days)</Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={30}
                  value={form.pointsExpiryDays}
                  onChange={(e) =>
                    setForm({ ...form, pointsExpiryDays: Number(e.target.value) })
                  }
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-12 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  days
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">Expiry window (e.g. 365 days)</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1">
                <Gift className="h-3.5 w-3.5 text-purple-600" /> Birthday Bonus Points
              </Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={0}
                  value={form.birthdayBonusPoints}
                  onChange={(e) =>
                    setForm({ ...form, birthdayBonusPoints: Number(e.target.value) })
                  }
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-12 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  pts
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">Credited during birthday month</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-emerald-600" /> Welcome Enrollment Bonus
              </Label>
              <div className="mt-1 relative">
                <Input
                  type="number"
                  min={0}
                  value={form.welcomeBonusPoints}
                  onChange={(e) =>
                    setForm({ ...form, welcomeBonusPoints: Number(e.target.value) })
                  }
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] pr-12 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-[#718078] font-bold">
                  pts
                </span>
              </div>
              <p className="text-[10px] text-[#718078] mt-1">Granted upon diner signup</p>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[#E5EBE7]">
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-6 shadow-xs cursor-pointer gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Loyalty Rules"}
            </Button>
          </div>
        </form>
      </div>

      {/* Cross-Restaurant Points Ledger Table */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              Live Loyalty Points Activity Ledger ({transactions.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#718078] font-semibold">
            Real-time earn & burn audit feed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-3">Diner Name & Phone</th>
                <th className="py-3 px-3">Transaction Type</th>
                <th className="py-3 px-3">Order / Reason Reference</th>
                <th className="py-3 px-4 text-right">Points Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-xs text-[#718078]">
                    No loyalty transactions recorded yet. Points will be automatically awarded on billed orders.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F8FAF9]/70 transition-colors">
                    <td className="py-3 px-4 text-[11px] text-[#718078]">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#172B25]">{t.customer?.name || "Guest"}</div>
                      <div className="text-[11px] text-[#718078]">{t.customer?.phone}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          t.type === "EARNED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : t.type === "REDEEMED"
                            ? "bg-purple-50 text-purple-800 border border-purple-200"
                            : t.type === "BONUS"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : t.type === "REFUND_REVERSAL"
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#172B25]">
                      {t.reference || "Transaction"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-black text-sm ${
                          t.points > 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {t.points > 0 ? `+${t.points}` : t.points} pts
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
