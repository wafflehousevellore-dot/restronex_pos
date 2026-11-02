"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function OutletsPage(){
  const [outlets,setOutlets]=useState<any[]>([]);
  const [form,setForm]=useState({ name:"", address:"", city:"", phone:"" });

  async function load(){
    const j=await apiFetch("/api/outlets").then(r=>r.json()).catch(()=>[]);
    if(Array.isArray(j)) setOutlets(j);
  }

  useEffect(()=>{ load(); },[]);

  async function create(){
    const tenants = await apiFetch("/api/tenants").then(r=>r.json()).catch(()=>[]);
    let tenantId = null;
    if(Array.isArray(tenants) && tenants[0]) tenantId = tenants[0].tenant?.id || tenants[0].tenantId;
    if(!tenantId && outlets[0]) tenantId = outlets[0].tenantId;
    if(!tenantId) alert("Create business first in Onboarding");
    else {
      await apiFetch("/api/outlets",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ tenantId, name: form.name, address: form.address, city: form.city, phone: form.phone })});
      setForm({name:"", address:"", city:"", phone:""});
      load();
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Outlets — Multi-Outlet Management</h1>
        <p className="text-sm text-[#718078]">Central management for multi-branch dining, inventory, and cross-outlet reporting.</p>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Create Outlet</CardTitle>
          <p className="text-xs text-[#718078]">Authorized owner / head office action • validated against plan limits</p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Outlet Name</Label>
            <Input
              value={form.name}
              onChange={e=>setForm({...form, name:e.target.value})}
              placeholder="e.g. Indiranagar Branch"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">City</Label>
            <Input
              value={form.city}
              onChange={e=>setForm({...form, city:e.target.value})}
              placeholder="Bengaluru"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Address</Label>
            <Input
              value={form.address}
              onChange={e=>setForm({...form, address:e.target.value})}
              placeholder="100 Feet Road, Indiranagar"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Contact Phone</Label>
            <Input
              value={form.phone}
              onChange={e=>setForm({...form, phone:e.target.value})}
              placeholder="+91 98765 43210"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div className="sm:col-span-2 pt-2">
            <button
              onClick={create}
              className="rounded-full bg-[#16845B] hover:bg-[#116B49] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition"
            >
              Create Outlet
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {outlets.map(o=> (
          <Card key={o.id} className="bg-white border-[#E5EBE7] shadow-xs hover:border-[#16845B] transition">
            <CardContent className="pt-6">
              <div className="text-base font-bold text-[#172B25]">{o.name}</div>
              <div className="text-sm text-[#718078] mt-1">{o.address} • {o.city}</div>
              <div className="text-xs text-[#718078] mt-1.5">{o.serviceModes} • Status: <span className="text-[#16845B] font-semibold">{o.status}</span></div>
              <div className="mt-3 inline-block rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2.5 py-0.5 text-xs font-bold text-[#16845B]">
                {o.slug}
              </div>
            </CardContent>
          </Card>
        ))}
        {outlets.length===0 && (
          <Card className="p-8 text-sm text-[#718078] text-center border-dashed border-[#E5EBE7] bg-[#F8FAF9] col-span-full">
            No outlets found. Complete onboarding or add an outlet above.
          </Card>
        )}
      </div>

      <Card className="bg-white border-[#E5EBE7]">
        <CardContent className="pt-4 pb-4 text-xs text-[#718078]">
          Central menu push: preview + confirm + audit. Outlet-specific overrides and pricing rules supported.
        </CardContent>
      </Card>
    </div>
  );
}
