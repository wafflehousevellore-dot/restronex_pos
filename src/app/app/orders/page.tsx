"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";

export default function OrdersPage(){
  const [orders,setOrders]=useState<any[]>([]);
  const [filter,setFilter]=useState("ALL");
  async function load(){ const j=await apiFetch("/api/orders").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setOrders(j); }
  useEffect(()=>{ load(); },[]);
  const filtered = filter==="ALL" ? orders : orders.filter(o=>o.status===filter);
  const stats = { total: orders.length, open: orders.filter(o=>o.status==="OPEN").length, billed: orders.filter(o=>o.status==="BILLED").length, revenue: orders.reduce((s,o)=>s+o.totalPaise,0) };
  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black tracking-tight">Orders</h1><p className="text-sm text-white/50">{stats.total} total • {stats.open} open • {stats.billed} billed • {formatINR(stats.revenue)} revenue</p></div>
        <div className="flex gap-2">{["ALL","OPEN","BILLED","CANCELLED"].map(s=> <button key={s} onClick={()=>setFilter(s)} className={`rounded-full px-4 py-1.5 text-xs font-bold border ${filter===s?"bg-[#3D954F] text-white border-[#3D954F]":"bg-white/5 border-white/10 text-white/60"}`}>{s}</button>)}</div>
      </div>
      <DarkCard>
        <DarkCardHeader><DarkCardTitle>Recent Orders — persisted, tenant-isolated</DarkCardTitle></DarkCardHeader>
        <DarkCardContent className="space-y-2">
          {filtered.length===0 ? <div className="text-sm text-white/40 py-6 text-center border border-dashed border-white/10 rounded-xl">No orders yet — bill via POS</div> :
            filtered.map(o=> (
              <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10 transition">
                <div><div className="text-sm font-bold text-white">{o.orderNumber} • {o.type} • <span className={`rounded-full px-2 py-0.5 text-xs ${o.status==="BILLED"?"bg-[#3D954F] text-white":"bg-white/10 text-white/70"}`}>{o.status}</span></div><div className="text-xs text-white/40">{o.customerName||"Walk-in"} {o.customerPhone||""} • {new Date(o.createdAt).toLocaleString()}</div><div className="text-xs text-white/60 mt-0.5">{o.items?.map((it:any)=> `${it.quantity}× ${it.name}`).join(", ")}</div></div>
                <div className="text-right"><div className="text-sm font-black text-white">{formatINR(o.totalPaise)}</div><div className="text-xs text-white/40">{o.payments?.[0]?.method||"CASH"} • {o.outlet?.name || ""}</div></div>
              </div>
            ))}
        </DarkCardContent>
      </DarkCard>
    </div>
  );
}
