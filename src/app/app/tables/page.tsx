"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function TablesPage(){
  const [tables,setTables]=useState<any[]>([]);
  const [form,setForm]=useState({ number:"", area:"Main Hall", capacity:"4" });
  async function load(){ const j=await apiFetch("/api/tables").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setTables(j); }
  useEffect(()=>{ load();},[]);
  async function create(){
    await apiFetch("/api/tables",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ number: form.number, area: form.area, capacity: parseInt(form.capacity||"4") })});
    load();
  }
  async function toggleStatus(id:string, current:string){
    const next = current==="AVAILABLE" ? "OCCUPIED" : current==="OCCUPIED" ? "RESERVED" : "AVAILABLE";
    await apiFetch("/api/tables",{method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ tableId:id, status:next })});
    load();
  }
  const byArea = tables.reduce((a:any,t:any)=>{ (a[t.area]=a[t.area]||[]).push(t); return a; }, {});
  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black tracking-tight">Tables — Floor Plan</h1><p className="text-sm text-white/50">{tables.length} tables • tap to cycle AVAILABLE → OCCUPIED → RESERVED</p></div><span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/60">{Object.keys(byArea).length} areas</span></div>
      <DarkCard>
        <DarkCardHeader><DarkCardTitle>Add Table</DarkCardTitle></DarkCardHeader>
        <DarkCardContent className="grid sm:grid-cols-4 gap-3">
          <div><Label className="text-white/60">Number</Label><Input value={form.number} onChange={e=>setForm({...form, number:e.target.value})} placeholder="T13" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
          <div><Label className="text-white/60">Area</Label><Input value={form.area} onChange={e=>setForm({...form, area:e.target.value})} placeholder="Main Hall" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
          <div><Label className="text-white/60">Capacity</Label><Input value={form.capacity} onChange={e=>setForm({...form, capacity:e.target.value})} type="number" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
          <div className="flex items-end"><button onClick={create} className="w-full rounded-full bg-[#3D954F] py-2.5 text-sm font-bold text-white hover:bg-[#2e7a3e]">Add Table</button></div>
        </DarkCardContent>
      </DarkCard>
      {Object.entries(byArea).map(([area, list]:any)=> (
        <DarkCard key={area}><DarkCardHeader><DarkCardTitle>{area} — {(list as any[]).length} tables</DarkCardTitle></DarkCardHeader>
          <DarkCardContent className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {(list as any[]).map(t=> (
              <button key={t.id} onClick={()=>toggleStatus(t.id, t.status)} className={`rounded-2xl border p-4 text-center transition hover:scale-[1.02] ${t.status==="AVAILABLE"?"bg-white/5 border-white/10 text-white hover:bg-white/10": t.status==="OCCUPIED"?"bg-[#3D954F] border-[#3D954F] text-white": t.status==="RESERVED"?"bg-amber-500/20 border-amber-500/30 text-amber-200":"bg-white/5"}`}>
                <div className="text-lg font-black">{t.number}</div><div className="text-xs opacity-70">Cap {t.capacity}</div><div className="mt-1 text-[10px] font-bold tracking-widest">{t.status}</div>
              </button>
            ))}
          </DarkCardContent>
        </DarkCard>
      ))}
      {tables.length===0 && <div className="text-sm text-white/40 text-center py-8 border border-dashed border-white/10 rounded-2xl">No tables — onboarding seeds 12 tables (Main Hall/Terrace/AC)</div>}
    </div>
  );
}
