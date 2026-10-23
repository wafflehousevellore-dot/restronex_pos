"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
export default function Feedback(){
  const [list,setList]=useState<any[]>([]);
  async function load(){ const j=await apiFetch("/api/feedback").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setList(j); }
  useEffect(()=>{ load(); },[]);
  const avg = list.length ? (list.reduce((s:any,f:any)=> s+f.rating,0)/list.length).toFixed(1) : "—";
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-black">Feedback — QR & Rating</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <DarkCard><DarkCardHeader><DarkCardTitle>Avg Rating</DarkCardTitle></DarkCardHeader><DarkCardContent><div className="text-3xl font-black text-[#3D954F]">{avg} / 5</div><div className="text-xs text-white/40">{list.length} responses</div></DarkCardContent></DarkCard>
        <DarkCard><DarkCardHeader><DarkCardTitle>QR</DarkCardTitle></DarkCardHeader><DarkCardContent className="text-sm text-white/60">Per-order QR at /qr/[outletSlug]/[orderId] — scan → rate 1-5 + comment. Honest NPS.</DarkCardContent></DarkCard>
        <DarkCard><DarkCardHeader><DarkCardTitle>Actions</DarkCardTitle></DarkCardHeader><DarkCardContent><button onClick={load} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Refresh</button></DarkCardContent></DarkCard>
      </div>
      <DarkCard><DarkCardHeader><DarkCardTitle>Recent Feedback</DarkCardTitle></DarkCardHeader><DarkCardContent className="space-y-2">
        {list.map(f=> <div key={f.id} className="flex justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"><div><div className="text-sm font-bold text-white">{"★".repeat(f.rating)}{"☆".repeat(5-f.rating)} <span className="text-white/40">• {f.rating}/5</span></div><div className="text-xs text-white/60">{f.comment||"—"}</div></div><span className="text-xs text-white/40">{new Date(f.createdAt).toLocaleString()}</span></div>)}
        {list.length===0 && <div className="text-sm text-white/40 text-center py-6 border border-dashed border-white/10 rounded-xl">No feedback yet — QR scan creates entry</div>}
      </DarkCardContent></DarkCard>
    </div>
  );
}
