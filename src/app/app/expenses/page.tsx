"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
export default function Expenses(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({ outletId:"", category:"Rent", amount:"", note:"" });
  const [outlets,setOutlets]=useState<any[]>([]);
  async function load(){ const j=await apiFetch("/api/expenses").then(r=>r.json()).catch(()=>[]); if(Array.isArray(j)) setList(j); }
  async function loadOutlets(){ const o=await apiFetch("/api/outlets").then(r=>r.json()).catch(()=>[]); if(Array.isArray(o)) setOutlets(o); }
  useEffect(()=>{ load(); loadOutlets(); },[]);
  async function add(){ await apiFetch("/api/expenses",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({...form, amountPaise: Math.round(parseFloat(form.amount||"0")*100)})}); setForm({...form, amount:"", note:""}); load(); }
  const total = list.reduce((s:any,l:any)=> s+l.amountPaise,0);
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-black">Expenses & P&L</h1>
      <DarkCard><DarkCardHeader><DarkCardTitle>Add Expense</DarkCardTitle></DarkCardHeader><DarkCardContent className="grid sm:grid-cols-5 gap-3">
        <div><Label className="text-white/60">Outlet</Label><select value={form.outletId} onChange={e=>setForm({...form, outletId:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option value="" className="text-black">Select</option>{outlets.map(o=> <option key={o.id} value={o.id} className="text-black">{o.name}</option>)}</select></div>
        <div><Label className="text-white/60">Category</Label><select value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option className="text-black">Rent</option><option className="text-black">Staff</option><option className="text-black">Utilities</option><option className="text-black">Marketing</option><option className="text-black">Other</option></select></div>
        <div><Label className="text-white/60">Amount ₹</Label><Input value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} placeholder="5000" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div><Label className="text-white/60">Note</Label><Input value={form.note} onChange={e=>setForm({...form, note:e.target.value})} placeholder="Monthly rent" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div className="flex items-end"><button onClick={add} className="w-full rounded-full bg-[#3D954F] py-2.5 text-sm font-bold text-white">Add</button></div>
      </DarkCardContent></DarkCard>
      <div className="grid sm:grid-cols-3 gap-4">
        <DarkCard><DarkCardHeader><DarkCardTitle>Total Expense</DarkCardTitle></DarkCardHeader><DarkCardContent><div className="text-2xl font-black text-white">{formatINR(total)}</div><div className="text-xs text-white/40">Day-end P&L = sales - COGS - expense</div></DarkCardContent></DarkCard>
        <DarkCard><DarkCardHeader><DarkCardTitle>Count</DarkCardTitle></DarkCardHeader><DarkCardContent><div className="text-2xl font-black text-white">{list.length}</div><div className="text-xs text-white/40">Entries</div></DarkCardContent></DarkCard>
        <DarkCard><DarkCardHeader><DarkCardTitle>Day-End</DarkCardTitle></DarkCardHeader><DarkCardContent><a href="/app/reports" className="text-sm text-[#3D954F]">View Night Audit →</a></DarkCardContent></DarkCard>
      </div>
      <DarkCard><DarkCardHeader><DarkCardTitle>Recent</DarkCardTitle></DarkCardHeader><DarkCardContent className="space-y-2">
        {list.map(e=> <div key={e.id} className="flex justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"><div><div className="text-sm font-bold text-white">{e.category} • {formatINR(e.amountPaise)}</div><div className="text-xs text-white/40">{e.note||"—"} • {new Date(e.createdAt).toLocaleDateString()}</div></div><span className="text-xs text-white/40">{e.outlet?.name||e.outletId.slice(0,8)}</span></div>)}
        {list.length===0 && <div className="text-sm text-white/40 text-center py-6 border border-dashed border-white/10 rounded-xl">No expenses — add first</div>}
      </DarkCardContent></DarkCard>
    </div>
  );
}
