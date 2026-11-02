"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";

export default function OrdersPage(){
  const [orders,setOrders]=useState<any[]>([]);
  const [filter,setFilter]=useState("ALL");

  async function load(){
    const j=await apiFetch("/api/orders").then(r=>r.json()).catch(()=>[]);
    if(Array.isArray(j)) setOrders(j);
  }

  useEffect(()=>{ load(); },[]);

  const filtered = filter==="ALL" ? orders : orders.filter(o=>o.status===filter);
  const stats = {
    total: orders.length,
    open: orders.filter(o=>o.status==="OPEN").length,
    billed: orders.filter(o=>o.status==="BILLED").length,
    revenue: orders.reduce((s,o)=>s+o.totalPaise,0)
  };

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Orders</h1>
          <p className="text-sm text-[#718078]">{stats.total} total • {stats.open} open • {stats.billed} billed • {formatINR(stats.revenue)} revenue</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL","OPEN","BILLED","CANCELLED"].map(s=> (
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
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Recent Orders — Tenant Isolated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {filtered.length===0 ? (
            <div className="text-sm text-[#718078] py-8 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
              No orders found. Bill your first order from the POS interface.
            </div>
          ) : (
            filtered.map(o=> (
              <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-4 py-3.5 hover:bg-white hover:shadow-xs transition">
                <div>
                  <div className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                    <span>{o.orderNumber} • {o.type}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      o.status==="BILLED" ? "bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7]" : "bg-slate-100 text-[#718078]"
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#718078] mt-1">{o.customerName||"Walk-in"} {o.customerPhone ? `• ${o.customerPhone}` : ""} • {new Date(o.createdAt).toLocaleString()}</div>
                  <div className="text-xs text-[#172B25] mt-1 font-medium">{o.items?.map((it:any)=> `${it.quantity}× ${it.name}`).join(", ")}</div>
                </div>
                <div className="text-right sm:self-center">
                  <div className="text-base font-black text-[#16845B]">{formatINR(o.totalPaise)}</div>
                  <div className="text-xs text-[#718078]">{o.payments?.[0]?.method||"CASH"} • {o.outlet?.name || ""}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
