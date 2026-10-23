"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
export default function OutletsPage(){
  const [outlets,setOutlets]=useState<any[]>([]);
  const [form,setForm]=useState({ name:"", address:"", city:"", phone:"" });
  async function load(){ const j=await apiFetch("/api/outlets").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setOutlets(j); }
  useEffect(()=>{ load();},[]);
  async function create(){
    const tenants = await apiFetch("/api/tenants").then(r=>r.json()).catch(()=>[]);
    let tenantId = null;
    if(Array.isArray(tenants) && tenants[0]) tenantId = tenants[0].tenant?.id || tenants[0].tenantId;
    if(!tenantId && outlets[0]) tenantId = outlets[0].tenantId;
    if(!tenantId) alert("Create business first in Onboarding");
    else {
      await apiFetch("/api/outlets",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ tenantId, name: form.name, address: form.address, city: form.city, phone: form.phone })});
      setForm({name:"", address:"", city:"", phone:""}); load();
    }
  }
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-black tracking-tight">Outlets — Multi-Outlet Management</h1>
      <DarkCard><DarkCardHeader><DarkCardTitle>Create Outlet</DarkCardTitle><p className="text-xs text-white/40">Owner / Head Office only • server-checked</p></DarkCardHeader><DarkCardContent className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-white/60">Name</Label><Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="MG Road Outlet" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
        <div><Label className="text-white/60">City</Label><Input value={form.city} onChange={e=>setForm({...form, city:e.target.value})} placeholder="Bengaluru" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div><Label className="text-white/60">Address</Label><Input value={form.address} onChange={e=>setForm({...form, address:e.target.value})} placeholder="MG Road, Bengaluru" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div><Label className="text-white/60">Phone</Label><Input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="+91 98…" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div className="sm:col-span-2"><button onClick={create} className="rounded-full bg-[#3D954F] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2e7a3e]">Create Outlet</button></div>
      </DarkCardContent></DarkCard>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {outlets.map(o=> <DarkCard key={o.id}><DarkCardContent className="pt-6"><div className="text-sm font-bold text-white">{o.name}</div><div className="text-sm text-white/60">{o.address} • {o.city}</div><div className="text-xs text-white/40 mt-1">{o.serviceModes} • {o.status}</div><div className="mt-2 inline rounded-full bg-[#3D954F]/15 border border-[#3D954F]/20 px-2 py-0.5 text-xs text-[#3D954F]">{o.slug}</div></DarkCardContent></DarkCard>)}
        {outlets.length===0 && <DarkCard className="p-6 text-sm text-white/40 text-center border-dashed">No outlets — onboard first.</DarkCard>}
      </div>
      <DarkCard><DarkCardContent className="pt-6 text-xs text-white/40">Central menu push: preview + confirm + audit. Outlet-specific overrides and pricing rules supported.</DarkCardContent></DarkCard>
    </div>
  );
}
