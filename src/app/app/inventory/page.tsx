"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function InventoryPage(){
  const [data,setData]=useState<any>(null);
  const [form,setForm]=useState({ name:"", unit:"KG", currentStock:"", lowStockThreshold:"5", costPerUnitPaise:"" });

  async function load(){
    const j=await apiFetch("/api/inventory").then(r=>r.json()).catch(()=>null);
    setData(j);
  }

  useEffect(()=>{ load(); },[]);

  async function add(){
    await apiFetch("/api/inventory",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ name: form.name, unit: form.unit, currentStock: parseFloat(form.currentStock||"0"), lowStockThreshold: parseFloat(form.lowStockThreshold||"5"), costPerUnitPaise: Math.round(parseFloat(form.costPerUnitPaise||"0")*100) })});
    load();
    setForm({ name:"", unit:"KG", currentStock:"", lowStockThreshold:"5", costPerUnitPaise:"" });
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Inventory & Stock</h1>
        <p className="text-sm text-[#718078]">Tenant-isolated • weighted average valuation • automatic deduction on order billing</p>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Add Raw Material</CardTitle>
          <p className="text-xs text-[#718078]">Configure ingredient stock and alert thresholds</p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-5 gap-3">
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Item Name</Label>
            <Input
              value={form.name}
              onChange={e=>setForm({...form, name:e.target.value})}
              placeholder="e.g. Tomatoes"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Unit</Label>
            <select
              value={form.unit}
              onChange={e=>setForm({...form, unit:e.target.value})}
              className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2.5 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
            >
              <option>KG</option>
              <option>LTR</option>
              <option>PCS</option>
              <option>G</option>
            </select>
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Current Stock</Label>
            <Input
              value={form.currentStock}
              onChange={e=>setForm({...form, currentStock:e.target.value})}
              placeholder="50"
              type="number"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Low Alert Threshold</Label>
            <Input
              value={form.lowStockThreshold}
              onChange={e=>setForm({...form, lowStockThreshold:e.target.value})}
              placeholder="5"
              type="number"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={add}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] py-2.5 text-sm font-bold text-white shadow-xs transition"
            >
              Add Material
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Current Stock — {data?.items?.length||0} items</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.items?.length ? (
            data.items.map((it:any)=> (
              <div
                key={it.id}
                className={`rounded-2xl border p-4 shadow-xs ${
                  it.currentStock <= it.lowStockThreshold
                    ? "bg-red-50 border-red-200"
                    : "bg-[#F8FAF9] border-[#E5EBE7] hover:bg-white"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-[#172B25]">{it.name}</span>
                  <span className={`text-xs rounded-full px-2.5 py-0.5 font-bold ${
                    it.currentStock <= it.lowStockThreshold
                      ? "bg-red-600 text-white"
                      : "bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7]"
                  }`}>
                    {it.currentStock} {it.unit}
                  </span>
                </div>
                <div className="text-xs text-[#718078] mt-2">
                  Low stock at {it.lowStockThreshold} {it.unit} • Cost {(it.costPerUnitPaise/100).toFixed(0)}₹/{it.unit}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-[#718078] py-8 border border-dashed border-[#E5EBE7] rounded-xl text-center col-span-full bg-[#F8FAF9]">
              No inventory tracked yet. Add your raw materials above to enable recipe deductions.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data?.movements?.length ? (
            data.movements.map((m:any)=> (
              <div key={m.id} className="flex justify-between items-center border-b border-[#E5EBE7] py-2.5 text-xs">
                <span className="text-[#172B25] font-medium">{m.type} • {m.quantity} • {m.reference||"—"}</span>
                <span className="text-[#718078]">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-[#718078] py-4 text-center">No stock movements recorded yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
