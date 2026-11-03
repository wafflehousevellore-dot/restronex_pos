"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function KitchenPage(){
  const [tickets,setTickets]=useState<any[]>([]);
  const [filter,setFilter]=useState("ALL");

  async function load(){
    const j=await apiFetch("/api/kds").then(r=>r.json()).catch(()=>[]);
    if(Array.isArray(j)) setTickets(j);
  }

  useEffect(()=>{
    load();
    const id=setInterval(load, 5000);
    return ()=>clearInterval(id);
  },[]);

  async function update(id:string, status:string){
    await apiFetch("/api/kds",{method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ ticketId:id, status })});
    load();
  }

  const filtered = filter==="ALL" ? tickets : tickets.filter(t=> t.status===filter);
  const cols: Record<string, any[]> = { RECEIVED: [], PREPARING: [], READY: [], COMPLETED: [] };
  filtered.forEach(t=> cols[t.status]?.push(t));

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Kitchen Display (KDS)</h1>
          <p className="text-sm text-[#718078]">Auto-fired on bill • stations MAIN/BEVERAGE/DESSERT • bump workflow</p>
        </div>
        <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-3.5 py-1 text-xs font-bold text-[#16845B]">
          LIVE polling 5s
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["ALL","RECEIVED","PREPARING","READY","COMPLETED"].map(s=> (
          <button
            key={s}
            onClick={()=>setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold border transition ${
              filter===s ? "bg-[#16845B] text-white border-[#16845B] shadow-xs" : "bg-white border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length===0 ? (
        <Card className="p-10 text-center text-sm text-[#718078] bg-white border-[#E5EBE7]">
          No active kitchen tickets. Place an order from the POS interface to generate tickets.
        </Card>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          {Object.entries(cols).map(([status, list])=> (
            <div key={status} className="rounded-2xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
              <div className="text-xs font-bold tracking-wider text-[#718078] uppercase flex justify-between items-center pb-2 border-b border-[#E5EBE7]">
                <span>{status}</span>
                <span className="rounded-full bg-[#F8FAF9] px-2 py-0.5 text-[#172B25] font-bold">{(list as any[]).length}</span>
              </div>
              <div className="mt-3 space-y-3">
                {(list as any[]).map(t=> (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-3.5 shadow-xs ${
                      status==="RECEIVED" ? "bg-[#E8F5EE]/40 border-[#16845B]/30" :
                      status==="PREPARING" ? "bg-amber-50/60 border-amber-200" :
                      status==="READY" ? "bg-emerald-50/60 border-emerald-200" :
                      "bg-[#F8FAF9] border-[#E5EBE7]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-[#172B25]">{t.order?.orderNumber || t.orderId.slice(0,8)}</span>
                      <span className="text-[10px] rounded-full bg-white border border-[#E5EBE7] px-2 py-0.5 text-[#718078] font-bold">
                        {t.station}
                      </span>
                    </div>
                    <div className="text-xs text-[#718078] mt-1">{new Date(t.createdAt).toLocaleTimeString()} • Priority {t.priority}</div>
                    <ul className="mt-2.5 space-y-1.5 text-xs border-t border-slate-200/50 pt-2">
                      {t.order?.items?.map((it:any)=> (
                        <li key={it.id} className="flex justify-between text-[#172B25]">
                          <span className="font-semibold">{it.quantity}× {it.name}</span>
                          <span className="text-[11px] text-[#718078]">{it.kotStatus}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3.5 flex gap-2">
                      {t.status==="RECEIVED" && (
                        <button
                          onClick={()=>update(t.id,"PREPARING")}
                          className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] py-1.5 text-xs font-bold text-white shadow-xs"
                        >
                          Start Preparing
                        </button>
                      )}
                      {t.status==="PREPARING" && (
                        <button
                          onClick={()=>update(t.id,"READY")}
                          className="flex-1 rounded-full bg-amber-600 hover:bg-amber-700 py-1.5 text-xs font-bold text-white shadow-xs"
                        >
                          Mark Ready
                        </button>
                      )}
                      {t.status==="READY" && (
                        <button
                          onClick={()=>update(t.id,"COMPLETED")}
                          className="flex-1 rounded-full bg-[#172B25] hover:bg-black text-white py-1.5 text-xs font-bold shadow-xs"
                        >
                          Bump Ticket ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(list as any[]).length===0 && (
                  <div className="text-xs text-[#718078] py-6 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                    No tickets
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Card className="bg-white border-[#E5EBE7]">
        <CardContent className="pt-4 pb-4 text-xs text-[#718078]">
          Stations: Main / Beverage / Dessert. Auto-updates every 5s. Bump updates POS and kitchen status.
        </CardContent>
      </Card>
    </div>
  );
}
