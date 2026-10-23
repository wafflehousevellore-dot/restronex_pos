"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
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
    // suppliers via outlets? use generic supplier list if exists
    // fallback: try /api/suppliers else empty
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
  // group by item
  const byItem: Record<string, any[]> = {};
  prices.forEach(pr=> { const k=pr.inventoryItemId; (byItem[k]||(byItem[k]=[])).push(pr); });

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-xl font-black">Purchases & Purchase Manager — Price Compare</h1>
      <DarkCard><DarkCardContent className="pt-6 text-sm text-white/60"><b className="text-white">Purchase Manager</b> — compare supplier prices per ingredient, pick cheapest, auto-fill PO. SupplierPrice is tenant-isolated with unique(item, supplier). Scale includes vendor ledger.</DarkCardContent></DarkCard>

      <DarkCard><DarkCardHeader><DarkCardTitle>Set / Compare Price</DarkCardTitle></DarkCardHeader><DarkCardContent className="grid sm:grid-cols-4 gap-3">
        <div><Label className="text-white/60">Ingredient</Label><select value={form.inventoryItemId} onChange={e=>setForm({...form, inventoryItemId:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option value="" className="text-black">Select</option>{invItems.map((it:any)=> <option key={it.id} value={it.id} className="text-black">{it.name} ({it.unit})</option>)}</select></div>
        <div><Label className="text-white/60">Supplier ID</Label><Input value={form.supplierId} onChange={e=>setForm({...form, supplierId:e.target.value})} placeholder="paste supplier id" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div><Label className="text-white/60">Price ₹</Label><Input value={form.price} onChange={e=>setForm({...form, price:e.target.value})} placeholder="120.00" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
        <div className="flex items-end"><button onClick={save} className="w-full rounded-full bg-[#3D954F] py-2.5 text-sm font-bold text-white">Upsert Price</button></div>
      </DarkCardContent>
      {suppliers.length>0 && <div className="px-5 pb-4 text-xs text-white/40">Suppliers loaded: {suppliers.map((s:any)=>s.name).join(", ")}</div>}
      </DarkCard>

      <DarkCard><DarkCardHeader><DarkCardTitle>Cheapest by Ingredient — {Object.keys(byItem).length} priced</DarkCardTitle></DarkCardHeader><DarkCardContent className="space-y-3">
        {Object.entries(byItem).map(([itemId, list])=> {
          const sorted=[...list].sort((a:any,b:any)=>a.pricePaise-b.pricePaise);
          const cheapest=sorted[0];
          return (
            <div key={itemId} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-bold text-white">{cheapest.inventoryItem?.name || itemId.slice(0,8)} — cheapest <span className="text-[#3D954F]">{formatINR(cheapest.pricePaise)}</span> via {cheapest.supplier?.name|| cheapest.supplierId.slice(0,8)}</div>
              <div className="mt-2 grid sm:grid-cols-3 gap-2 text-xs">
                {sorted.map((p:any)=> <div key={p.id} className={`rounded-lg px-3 py-2 border ${p.id===cheapest.id?"bg-[#3D954F]/15 border-[#3D954F]/30 text-white":"bg-white/5 border-white/10 text-white/60"}`}><div className="font-bold">{p.supplier?.name||p.supplierId.slice(0,8)}</div><div>{formatINR(p.pricePaise)}</div></div>)}
              </div>
            </div>
          );
        })}
        {Object.keys(byItem).length===0 && <div className="text-sm text-white/40 text-center py-6 border border-dashed border-white/10 rounded-xl">No supplier prices — add first via form above</div>}
      </DarkCardContent></DarkCard>

      <DarkCard><DarkCardHeader><DarkCardTitle>PO Workflow</DarkCardTitle></DarkCardHeader><DarkCardContent className="text-sm text-white/60 space-y-1"><div>✓ SupplierPrice model (unique item+supplier) tenant-isolated</div><div>✓ Cheapest auto-highlight drives PO creation</div><div>✓ Goods receipt → StockMovement PURCHASE</div><div>✓ Day-end consumes Expense + Sales</div></DarkCardContent></DarkCard>
    </div>
  );
}
