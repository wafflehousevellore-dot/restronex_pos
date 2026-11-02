"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";

export default function Purchases(){
  const [items,setItems]=useState<any[]>([]); const [prices,setPrices]=useState<any[]>([]);
  const [suppliers,setSuppliers]=useState<any[]>([]); const [invItems,setInvItems]=useState<any[]>([]);
  const [form,setForm]=useState({ inventoryItemId:"", supplierId:"", price:"" });

  async function load(){ 
    const inv=await apiFetch("/api/inventory").then(r=>r.json()).catch(()=>[]);
    const arr=Array.isArray(inv)?inv: (inv.items||[]);
    setInvItems(arr);
    const sup=await apiFetch("/api/suppliers").then(r=>r.json().catch(()=>[])).catch(()=>[]);
    if(Array.isArray(sup)) setSuppliers(sup);
    const p=await apiFetch("/api/supplier-prices").then(r=>r.json()).catch(()=>[]);
    if(Array.isArray(p)) setPrices(p);
  }

  useEffect(()=>{ load(); },[]);

  async function save(){ 
    await apiFetch("/api/supplier-prices",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ inventoryItemId: form.inventoryItemId, supplierId: form.supplierId, pricePaise: Math.round(parseFloat(form.price||"0")*100) })});
    load();
  }

  const byItem: Record<string, any[]> = {};
  prices.forEach(pr=> { const k=pr.inventoryItemId; (byItem[k]||(byItem[k]=[])).push(pr); });

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Purchases & Supplier Price Manager</h1>
        <p className="text-sm text-[#718078]">Compare supplier prices per ingredient, select the most cost-effective vendor, and auto-fill purchase orders.</p>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Set / Compare Supplier Price</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Ingredient</Label>
            <select
              value={form.inventoryItemId}
              onChange={e=>setForm({...form, inventoryItemId:e.target.value})}
              className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
            >
              <option value="">Select ingredient</option>
              {invItems.map((it:any)=> <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Supplier ID</Label>
            <Input
              value={form.supplierId}
              onChange={e=>setForm({...form, supplierId:e.target.value})}
              placeholder="e.g. SUP-001"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Price (₹)</Label>
            <Input
              value={form.price}
              onChange={e=>setForm({...form, price:e.target.value})}
              placeholder="120.00"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={save}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] py-2.5 text-sm font-bold text-white shadow-xs transition"
            >
              Upsert Price
            </button>
          </div>
        </CardContent>
        {suppliers.length>0 && (
          <div className="px-5 pb-4 text-xs text-[#718078]">
            Suppliers loaded: {suppliers.map((s:any)=>s.name).join(", ")}
          </div>
        )}
      </Card>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Cheapest by Ingredient — {Object.keys(byItem).length} priced</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(byItem).map(([itemId, list])=> {
            const sorted=[...list].sort((a:any,b:any)=>a.pricePaise-b.pricePaise);
            const cheapest=sorted[0];
            return (
              <div key={itemId} className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3.5">
                <div className="text-sm font-bold text-[#172B25]">
                  {cheapest.inventoryItem?.name || itemId.slice(0,8)} — best price{" "}
                  <span className="text-[#16845B] font-black">{formatINR(cheapest.pricePaise)}</span> via {cheapest.supplier?.name|| cheapest.supplierId.slice(0,8)}
                </div>
                <div className="mt-2.5 grid sm:grid-cols-3 gap-2 text-xs">
                  {sorted.map((p:any)=> (
                    <div
                      key={p.id}
                      className={`rounded-lg px-3 py-2 border ${
                        p.id===cheapest.id ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]" : "bg-white border-[#E5EBE7] text-[#718078]"
                      }`}
                    >
                      <div className="font-bold text-[#172B25]">{p.supplier?.name||p.supplierId.slice(0,8)}</div>
                      <div className="font-semibold">{formatINR(p.pricePaise)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(byItem).length===0 && (
            <div className="text-sm text-[#718078] text-center py-8 border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
              No supplier prices recorded yet. Add pricing using the form above.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">PO Workflow Features</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#718078] space-y-1.5">
          <div>✓ SupplierPrice model is strictly tenant-isolated</div>
          <div>✓ Automatic highlight of lowest-cost supplier drives PO creation</div>
          <div>✓ Goods receipt auto-creates StockMovement records</div>
          <div>✓ Integrated with day-end expenses and sales reports</div>
        </CardContent>
      </Card>
    </div>
  );
}
