"use client";

import React, { useState } from "react";
import {
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  UserCheck,
  RefreshCw,
  Plus,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { CrmComplaint } from "@/lib/crm-service";

interface FeedbackManagerViewProps {
  feedbacks: any[];
  complaints: CrmComplaint[];
  metrics: {
    total: number;
    avgRating: string;
    npsScore: number;
    csatPercent: number;
    promoters: number;
    passives: number;
    detractors: number;
    starCounts: { stars: number; count: number; percentage: number }[];
    unresolvedCount: number;
  };
  onResolveComplaint: (complaintId: string, updates: Partial<CrmComplaint>) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
}

export function FeedbackManagerView({
  feedbacks,
  complaints,
  metrics,
  onResolveComplaint,
  onRefresh,
  loading,
}: FeedbackManagerViewProps) {
  const [googleReviewLink, setGoogleReviewLink] = useState("https://maps.google.com");
  const [selectedComplaint, setSelectedComplaint] = useState<CrmComplaint | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [resolveStatus, setResolveStatus] = useState<"OPEN" | "IN_PROGRESS" | "RESOLVED">("RESOLVED");
  const [submitting, setSubmitting] = useState(false);

  const openResolveModal = (c: CrmComplaint) => {
    setSelectedComplaint(c);
    setResolveNotes(c.resolutionNotes || "");
    setAssignedStaff(c.assignedStaff || "Floor Manager");
    setResolveStatus(c.status);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      setSubmitting(true);
      await onResolveComplaint(selectedComplaint.id, {
        status: resolveStatus,
        assignedStaff,
        resolutionNotes: resolveNotes,
      });
      setSelectedComplaint(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Average Guest Rating</div>
          <div className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1.5">
            <span>★</span> {metrics.avgRating} <span className="text-xs text-[#718078] font-normal">/ 5.0</span>
          </div>
          <p className="text-[11px] text-[#718078] mt-0.5">{metrics.total} verified diner reviews</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">CSAT Satisfaction</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{metrics.csatPercent}%</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Rated 4 or 5 stars</p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Net Promoter Score</div>
          <div className="text-2xl font-black text-[#16845B] mt-1">+{metrics.npsScore}</div>
          <p className="text-[11px] text-[#718078] mt-0.5">
            {metrics.promoters} Promoters • {metrics.detractors} Detractors
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-rose-800 uppercase">Detractor Escalations</div>
          <div className="text-2xl font-black text-rose-900 mt-1">{metrics.unresolvedCount}</div>
          <p className="text-[11px] text-rose-700 mt-0.5">Unresolved private complaints</p>
        </div>
      </div>

      {/* Rating Breakdown & Google Booster Engine */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Rating Breakdown */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Star Rating Distribution
          </h3>
          <div className="space-y-2">
            {metrics.starCounts.map((s) => (
              <div key={s.stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-bold text-[#172B25] flex items-center gap-1">
                  {s.stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-3 rounded-full bg-[#F8FAF9] border border-[#E5EBE7] overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
                <span className="w-14 text-right text-[11px] text-[#718078] font-bold">
                  {s.count} ({s.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Google Review Booster */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3.5">
          <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#16845B]" /> Google Maps Review Booster
          </h3>
          <p className="text-xs text-[#718078] leading-relaxed">
            Guests who give a <b>4 or 5-star rating</b> on digital WhatsApp bills are automatically prompted to copy their review to your Google Maps profile.
          </p>

          <div>
            <Label className="text-xs font-bold text-[#172B25]">Google Maps Review URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={googleReviewLink}
                onChange={(e) => setGoogleReviewLink(e.target.value)}
                placeholder="https://maps.google.com/?cid=..."
                className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl flex-1 font-medium"
              />
              <a
                href={googleReviewLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Test
              </a>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 text-xs text-[#16845B] space-y-1">
            <div className="font-extrabold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> 100% Private Negative Review Shield
            </div>
            <div className="text-[11px] text-[#172B25]/80">
              Ratings of 1, 2 or 3 stars are never redirected to Google Maps. They are captured privately on this manager desk for immediate resolution.
            </div>
          </div>
        </div>
      </div>

      {/* Detractor Complaint Resolution Desk */}
      <div className="rounded-2xl border border-rose-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-rose-100 px-6 py-4 bg-rose-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <h3 className="text-sm font-black text-rose-950">
              Detractor & Negative Feedback Escalation Desk ({complaints.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-rose-800">
            {metrics.unresolvedCount} complaints require manager attention
          </span>
        </div>

        <div className="divide-y divide-[#E5EBE7]">
          {complaints.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718078]">
              No active customer complaints logged. All recent diners reported positive experiences!
            </div>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                className="p-4 sm:px-6 hover:bg-[#F8FAF9]/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#172B25] text-xs">{c.customerName}</span>
                    <span className="text-xs text-[#718078] font-medium">• {c.customerPhone}</span>
                    <span className="text-amber-500 font-bold text-xs">
                      {"★".repeat(c.rating)}
                      {"☆".repeat(5 - c.rating)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        c.status === "RESOLVED"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : c.status === "IN_PROGRESS"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#172B25] font-medium">
                    &quot;{c.comment || "Negative experience reported by diner."}&quot;
                  </p>

                  {c.resolutionNotes && (
                    <div className="text-[11px] text-[#16845B] bg-[#E8F5EE] p-2 rounded-lg border border-[#16845B]/20 mt-1">
                      <b>Resolution ({c.assignedStaff || "Staff"}):</b> {c.resolutionNotes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] text-[#718078]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openResolveModal(c)}
                    className="h-8 rounded-xl border-[#E5EBE7] text-xs font-bold gap-1 cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-[#16845B]" />
                    {c.status === "RESOLVED" ? "Edit Resolution" : "Take Action"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verified Guest Feedback Feed */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              Verified Digital Bill Guest Feedback Feed ({feedbacks.length})
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 rounded-xl border-[#E5EBE7] text-xs font-bold hover:bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#718078] ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="divide-y divide-[#E5EBE7]">
          {feedbacks.length === 0 ? (
            <div className="py-14 text-center text-xs text-[#718078]">
              No guest ratings submitted yet. Diners rate through their digital WhatsApp e-bills.
            </div>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} className="p-4 sm:px-6 hover:bg-[#F8FAF9]/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold text-sm tracking-widest">
                      {"★".repeat(f.rating)}
                      {"☆".repeat(5 - f.rating)}
                    </span>
                    <span className="text-xs font-black text-[#172B25]">{f.rating} / 5</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        f.rating >= 4
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : f.rating === 3
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {f.rating >= 4 ? "Promoter" : f.rating === 3 ? "Neutral" : "Detractor"}
                    </span>
                    {f.orderNumber && (
                      <span className="text-[10px] text-[#718078] font-mono">
                        Order #{f.orderNumber}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#172B25] mt-1 font-medium">
                    {f.comment || <span className="text-[#718078] italic">No written comment submitted</span>}
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#718078] shrink-0 self-end sm:self-center">
                  {new Date(f.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5EBE7] shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" /> Detractor Complaint Resolution
              </h3>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-full p-1 text-[#718078] hover:bg-[#E5EBE7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs space-y-1">
              <div className="font-bold text-[#172B25]">
                {selectedComplaint.customerName} ({selectedComplaint.customerPhone})
              </div>
              <div className="text-amber-500 font-bold">
                {"★".repeat(selectedComplaint.rating)} ({selectedComplaint.rating}/5)
              </div>
              <div className="text-[#718078] italic">&quot;{selectedComplaint.comment}&quot;</div>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3.5">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Resolution Status</Label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value as any)}
                  className="mt-1 w-full bg-[#F8FAF9] border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 font-bold"
                >
                  <option value="OPEN">Open (Pending Review)</option>
                  <option value="IN_PROGRESS">In Progress (Staff Contacting Guest)</option>
                  <option value="RESOLVED">Resolved (Satisfactorily Addressed)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Assigned Staff / Manager</Label>
                <Input
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  placeholder="e.g. Pooja Verma (Floor Manager)"
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Manager Action Taken & Resolution Notes</Label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g. Spoke with diner on phone, refunded service charge, and issued ₹250 meal voucher for next visit."
                  rows={3}
                  className="mt-1 w-full rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-2.5 text-xs text-[#172B25] focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EBE7]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-xl border-[#E5EBE7] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5"
                >
                  {submitting ? "Saving..." : "Save Resolution"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
