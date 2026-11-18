"use client";

import React, { useState } from "react";
import {
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Users,
  Gift,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Play,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { MarketingCampaign } from "@/lib/crm-service";

interface MarketingCampaignsViewProps {
  isWhatsAppConnected: boolean;
  whatsAppStatus: string;
  displayPhoneNumber: string | null;
  campaigns: MarketingCampaign[];
  segmentCounts: Record<string, { total: number; optedIn: number }>;
  onCreateCampaign: (campaign: any) => Promise<void>;
  onDispatchCampaign: (campaignId: string) => Promise<void>;
  loading: boolean;
}

const CAMPAIGN_PRESETS = [
  {
    type: "BIRTHDAY",
    title: "Birthday Month Celebration Treat",
    segment: "BIRTHDAY_MONTH",
    template:
      "Happy Birthday Month, {{name}}! 🎂 Celebrate with us at RestroNex and enjoy a complimentary Chef's Dessert & 100 bonus loyalty points on your bill!",
    couponCode: "BDAYTREAT",
  },
  {
    type: "WINBACK",
    title: "30-Day Win-Back Dining Voucher",
    segment: "AT_RISK",
    template:
      "Hey {{name}}, we miss having you at RestroNex! Here is a 15% discount on your next visit. Show code COMEBACK15 to your server. Valid until Sunday!",
    couponCode: "COMEBACK15",
  },
  {
    type: "WELCOME",
    title: "First-Time Diner 10% Welcome",
    segment: "NEW",
    template:
      "Hi {{name}}! Thank you for dining with us recently. Use promo code WELCOME100 on your next visit for flat ₹100 off your meal. See you soon!",
    couponCode: "WELCOME100",
  },
  {
    type: "LOYALTY_MILESTONE",
    title: "VIP Connoisseur Special Perk",
    segment: "VIP",
    template:
      "Dear VIP guest {{name}}, thank you for your loyal patronage! Enjoy an exclusive 20% off your table this weekend with code ROYAL20.",
    couponCode: "ROYAL20",
  },
];

export function MarketingCampaignsView({
  isWhatsAppConnected,
  whatsAppStatus,
  displayPhoneNumber,
  campaigns,
  segmentCounts,
  onCreateCampaign,
  onDispatchCampaign,
  loading,
}: MarketingCampaignsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    type: "ANNOUNCEMENT",
    segment: "ALL",
    couponCode: "",
    messageTemplate:
      "Hi {{name}}, discover our new seasonal chef specials this weekend at RestroNex! Reserve your table today.",
  });

  const selectedSegmentAudience = segmentCounts[form.segment] || { total: 0, optedIn: 0 };

  const handleApplyPreset = (preset: any) => {
    setForm({
      title: preset.title,
      type: preset.type,
      segment: preset.segment,
      couponCode: preset.couponCode,
      messageTemplate: preset.template,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateCampaign({
      ...form,
      audienceSize: selectedSegmentAudience.optedIn,
    });
    setModalOpen(false);
  };

  const handleDispatch = async (campaignId: string) => {
    setDispatchError(null);
    if (!isWhatsAppConnected) {
      setDispatchError(
        "WhatsApp Business Cloud API is not connected. Connect your Meta WhatsApp account in Settings -> WhatsApp before dispatching broadcasts."
      );
      return;
    }

    try {
      setDispatchingId(campaignId);
      await onDispatchCampaign(campaignId);
    } catch (err: any) {
      setDispatchError(err?.message || "Failed to dispatch campaign");
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* WhatsApp Connection Health Banner */}
      {!isWhatsAppConnected ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-950">
                Setup Required: WhatsApp Business Cloud API Not Connected
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Automated promotional marketing campaigns and WhatsApp broadcasts require a connected Meta WhatsApp Business account.
              </p>
            </div>
          </div>
          <Link
            href="/app/settings"
            className="rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold px-4 py-2 shrink-0 transition"
          >
            Connect WhatsApp API
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-200 text-emerald-900">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <span>WhatsApp Business Cloud API Connected</span>
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-900">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Sender Phone: <b>{displayPhoneNumber || "RestroNex Official Gateway"}</b> • Marketing Broadcasts Ready
              </p>
            </div>
          </div>
          <div className="text-right text-xs font-bold text-emerald-900">
            {segmentCounts.ALL?.optedIn || 0} Opted-In Diners
          </div>
        </div>
      )}

      {dispatchError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{dispatchError}</span>
          <button onClick={() => setDispatchError(null)} className="text-rose-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Preset Marketing Automations Grid */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              RestroNex Automated Campaign Recipes
            </h3>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setForm({
                title: "",
                type: "ANNOUNCEMENT",
                segment: "ALL",
                couponCode: "",
                messageTemplate: "",
              });
              setModalOpen(true);
            }}
            className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-4 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-4 w-4" /> Custom Campaign
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CAMPAIGN_PRESETS.map((p) => (
            <div
              key={p.type}
              className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 hover:bg-white hover:shadow-xs transition space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 text-[#16845B] px-2 py-0.5 text-[9px] font-black uppercase">
                    {p.type}
                  </span>
                  <span className="text-[10px] text-[#718078] font-bold">
                    Target: {p.segment}
                  </span>
                </div>
                <h4 className="text-xs font-black text-[#172B25] mt-2">{p.title}</h4>
                <p className="text-[11px] text-[#718078] mt-1 line-clamp-3 leading-relaxed">
                  &quot;{p.template}&quot;
                </p>
              </div>

              <div className="pt-2 border-t border-[#E5EBE7] flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#16845B]">
                  {p.couponCode}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyPreset(p)}
                  className="h-7 text-[11px] rounded-lg border-[#E5EBE7] font-bold text-[#172B25] hover:bg-[#E8F5EE] hover:text-[#16845B]"
                >
                  Use Template
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaigns History Roster */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              Campaign Broadcast History & Scheduled Dispatches ({campaigns.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#718078] font-semibold">
            Strictly respects CustomerConsent.marketingOptIn
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Campaign Title & Type</th>
                <th className="py-3 px-3">Target Segment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Audience Size</th>
                <th className="py-3 px-3">Delivered / Read</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-xs text-[#718078]">
                    No campaigns created yet. Choose a template above or click Custom Campaign.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAF9]/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#172B25]">{c.title}</div>
                      <div className="text-[11px] text-[#718078] truncate max-w-[280px]">
                        {c.messageTemplate}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {c.segment}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          c.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : c.status === "SCHEDULED"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-[#172B25]">
                      {c.targetAudienceCount} diners
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-emerald-700">
                        {c.deliveredCount} delivered
                      </div>
                      <div className="text-[10px] text-[#718078]">
                        {c.readCount} read (~{c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 100) : 0}%)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status !== "COMPLETED" ? (
                        <Button
                          size="sm"
                          onClick={() => handleDispatch(c.id)}
                          disabled={dispatchingId === c.id}
                          className="h-8 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold gap-1 cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          {dispatchingId === c.id ? "Sending..." : "Dispatch"}
                        </Button>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#718078]">
                          Sent {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Campaign Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5EBE7] shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
              <h3 className="text-sm font-black text-[#172B25]">Composer: WhatsApp Campaign Broadcast</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-[#718078] hover:bg-[#E5EBE7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Campaign Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Weekend Biryani Festival Offer"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Campaign Type</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1 w-full bg-[#F8FAF9] border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 font-bold"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="BIRTHDAY">Birthday Greeting</option>
                    <option value="WINBACK">Win-Back Inactive</option>
                    <option value="WELCOME">Welcome Offer</option>
                    <option value="LOYALTY_MILESTONE">Loyalty Milestone</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Target Audience Segment</Label>
                  <select
                    value={form.segment}
                    onChange={(e) => setForm({ ...form, segment: e.target.value })}
                    className="mt-1 w-full bg-[#F8FAF9] border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 font-bold"
                  >
                    <option value="ALL">All Opted-In Diners</option>
                    <option value="VIP">VIP Diners Only</option>
                    <option value="REGULAR">Regular Diners</option>
                    <option value="NEW">New Diners</option>
                    <option value="AT_RISK">At-Risk Diners</option>
                    <option value="CHURNED">Churned Diners</option>
                    <option value="BIRTHDAY_MONTH">Diners with Birthday This Month</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Audience Preview Card */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 space-y-1 text-xs">
                <div className="font-bold text-teal-950 flex items-center justify-between">
                  <span>Target Segment Breakdown:</span>
                  <span className="font-black text-teal-800">
                    {selectedSegmentAudience.optedIn} Opted-In Diners
                  </span>
                </div>
                <div className="text-[11px] text-teal-800">
                  Total in segment: {selectedSegmentAudience.total} • Excluded (No marketing opt-in):{" "}
                  {selectedSegmentAudience.total - selectedSegmentAudience.optedIn}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Attach Promo Code (Optional)</Label>
                <Input
                  value={form.couponCode}
                  onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. FESTIVE20"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-mono uppercase font-black"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">WhatsApp Message Text</Label>
                <textarea
                  value={form.messageTemplate}
                  onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })}
                  placeholder="Hi {{name}}, enjoy an exclusive offer at RestroNex..."
                  rows={4}
                  className="mt-1 w-full rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-2.5 text-xs text-[#172B25] focus:outline-hidden"
                  required
                />
                <p className="text-[10px] text-[#718078] mt-1">
                  Supported tokens: <code>{"{{name}}"}</code>, <code>{"{{points}}"}</code>, <code>{"{{expiry}}"}</code>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EBE7]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border-[#E5EBE7] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5"
                >
                  Save Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
