"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function TablesPage(){
  const [tables,setTables]=useState<any[]>([]);
  const [form,setForm]=useState({ number:"", area:"Main Hall", capacity:"4" });

  async function load(){
    const j=await apiFetch("/api/tables").then(r=>r.json()).catch(()=>[]);
    if(Array.isArray(j)) setTables(j);
  }

  useEffect(()=>{ load(); },[]);

  async function create(){
    await apiFetch("/api/tables",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ number: form.number, area: form.area, capacity: parseInt(form.capacity||"4") })});
    setForm({ number:"", area:"Main Hall", capacity:"4" });
    load();
  }

  async function toggleStatus(id:string, current:string){
    const next = current==="AVAILABLE" ? "OCCUPIED" : current==="OCCUPIED" ? "RESERVED" : "AVAILABLE";
    await apiFetch("/api/tables",{method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ tableId:id, status:next })});
    load();
  }

  const byArea = tables.reduce((a:any,t:any)=>{ (a[t.area]=a[t.area]||[]).push(t); return a; }, {});

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Tables — Floor Plan</h1>
          <p className="text-sm text-[#718078]">{tables.length} tables • tap to cycle AVAILABLE → OCCUPIED → RESERVED</p>
        </div>
        <span className="rounded-full bg-white border border-[#E5EBE7] px-3 py-1 text-xs text-[#718078] font-medium shadow-xs">
          {Object.keys(byArea).length} areas
        </span>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Add Table</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Table Number</Label>
            <Input
              value={form.number}
              onChange={e=>setForm({...form, number:e.target.value})}
              placeholder="e.g. T13"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Area / Section</Label>
            <Input
              value={form.area}
              onChange={e=>setForm({...form, area:e.target.value})}
              placeholder="Main Hall"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Capacity (Seats)</Label>
            <Input
              value={form.capacity}
              onChange={e=>setForm({...form, capacity:e.target.value})}
              type="number"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={create}
              className="w-full rounded-full bg-[#16845B] py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs transition"
            >
              Add Table
            </button>
          </div>
        </CardContent>
      </Card>

      {Object.entries(byArea).map(([area, list]:any)=> (
        <Card key={area} className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">{area} — {(list as any[]).length} tables</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {(list as any[]).map(t=> (
              <button
                key={t.id}
                onClick={()=>toggleStatus(t.id, t.status)}
                className={`rounded-2xl border p-4 text-center transition hover:scale-[1.02] shadow-xs ${
                  t.status==="AVAILABLE"
                    ? "bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25] hover:bg-white hover:border-[#16845B]" :
                  t.status==="OCCUPIED"
                    ? "bg-[#16845B] border-[#16845B] text-white" :
                  t.status==="RESERVED"
                    ? "bg-amber-50 border-amber-300 text-amber-900" :
                  "bg-white border-[#E5EBE7]"
                }`}
              >
                <div className="text-lg font-black">{t.number}</div>
                <div className="text-xs opacity-80">Cap {t.capacity}</div>
                <div className="mt-1 text-[10px] font-bold tracking-wider uppercase">{t.status}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}

      {tables.length===0 && (
        <div className="text-sm text-[#718078] text-center py-10 border border-dashed border-[#E5EBE7] rounded-2xl bg-white">
          No tables found. Add your first table above or run Onboarding to seed default tables.
        </div>
      )}
    </div>
  );
}
