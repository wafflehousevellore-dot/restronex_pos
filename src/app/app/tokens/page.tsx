"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
export default function Tokens(){
  const [tokens,setTokens]=useState<any[]>([]);
  const [outletId,setOutletId]=useState("");
  const [outlets,setOutlets]=useState<any[]>([]);
  async function loadOutlets(){ const o=await apiFetch("/api/outlets").then(r=>r.json()).catch(()=>[]); if(Array.isArray(o)) setOutlets(o); }
  async function load(){ if(!outletId) return; const j=await fetch(`/api/tokens?outletId=${outletId}`).then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setTokens(j); }
  useEffect(()=>{ loadOutlets(); },[]);
  useEffect(()=>{ load(); },[outletId]);
  async function issue(){ await apiFetch("/api/tokens",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ outletId })}); load(); }
  async function advance(id:string){ await apiFetch("/api/tokens",{method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ tokenId:id, status:"COMPLETED" })}); load(); }
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-black">Token Management — QSR Queue</h1>
      <DarkCard><DarkCardHeader><DarkCardTitle>Issue Token</DarkCardTitle></DarkCardHeader><DarkCardContent className="flex gap-3">
        <select value={outletId} onChange={e=>setOutletId(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option value="" className="text-black">Select outlet</option>{outlets.map(o=> <option key={o.id} value={o.id} className="text-black">{o.name}</option>)}</select>
        <button onClick={issue} className="rounded-full bg-[#3D954F] px-6 py-2 text-sm font-bold text-white">Issue Token</button>
        <button onClick={load} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Refresh</button>
      </DarkCardContent></DarkCard>
      <DarkCard><DarkCardHeader><DarkCardTitle>Queue — {tokens.length}</DarkCardTitle></DarkCardHeader><DarkCardContent className="grid sm:grid-cols-3 gap-3">
        {tokens.map(t=> <div key={t.id} className={`rounded-2xl border p-4 text-center ${t.status==="WAITING"?"bg-white/5 border-white/10":"bg-[#3D954F] text-white border-[#3D954F]"}`}><div className="text-2xl font-black">#{t.tokenNo}</div><div className="text-xs opacity-60">{t.status} • Pos {t.queuePos}</div><div className="text-xs opacity-40">{new Date(t.createdAt).toLocaleTimeString()}</div>{t.status==="WAITING" && <button onClick={()=>advance(t.id)} className="mt-2 rounded-full bg-white text-black px-3 py-1 text-xs font-bold">Complete</button>}</div>)}
        {tokens.length===0 && <div className="text-sm text-white/40 col-span-full text-center py-6 border border-dashed border-white/10 rounded-xl">No tokens — issue first</div>}
      </DarkCardContent></DarkCard>
      <DarkCard><DarkCardContent className="pt-6 text-xs text-white/40">Digital Display mirror at /display/[outletSlug] (planned). Token calling respects queuePos. Honest status: WAITING → COMPLETED.</DarkCardContent></DarkCard>
    </div>
  );
}
