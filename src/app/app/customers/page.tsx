"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function CustomersPage(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({ name:"", phone:"", email:"" });

  async function load(){
    const j=await apiFetch("/api/customers").then(r=>r.json()).catch(()=>[]);
    if(Array.isArray(j)) setList(j);
  }

  useEffect(()=>{ load(); },[]);

  async function add(){
    await apiFetch("/api/customers",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(form)});
    setForm({name:"", phone:"", email:""});
    load();
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Customers & Loyalty CRM</h1>
          <p className="text-sm text-[#718078]">Phone number is unique per tenant • loyalty points earned on paid orders</p>
        </div>
        <span className="rounded-full bg-white border border-[#E5EBE7] px-3.5 py-1 text-xs text-[#718078] font-medium shadow-xs">
          {list.length} profiles
        </span>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Add Customer Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Customer Name</Label>
            <Input
              value={form.name}
              onChange={e=>setForm({...form, name:e.target.value})}
              placeholder="e.g. Rahul Sharma"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Phone Number</Label>
            <Input
              value={form.phone}
              onChange={e=>setForm({...form, phone:e.target.value})}
              placeholder="+91 98765 43210"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Email Address</Label>
            <Input
              value={form.email}
              onChange={e=>setForm({...form, email:e.target.value})}
              placeholder="rahul@example.com"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={add}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] py-2.5 text-sm font-bold text-white shadow-xs transition"
            >
              Add Profile
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">CRM Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {list.length ? (
            list.map((c:any)=> (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-4 py-3.5 hover:bg-white hover:shadow-xs transition">
                <div>
                  <div className="text-sm font-bold text-[#172B25]">{c.name||"—"} <span className="text-[#718078] font-normal">• {c.phone}</span></div>
                  <div className="text-xs text-[#718078] mt-1">{c.email||""} • {c.totalOrders||0} orders • {c.loyaltyPoints||0} loyalty pts • {c.segment||"NEW"}</div>
                </div>
                <span className="text-xs rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-3 py-1 text-[#16845B] font-semibold self-start sm:self-center">
                  {c.phone}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-[#718078] py-8 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
              No customer profiles yet. Billed orders will automatically build your customer database.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E5EBE7]">
        <CardContent className="pt-4 pb-4 text-xs text-[#718078]">
          CRM features: order history, loyalty points earn & redeem, customer segmentation, opt-in campaign notifications.
        </CardContent>
      </Card>
    </div>
  );
}
