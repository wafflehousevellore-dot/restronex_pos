"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function InventoryPage(){
  const [data,setData]=useState<any>(null);
  const [form,setForm]=useState({ name:"", unit:"KG", currentStock:"", lowStockThreshold:"5", costPerUnitPaise:"" });
  async function load(){ const j=await apiFetch("/api/inventory").then(r=>r.json()).catch(()=>null); setData(j); }
  useEffect(()=>{ load();},[]);
  async function add(){
    await apiFetch("/api/inventory",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: form.name, unit: form.unit, currentStock: parseFloat(form.currentStock||"0"), lowStockThreshold: parseFloat(form.lowStockThreshold||"5"), costPerUnitPaise: Math.round(parseFloat(form.costPerUnitPaise||"0")*100) })});
    load(); setForm({ name:"", unit:"KG", currentStock:"", lowStockThreshold:"5", costPerUnitPaise:"" });
  }
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-black tracking-tight">Inventory & Stock</h1>
      <DarkCard>
        <DarkCardHeader><DarkCardTitle>Add Raw Material</DarkCardTitle><p className="text-xs text-white/40">Tenant-isolated • weighted avg valuation • movement history</p></DarkCardHeader>
        <DarkCardContent className="grid sm:grid-cols-5 gap-3">
          <div><Label className="text-white/60">Name</Label><Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Tomato" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
          <div><Label className="text-white/60">Unit</Label><select value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"><option className="text-black">KG</option><option className="text-black">LTR</option><option className="text-black">PCS</option><option className="text-black">G</option></select></div>
          <div><Label className="text-white/60">Stock</Label><Input value={form.currentStock} onChange={e=>setForm({...form, currentStock:e.target.value})} placeholder="50" type="number" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
          <div><Label className="text-white/60">Low threshold</Label><Input value={form.lowStockThreshold} onChange={e=>setForm({...form, lowStockThreshold:e.target.value})} placeholder="5" type="number" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
          <div className="flex items-end"><button onClick={add} className="w-full rounded-full bg-[#3D954F] py-2.5 text-sm font-bold text-white hover:bg-[#2e7a3e]">Add</button></div>
        </DarkCardContent>
      </DarkCard>
      <DarkCard>
        <DarkCardHeader><DarkCardTitle>Current Stock — {data?.items?.length||0} items</DarkCardTitle></DarkCardHeader>
        <DarkCardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.items?.length ? data.items.map((it:any)=> (
            <div key={it.id} className={`rounded-2xl border p-4 ${it.currentStock <= it.lowStockThreshold ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10"}`}>
              <div className="flex justify-between items-center"><span className="text-sm font-bold text-white">{it.name}</span><span className={`text-xs rounded-full px-2 py-0.5 font-bold ${it.currentStock <= it.lowStockThreshold ? "bg-red-500 text-white":"bg-white/10 text-white/60"}`}>{it.currentStock} {it.unit}</span></div>
              <div className="text-xs text-white/40">Low at {it.lowStockThreshold} {it.unit} • Cost {(it.costPerUnitPaise/100).toFixed(0)}₹/{it.unit}</div>
            </div>
          )) : <div className="text-sm text-white/40 py-4 border border-dashed border-white/10 rounded-xl text-center col-span-full">No inventory yet — add raw materials. Deduction on billed orders only.</div>}
        </DarkCardContent>
      </DarkCard>
      <DarkCard><DarkCardHeader><DarkCardTitle>Movement History</DarkCardTitle></DarkCardHeader><DarkCardContent className="space-y-2 text-sm">{data?.movements?.length ? data.movements.map((m:any)=> <div key={m.id} className="flex justify-between border-b border-white/5 py-2"><span className="text-white/70">{m.type} • {m.quantity} • {m.reference||"—"}</span><span className="text-xs text-white/40">{new Date(m.createdAt).toLocaleString()}</span></div>) : <div className="text-white/40">No movements yet.</div>}</DarkCardContent></DarkCard>
    </div>
  );
}
