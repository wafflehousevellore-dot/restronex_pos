"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";

export default function MenuPage(){
  const [cats,setCats]=useState<any[]>([]);
  const [items,setItems]=useState<any[]>([]);
  const [newCat,setNewCat]=useState("");
  const [newItem,setNewItem]=useState({name:"", price:"", categoryId:""});
  const [msg,setMsg]=useState<string|null>(null);
  const [filter,setFilter]=useState("All");
  async function load(){
    const j=await apiFetch("/api/menu").then(r=>r.json()).catch(()=>({cats:[], items:[]}));
    if(j.cats) setCats(j.cats);
    if(j.items) setItems(j.items);
  }
  useEffect(()=>{ load(); },[]);
  async function createCat(){
    if(!newCat) return;
    const res=await apiFetch("/api/menu",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ type:"category", name:newCat})});
    if(res.ok){ setNewCat(""); load(); setMsg("Category created"); } else setMsg("Failed");
  }
  async function createItem(){
    const paise = Math.round(parseFloat(newItem.price||"0")*100);
    const res=await apiFetch("/api/menu",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ type:"item", name:newItem.name, pricePaise:paise, categoryId:newItem.categoryId })});
    if(res.ok){ setNewItem({name:"", price:"", categoryId: newItem.categoryId}); load(); setMsg("Item created"); } else setMsg("Failed — check category");
  }
  const categories = cats.map(c=>c.name);
  const filtered = filter==="All" ? items : items.filter((it:any)=> cats.find((c:any)=>c.id===it.categoryId)?.name===filter);
  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black tracking-tight">Universal Menu Management</h1><p className="text-sm text-white/50">Single source for POS / KOT / Inventory • outlet pricing ready</p></div>
        <span className="rounded-full bg-[#3D954F]/15 border border-[#3D954F]/20 px-3 py-1 text-xs font-bold text-[#3D954F]">{items.length} items • {cats.length} categories</span>
      </div>
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <DarkCard>
          <DarkCardHeader><DarkCardTitle>Add Category</DarkCardTitle></DarkCardHeader>
          <DarkCardContent className="space-y-3">
            <div><Label className="text-white/60">Category name</Label><Input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Pizza" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
            <button onClick={createCat} className="w-full rounded-full bg-white text-black py-2.5 text-sm font-bold hover:bg-white/90">Create Category</button>
            <div className="pt-2 flex flex-wrap gap-2">{cats.map((c:any)=> <span key={c.id} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/70">{c.name}</span>)}</div>
          </DarkCardContent>
        </DarkCard>
        <DarkCard>
          <DarkCardHeader><DarkCardTitle>Add Item</DarkCardTitle></DarkCardHeader>
          <DarkCardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div><Label className="text-white/60">Item name</Label><Input value={newItem.name} onChange={e=>setNewItem({...newItem, name:e.target.value})} placeholder="Margherita Pizza" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
              <div><Label className="text-white/60">Price (₹)</Label><Input value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} placeholder="299" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
            </div>
            <div><Label className="text-white/60">Category</Label>
              <select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
                <option value="" className="text-black">Select category</option>{cats.map((c:any)=> <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
              </select>
            </div>
            <button onClick={createItem} className="w-full rounded-full bg-[#3D954F] py-2.5 text-sm font-bold text-white hover:bg-[#2e7a3e]">Create Item</button>
            {msg && <div className="text-xs p-2 rounded-xl bg-[#3D954F]/15 border border-[#3D954F]/20 text-white">{msg}</div>}
          </DarkCardContent>
        </DarkCard>
      </div>
      <DarkCard>
        <DarkCardHeader><DarkCardTitle>Menu Items</DarkCardTitle><div className="mt-3 flex gap-2 flex-wrap">{["All",...categories].map(c=> <button key={c} onClick={()=>setFilter(c)} className={`rounded-full px-3 py-1 text-xs font-bold border ${filter===c?"bg-[#3D954F] text-white border-[#3D954F]":"bg-white/5 border-white/10 text-white/60"}`}>{c}</button>)}</div></DarkCardHeader>
        <DarkCardContent>
          {filtered.length===0 ? <div className="text-sm text-white/40 py-6 text-center border border-dashed border-white/10 rounded-xl">No items — create category then item</div> :
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{filtered.map((it:any)=> (
            <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="flex justify-between items-start"><span className="text-sm font-bold text-white">{it.name}</span><span className="text-xs rounded-full bg-[#3D954F]/15 border border-[#3D954F]/20 px-2 py-0.5 text-[#3D954F]">{formatINR(it.pricePaise)}</span></div>
              <div className="text-xs text-white/40 mt-1">{cats.find((c:any)=>c.id===it.categoryId)?.name || "—"} • {it.isVeg ? "VEG" : "NON-VEG"} {it.isSoldOut && "• SOLD OUT"}</div>
            </div>
          ))}</div>}
        </DarkCardContent>
      </DarkCard>
    </div>
  );
}
