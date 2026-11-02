"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";

export default function Feedback() {
  const [list, setList] = useState<any[]>([]);

  async function load() {
    const j = await apiFetch("/api/feedback").then((r) => r.json()).catch(() => []);
    if (Array.isArray(j)) setList(j);
  }

  useEffect(() => {
    load();
  }, []);

  const avg = list.length ? (list.reduce((s: any, f: any) => s + f.rating, 0) / list.length).toFixed(1) : "—";

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Feedback — QR & Rating</h1>
        <p className="text-xs text-[#718078] mt-1">Guest ratings, net promoter score (NPS), and digital receipt feedback.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-sm font-bold text-[#718078]">Average Rating</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <div className="text-3xl font-black text-[#16845B]">{avg} / 5</div>
            <div className="text-xs text-[#718078] mt-1">{list.length} verified responses</div>
          </DarkCardContent>
        </DarkCard>

        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-sm font-bold text-[#718078]">QR Feedback Channel</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent className="text-sm text-[#718078] leading-relaxed">
            Per-order QR code printed on bills: guests scan to rate 1-5 stars and leave remarks.
          </DarkCardContent>
        </DarkCard>

        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-sm font-bold text-[#718078]">Sync Actions</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <button
              onClick={load}
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
            >
              Refresh Data
            </button>
          </DarkCardContent>
        </DarkCard>
      </div>

      <DarkCard>
        <DarkCardHeader>
          <DarkCardTitle className="text-base font-bold text-[#172B25]">Recent Feedback</DarkCardTitle>
        </DarkCardHeader>
        <DarkCardContent className="space-y-2">
          {list.map((f) => (
            <div
              key={f.id}
              className="flex justify-between items-center rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-4 py-3"
            >
              <div>
                <div className="text-sm font-bold text-amber-500">
                  {"★".repeat(f.rating)}
                  {"☆".repeat(5 - f.rating)}{" "}
                  <span className="text-[#172B25] font-semibold text-xs">• {f.rating}/5</span>
                </div>
                <div className="text-xs text-[#718078] mt-1">{f.comment || "No written remarks"}</div>
              </div>
              <span className="text-xs text-[#718078]">{new Date(f.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-sm text-[#718078] text-center py-8 border border-dashed border-[#E5EBE7] rounded-xl">
              No feedback collected yet. Scans on receipt QR codes will appear here.
            </div>
          )}
        </DarkCardContent>
      </DarkCard>
    </div>
  );
}
