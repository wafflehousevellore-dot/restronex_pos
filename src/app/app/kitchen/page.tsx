"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";

export default function KitchenPage(){
  const [tickets,setTickets]=useState<any[]>([]);
  const [filter,setFilter]=useState("ALL");
  async function load(){ const j=await apiFetch("/api/kds").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setTickets(j); }
  useEffect(()=>{ load(); const id=setInterval(load, 5000); return ()=>clearInterval(id); },[]);
  async function update(id:string, status:string){ await apiFetch("/api/kds",{method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ ticketId:id, status })}); load(); }
  const filtered = filter==="ALL" ? tickets : tickets.filter(t=> t.status===filter);
  const cols: Record<string, any[]> = { RECEIVED: [], PREPARING: [], READY: [], COMPLETED: [] };
  filtered.forEach(t=> cols[t.status]?.push(t));
  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black tracking-tight">Kitchen Display (KDS)</h1><p className="text-sm text-white/50">Auto-fired on bill • stations MAIN/BEVERAGE/DESSERT • bump workflow</p></div><span className="rounded-full bg-[#3D954F]/15 border border-[#3D954F]/20 px-3 py-1 text-xs font-bold text-[#3D954F]">LIVE polling 5s</span></div>
      <div className="flex gap-2 flex-wrap">{["ALL","RECEIVED","PREPARING","READY","COMPLETED"].map(s=> <button key={s} onClick={()=>setFilter(s)} className={`rounded-full px-4 py-1.5 text-xs font-bold border ${filter===s?"bg-[#3D954F] text-white border-[#3D954F]":"bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}>{s}</button>)}</div>
      {filtered.length===0 ? <DarkCard className="p-8 text-center text-sm text-white/40">No kitchen tickets yet — place an order via POS.</DarkCard> :
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(cols).map(([status, list])=> (
            <div key={status} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-black tracking-widest text-white/60">{status} • {(list as any[]).length}</div>
              <div className="mt-3 space-y-3">{(list as any[]).map(t=> (
                <div key={t.id} className={`rounded-2xl border p-3 ${status==="RECEIVED"?"bg-[#3D954F]/10 border-[#3D954F]/20": status==="PREPARING"?"bg-blue-500/10 border-blue-500/20": status==="READY"?"bg-emerald-500/10 border-emerald-500/20":"bg-white/5 border-white/5"}`}>
                  <div className="flex justify-between items-center"><span className="text-sm font-bold text-white">{t.order?.orderNumber || t.orderId.slice(0,8)}</span><span className="text-[10px] rounded-full bg-white/10 px-2 py-0.5 text-white/60">{t.station}</span></div>
                  <div className="text-xs text-white/40">{new Date(t.createdAt).toLocaleTimeString()} • P{t.priority}</div>
                  <ul className="mt-2 space-y-1 text-sm">{t.order?.items?.map((it:any)=> <li key={it.id} className="flex justify-between text-white/80"><span>{it.quantity}× {it.name}</span><span className="text-xs text-white/40">{it.kotStatus}</span></li>)}</ul>
                  <div className="mt-3 flex gap-2">
                    {t.status==="RECEIVED" && <button onClick={()=>update(t.id,"PREPARING")} className="flex-1 rounded-full bg-[#3D954F] py-2 text-xs font-bold text-white">Start</button>}
                    {t.status==="PREPARING" && <button onClick={()=>update(t.id,"READY")} className="flex-1 rounded-full bg-amber-500 py-2 text-xs font-bold text-black">Ready</button>}
                    {t.status==="READY" && <button onClick={()=>update(t.id,"COMPLETED")} className="flex-1 rounded-full bg-white text-black py-2 text-xs font-bold">Bump ✓</button>}
                  </div>
                </div>
              ))}{ (list as any[]).length===0 && <div className="text-xs text-white/30 py-4 text-center">Empty</div>}</div>
            </div>
          ))}
        </div>
      }
      <DarkCard><DarkCardContent className="pt-6 text-xs text-white/40">Stations: Main / Beverage / Dessert. Polling every 5s. Bump updates POS. If socket unavailable, honest “polling” badge shown.</DarkCardContent></DarkCard>
    </div>
  );
}
