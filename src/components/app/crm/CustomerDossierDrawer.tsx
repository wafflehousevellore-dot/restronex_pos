"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Edit2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Tag,
  Receipt,
  Award,
  Clock,
  Plus,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface CustomerDossierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onEdit: (customer: any) => void;
  onRefreshList: () => void;
}

export function CustomerDossierDrawer({
  isOpen,
  onClose,
  customerId,
  onEdit,
  onRefreshList,
}: CustomerDossierDrawerProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "ORDERS" | "LOYALTY">("OVERVIEW");

  // Manual Adjustment State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const loadDossier = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/customers/${id}`).then((r) => r.json());
      if (res && res.customer) {
        setData(res);
      }
    } catch (err) {
      console.error("Failed to load customer dossier:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadDossier(customerId);
    } else {
      setData(null);
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  const c = data?.customer;
  const orders = data?.orders || [];
  const loyaltyTxns = data?.loyaltyTxns || [];

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPoints || !c) return;

    try {
      setAdjusting(true);
      await apiFetch("/api/customers/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADJUST",
          customerId: c.id,
          points: parseInt(adjustPoints, 10),
          reason: adjustReason.trim() || "Manual Staff Adjustment",
        }),
      });
      setShowAdjustModal(false);
      setAdjustPoints("");
      setAdjustReason("");
      await loadDossier(c.id);
      onRefreshList();
    } catch (err: any) {
      alert(err?.message || "Failed to adjust points");
    } finally {
      setAdjusting(false);
    }
  };

  const getSegmentBadgeColor = (segment: string) => {
    switch (segment) {
      case "VIP":
        return "bg-purple-100 text-purple-900 border-purple-300";
      case "REGULAR":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "NEW":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "AT_RISK":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "CHURNED":
        return "bg-rose-100 text-rose-900 border-rose-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-[#E5EBE7] flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="border-b border-[#E5EBE7] p-5 bg-[#F8FAF9] flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16845B] text-white text-lg font-black shadow-xs">
              {c ? c.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#172B25]">{c ? c.name : "Loading Customer..."}</h2>
                {c?.tier && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${c.tier.color}`}>
                    {c.tier.badge}
                  </span>
                )}
                {c?.segment && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${getSegmentBadgeColor(c.segment)}`}>
                    {c.segment}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#718078] mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {c?.phone}
                </span>
                {c?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {c.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {c && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(c)}
                className="h-8 rounded-xl border-[#E5EBE7] text-xs font-bold gap-1 cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-[#718078] hover:bg-[#E5EBE7] transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        {c && (
          <div className="grid grid-cols-4 gap-2 p-4 bg-white border-b border-[#E5EBE7]">
            <div className="rounded-xl bg-[#F8FAF9] p-2.5 text-center border border-[#E5EBE7]">
              <div className="text-[10px] font-bold uppercase text-[#718078]">Total Spent</div>
              <div className="text-sm font-black text-[#172B25] mt-0.5">
                ₹{Math.round((c.totalSpentPaise || 0) / 100).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-[#F8FAF9] p-2.5 text-center border border-[#E5EBE7]">
              <div className="text-[10px] font-bold uppercase text-[#718078]">Total Visits</div>
              <div className="text-sm font-black text-[#172B25] mt-0.5">{c.visitCount || 0}</div>
            </div>
            <div className="rounded-xl bg-[#F8FAF9] p-2.5 text-center border border-[#E5EBE7]">
              <div className="text-[10px] font-bold uppercase text-[#718078]">Avg Order</div>
              <div className="text-sm font-black text-[#172B25] mt-0.5">
                ₹{c.visitCount > 0 ? Math.round((c.totalSpentPaise || 0) / c.visitCount / 100).toLocaleString() : 0}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50/70 p-2.5 text-center border border-amber-200">
              <div className="text-[10px] font-bold uppercase text-amber-800">Loyalty Pts</div>
              <div className="text-sm font-black text-amber-900 mt-0.5">{c.loyaltyPoints || 0} pts</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5EBE7] px-5 bg-[#F8FAF9]">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition ${
              activeTab === "OVERVIEW"
                ? "border-[#16845B] text-[#16845B]"
                : "border-transparent text-[#718078] hover:text-[#172B25]"
            }`}
          >
            Overview & Profile
          </button>
          <button
            onClick={() => setActiveTab("ORDERS")}
            className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === "ORDERS"
                ? "border-[#16845B] text-[#16845B]"
                : "border-transparent text-[#718078] hover:text-[#172B25]"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" /> Order History ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("LOYALTY")}
            className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === "LOYALTY"
                ? "border-[#16845B] text-[#16845B]"
                : "border-transparent text-[#718078] hover:text-[#172B25]"
            }`}
          >
            <Award className="h-3.5 w-3.5" /> Points Ledger ({loyaltyTxns.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-xs text-[#718078] animate-pulse">
              Loading customer dossier & order history...
            </div>
          ) : !c ? (
            <div className="py-20 text-center text-xs text-[#718078]">No customer selected.</div>
          ) : activeTab === "OVERVIEW" ? (
            <div className="space-y-4">
              {/* Profile Details Card */}
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 space-y-3 shadow-xs">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#718078]">
                  Personal & Milestone Info
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <div>
                      <div className="text-[10px] text-[#718078] font-bold">Birthday</div>
                      <div className="font-semibold text-[#172B25]">{c.birthday || "Not specified"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-[10px] text-[#718078] font-bold">Anniversary</div>
                      <div className="font-semibold text-[#172B25]">{c.anniversary || "Not specified"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-teal-600" />
                    <div>
                      <div className="text-[10px] text-[#718078] font-bold">Preferred Outlet</div>
                      <div className="font-semibold text-[#172B25]">{c.preferredOutletId || "All Outlets"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-[10px] text-[#718078] font-bold">Registered On</div>
                      <div className="font-semibold text-[#172B25]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags & Preferences */}
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#718078] flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-[#16845B]" /> Guest Preferences & Tags
                  </h3>
                </div>
                {c.tags && c.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {c.tags.map((t: string) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B] px-3 py-1 text-xs font-bold"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#718078] italic">No custom preference tags recorded.</div>
                )}
              </div>

              {/* Internal Notes */}
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 space-y-2 shadow-xs">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#718078]">
                  Staff & Manager Internal Notes
                </h3>
                <p className="text-xs text-[#172B25] bg-[#F8FAF9] p-3 rounded-xl border border-[#E5EBE7] leading-relaxed">
                  {c.notes || "No notes added yet for this customer."}
                </p>
              </div>

              {/* Communication Consent Status */}
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 space-y-2 shadow-xs">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#718078] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#16845B]" /> WhatsApp Consent & Permissions
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div className="text-[10px] text-[#718078] font-bold">Transactional Bills</div>
                    <div className="font-bold text-[#16845B] flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                      {c.whatsappOptIn === false ? "Opted Out" : "Enabled"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div className="text-[10px] text-[#718078] font-bold">Promotional Marketing</div>
                    <div className="font-bold mt-0.5">
                      {c.marketingOptIn ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Opted In
                        </span>
                      ) : (
                        <span className="text-[#718078] flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Transactional Only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "ORDERS" ? (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="py-14 text-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-[#F8FAF9]">
                  No past orders found for this customer phone.
                </div>
              ) : (
                orders.map((o: any) => (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-[#E5EBE7] bg-white p-4 hover:shadow-xs transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#172B25]">
                          Order #{o.orderNumber}
                        </span>
                        <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2 py-0.5 text-[10px] font-bold text-[#16845B]">
                          {o.type}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            o.isPaid ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {o.isPaid ? "PAID" : o.status}
                        </span>
                      </div>
                      <div className="text-sm font-black text-[#172B25]">
                        ₹{Math.round((o.totalPaise || 0) / 100).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#718078]">
                      <span>Outlet: {o.outlet?.name || "Main Dining"}</span>
                      <span>{new Date(o.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200 p-3 rounded-2xl">
                <div>
                  <div className="text-xs font-bold text-amber-900">Current Balance</div>
                  <div className="text-xl font-black text-amber-900">{c.loyaltyPoints} Points</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAdjustModal(true)}
                  className="rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adjust Points
                </Button>
              </div>

              {loyaltyTxns.length === 0 ? (
                <div className="py-14 text-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-[#F8FAF9]">
                  No points transactions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-[#E5EBE7] rounded-2xl border border-[#E5EBE7] bg-white overflow-hidden">
                  {loyaltyTxns.map((t: any) => (
                    <div key={t.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#172B25] flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              t.points > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {t.type}
                          </span>
                          <span>{t.reference || "Transaction"}</span>
                        </div>
                        <div className="text-[10px] text-[#718078] mt-0.5">
                          {new Date(t.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-black ${
                          t.points > 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {t.points > 0 ? `+${t.points}` : t.points} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Adjust Modal Sub-dialog */}
        {showAdjustModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 border border-[#E5EBE7] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
                <h4 className="text-sm font-black text-[#172B25] flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-600" /> Adjust Customer Points
                </h4>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-full p-1 text-[#718078] hover:bg-[#E5EBE7]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#172B25]">
                    Points to Add (+) or Deduct (-)
                  </label>
                  <Input
                    type="number"
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(e.target.value)}
                    placeholder="e.g. 50 or -30"
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
                    required
                  />
                  <p className="text-[10px] text-[#718078] mt-1">
                    Positive adds points to balance; negative debits points.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#172B25]">Adjustment Reason Note</label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Guest goodwill credit, billing discrepancy"
                    className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EBE7]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdjustModal(false)}
                    className="rounded-xl border-[#E5EBE7] text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={adjusting}
                    className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold"
                  >
                    {adjusting ? "Updating..." : "Confirm Adjustment"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
