"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Star,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Award,
  Copy,
  Check,
} from "lucide-react";

export default function FeedbackDashboardPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleReviewLink, setGoogleReviewLink] = useState("https://maps.google.com");
  const [copied, setCopied] = useState(false);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const j = await apiFetch("/api/feedback").then((r) => r.json()).catch(() => []);
      if (Array.isArray(j)) setList(j);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  // Statistics & NPS calculations
  const total = list.length;
  const avgRating = total ? (list.reduce((s, f) => s + f.rating, 0) / total).toFixed(1) : "5.0";

  const promoters = list.filter((f) => f.rating >= 4).length;
  const _passives = list.filter((f) => f.rating === 3).length;
  const detractors = list.filter((f) => f.rating <= 2).length;
  const npsScore = total ? Math.round(((promoters - detractors) / total) * 100) : 100;

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: list.filter((f) => f.rating === s).length,
    percentage: total ? Math.round((list.filter((f) => f.rating === s).length / total) * 100) : 0,
  }));

  const copyFeedbackLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/feedback/demo-table` : "https://restronex.vercel.app/feedback/demo-table";
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Guest Feedback & Google Review Booster</h1>
          <p className="text-sm text-[#718078]">
            Automated post-meal feedback routing • 5-Star Google Maps review redirection • Private detractor escalation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={copyFeedbackLink}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied Link!" : "Copy Guest Feedback Link"}
          </Button>

          <Button
            variant="outline"
            onClick={loadFeedback}
            disabled={loading}
            className="rounded-full border-[#E5EBE7] bg-white text-xs font-semibold hover:bg-[#F8FAF9] p-2.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Average Rating</div>
            <div className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
              <span>★</span> {avgRating} <span className="text-xs text-[#718078] font-normal">/ 5.0</span>
            </div>
            <div className="text-[10px] text-[#718078] mt-0.5">{total} verified reviews</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Net Promoter Score (NPS)</div>
            <div className="text-2xl font-black text-[#16845B] mt-1">+{npsScore}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">{promoters} promoters • {detractors} detractors</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Positive Sentiment</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {total ? Math.round((promoters / total) * 100) : 100}%
            </div>
            <div className="text-[10px] text-[#718078] mt-0.5">Rated 4 or 5 stars</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Manager Escalations</div>
            <div className="text-2xl font-black text-[#172B25] mt-1">{detractors}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Private complaints handled</div>
          </CardContent>
        </Card>
      </div>

      {/* Star Distribution & Google Review Booster Card */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Star Rating Breakdown */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25] text-base">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {starCounts.map((s) => (
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
          </CardContent>
        </Card>

        {/* Google Review Booster Configuration */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25] text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#16845B]" />
              Google Review Booster Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <p className="text-xs text-[#718078] leading-relaxed">
              When diners leave a <b>4 or 5-star rating</b> on their digital bill, RestroNex automatically prompts them to post their glowing review directly to your <b>Google Maps profile</b>.
            </p>

            <div>
              <Label className="text-xs font-bold text-[#172B25]">Your Restaurant Google Maps Review Link</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={googleReviewLink}
                  onChange={(e) => setGoogleReviewLink(e.target.value)}
                  placeholder="https://g.page/r/.../review or https://maps.google.com"
                  className="bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl flex-1 text-[#172B25]"
                />
                <a
                  href={googleReviewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Test Link
                </a>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 text-xs text-[#16845B] space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <Award className="h-4 w-4" /> 100% Negative Review Shield
              </div>
              <div className="text-[11px] text-[#172B25]/80">
                Any rating below 4 stars is captured privately and never redirected to Google, protecting your restaurant&apos;s public reputation.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guest Feedback Table */}
      <Card className="bg-white border-[#E5EBE7] shadow-sm">
        <CardHeader className="border-b border-[#E5EBE7] pb-3">
          <CardTitle className="text-base text-[#172B25] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#16845B]" />
              Verified Guest Feedback Feed ({list.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-[#E5EBE7]">
          {list.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718078]">
              No feedback collected yet. Print QR codes on bills or copy the guest feedback link above to start collecting ratings.
            </div>
          ) : (
            list.map((f) => (
              <div key={f.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAF9]/50 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold text-sm tracking-widest">
                      {"★".repeat(f.rating)}
                      {"☆".repeat(5 - f.rating)}
                    </span>
                    <span className="text-xs font-black text-[#172B25]">{f.rating} / 5</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        f.rating >= 4
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : f.rating === 3
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {f.rating >= 4 ? "Promoter" : f.rating === 3 ? "Neutral" : "Detractor"}
                    </span>
                  </div>

                  <div className="text-xs text-[#172B25] mt-1 font-medium">
                    {f.comment || <span className="text-[#718078] italic">No written remarks submitted</span>}
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#718078] shrink-0 self-end sm:self-center">
                  {new Date(f.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
