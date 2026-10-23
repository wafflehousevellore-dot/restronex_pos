"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function CustomersPage(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({ name:"", phone:"", email:"" });
  async function load(){ const j=await apiFetch("/api/customers").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setList(j); }
  useEffect(()=>{ load(); },[]);
  async function add(){
    await apiFetch("/api/customers",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(form)});
    setForm({name:"", phone:"", email:""}); load();
  }
  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black tracking-tight">Customers & Loyalty</h1><span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/60">{list.length} profiles</span></div>
      <DarkCard>
        <DarkCardHeader><DarkCardTitle>Add Customer</DarkCardTitle><p className="text-xs text-white/40">Phone unique per tenant • loyalty earn on paid orders</p></DarkCardHeader>
        <DarkCardContent className="grid sm:grid-cols-4 gap-3">
          <div><Label className="text-white/60">Name</Label><Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Rahul" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
          <div><Label className="text-white/60">Phone</Label><Input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="+91 98…" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
          <div><Label className="text-white/60">Email</Label><Input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="rahul@…" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
          <div className="flex items-end"><button onClick={add} className="w-full rounded-full bg-[#3D954F] py-2.5 text-sm font-bold text-white">Add</button></div>
        </DarkCardContent>
      </DarkCard>
      <DarkCard>
        <DarkCardHeader><DarkCardTitle>CRM Profiles</DarkCardTitle></DarkCardHeader>
        <DarkCardContent className="space-y-2">
          {list.length ? list.map((c:any)=> <div key={c.id} className="flex justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"><div><div className="text-sm font-bold text-white">{c.name||"—"} <span className="text-white/40">• {c.phone}</span></div><div className="text-xs text-white/40">{c.email||""} • {c.totalOrders||0} orders • {c.loyaltyPoints||0} pts • {c.segment||"NEW"}</div></div><span className="text-xs rounded-full bg-white/10 px-2 py-1 text-white/60">{c.phone}</span></div>) : <div className="text-sm text-white/40 py-4 text-center border border-dashed border-white/10 rounded-xl">No customers yet — billed orders auto-create profile</div>}
        </DarkCardContent>
      </DarkCard>
      <DarkCard><DarkCardContent className="pt-6 text-xs text-white/40">CRM: order history, loyalty earn/redeem, segments, campaigns (opt-in only). Phone unique per tenant. PII access-controlled.</DarkCardContent></DarkCard>
    </div>
  );
}
