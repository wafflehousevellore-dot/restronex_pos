"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    if(res.ok){ setNewCat(""); load(); setMsg("Category created successfully"); } else setMsg("Failed to create category");
  }

  async function createItem(){
    const paise = Math.round(parseFloat(newItem.price||"0")*100);
    const res=await apiFetch("/api/menu",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ type:"item", name:newItem.name, pricePaise:paise, categoryId:newItem.categoryId })});
    if(res.ok){ setNewItem({name:"", price:"", categoryId: newItem.categoryId}); load(); setMsg("Item created successfully"); } else setMsg("Failed — select a category");
  }

  const categories = cats.map(c=>c.name);
  const filtered = filter==="All" ? items : items.filter((it:any)=> cats.find((c:any)=>c.id===it.categoryId)?.name===filter);

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Universal Menu Management</h1>
          <p className="text-sm text-[#718078]">Single source for POS / KOT / Inventory • outlet pricing ready</p>
        </div>
        <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-3.5 py-1 text-xs font-bold text-[#16845B]">
          {items.length} items • {cats.length} categories
        </span>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Add Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-[#718078] text-xs font-semibold">Category name</Label>
              <Input
                value={newCat}
                onChange={e=>setNewCat(e.target.value)}
                placeholder="e.g. Beverages"
                className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
              />
            </div>
            <button
              onClick={createCat}
              className="w-full rounded-full border border-[#E5EBE7] bg-white text-[#172B25] py-2.5 text-sm font-bold hover:bg-[#F8FAF9] shadow-xs transition"
            >
              Create Category
            </button>
            <div className="pt-2 flex flex-wrap gap-1.5">
              {cats.map((c:any)=> (
                <span key={c.id} className="rounded-full bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1 text-xs text-[#172B25] font-medium">
                  {c.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Add Menu Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_130px] gap-3">
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Item name</Label>
                <Input
                  value={newItem.name}
                  onChange={e=>setNewItem({...newItem, name:e.target.value})}
                  placeholder="e.g. Masala Chai"
                  className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                />
              </div>
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Price (₹)</Label>
                <Input
                  value={newItem.price}
                  onChange={e=>setNewItem({...newItem, price:e.target.value})}
                  placeholder="50"
                  className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-[#718078] text-xs font-semibold">Category</Label>
              <select
                value={newItem.categoryId}
                onChange={e=>setNewItem({...newItem, categoryId:e.target.value})}
                className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2.5 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
              >
                <option value="">Select category</option>
                {cats.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button
              onClick={createItem}
              className="w-full rounded-full bg-[#16845B] py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs transition"
            >
              Create Item
            </button>
            {msg && (
              <div className="text-xs p-2.5 rounded-xl bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] font-medium">
                {msg}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Menu Items</CardTitle>
          <div className="mt-3 flex gap-2 flex-wrap">
            {["All",...categories].map(c=> (
              <button
                key={c}
                onClick={()=>setFilter(c)}
                className={`rounded-full px-3.5 py-1 text-xs font-bold border transition ${
                  filter===c
                    ? "bg-[#16845B] text-white border-[#16845B] shadow-xs"
                    : "bg-white border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length===0 ? (
            <div className="text-sm text-[#718078] py-8 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
              No items in this category. Create your first category and items above.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((it:any)=> (
                <div key={it.id} className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 hover:bg-white hover:border-[#16845B] hover:shadow-xs transition">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-[#172B25]">{it.name}</span>
                    <span className="text-xs rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2.5 py-0.5 text-[#16845B] font-black">
                      {formatINR(it.pricePaise)}
                    </span>
                  </div>
                  <div className="text-xs text-[#718078] mt-1.5">
                    {cats.find((c:any)=>c.id===it.categoryId)?.name || "—"} • {it.isVeg ? "VEG" : "NON-VEG"} {it.isSoldOut && "• SOLD OUT"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
