"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
export default function Reservations(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({ outletId:"", date:"", partySize:"2", name:"", phone:"" });
  const [outlets,setOutlets]=useState<any[]>([]);
  async function load(){ const j=await apiFetch("/api/reservations").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setList(j); }
  async function loadOutlets(){ const o=await apiFetch("/api/outlets").then(r=>r.json()).catch(()=>[]); if(Array.isArray(o)) setOutlets(o); }
  useEffect(()=>{ load(); loadOutlets(); },[]);
  async function create(){ await apiFetch("/api/reservations",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({...form, partySize: parseInt(form.partySize||"2"), date: form.date || new Date().toISOString()})}); load(); }
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-black">Reservations — Table Reservation Manager</h1>
      <DarkCard><DarkCardHeader><DarkCardTitle>New Reservation</DarkCardTitle></DarkCardHeader><DarkCardContent className="grid sm:grid-cols-5 gap-3">
        <div><Label className="text-white/60">Outlet</Label><select value={form.outletId} onChange={e=>setForm({...form, outletId:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option value="" className="text-black">Select</option>{outlets.map(o=> <option key={o.id} value={o.id} className="text-black">{o.name}</option>)}</select></div>
        <div><Label className="text-white/60">Name</Label><Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Amit" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div><Label className="text-white/60">Phone</Label><Input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="+91" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div><Label className="text-white/60">Party</Label><Input value={form.partySize} onChange={e=>setForm({...form, partySize:e.target.value})} type="number" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div className="flex items-end"><button onClick={create} className="w-full rounded-full bg-[#3D954F] py-2.5 text-sm font-bold text-white">Book</button></div>
      </DarkCardContent></DarkCard>
      <DarkCard><DarkCardHeader><DarkCardTitle>Upcoming — {list.length}</DarkCardTitle></DarkCardHeader><DarkCardContent className="space-y-2">
        {list.map(r=> <div key={r.id} className="flex justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"><div><div className="text-sm font-bold text-white">{r.name} • {r.partySize} pax • <span className="text-[#3D954F]">{r.status}</span></div><div className="text-xs text-white/40">{r.phone} • {new Date(r.date).toLocaleString()}</div></div><span className="text-xs rounded-full bg-white/10 px-2 py-1 text-white/60">{r.outlet?.name||r.outletId.slice(0,8)}</span></div>)}
        {list.length===0 && <div className="text-sm text-white/40 text-center py-6 border border-dashed border-white/10 rounded-xl">No reservations — book first</div>}
      </DarkCardContent></DarkCard>
    </div>
  );
}
