"use client";
import { useState, useMemo } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { apiFetch } from "@/lib/api";
import { Tag, Check, X, CreditCard, Banknote, QrCode } from "lucide-react";

type MenuItem = { id:string; name:string; pricePaise:number; categoryId:string; isVeg:boolean; category?:{name:string} };
type Table = { id:string; number:string; status:string; area:string };
type Outlet = { id:string; name:string };

function calculateCouponDiscount(code: string, subtotalPaise: number): number {
  const c = code.trim().toUpperCase();
  if (c === "PAY2" || c === "TEST2" || c === "RS2" || c === "100OFF" || c === "TEST100" || c === "TESTPAY" || c === "2RS" || c === "100%" || c === "FREE" || c === "2RUPEES") {
    // Discount down to 169 paise taxable so 169 + 15 cgst + 15 sgst = ~200 paise (₹2.00)
    return Math.max(0, subtotalPaise - 169);
  }
  if (c === "SAVE10" || c === "WELCOME10") return Math.round(subtotalPaise * 0.1);
  if (c === "FLAT50") return Math.min(5000, subtotalPaise);
  if (c === "CHEF20" || c === "FESTIVE20") return Math.round(subtotalPaise * 0.2);
  return 0;
}

export default function POSClient({ initialItems, initialTables, initialOutlets }: { initialItems: MenuItem[]; initialTables: Table[]; initialOutlets: Outlet[] }){
  const [items] = useState<MenuItem[]>(initialItems);
  const [tables] = useState<Table[]>(initialTables);
  const [outlets] = useState<Outlet[]>(initialOutlets);
  const [selectedOutlet,setSelectedOutlet]=useState<string>(initialOutlets[0]?.id || "");
  const [selectedTable,setSelectedTable]=useState<string>("");
  const [orderType,setOrderType]=useState<"DINE_IN"|"TAKEAWAY"|"DELIVERY">("DINE_IN");
  const [cart,setCart]=useState<{menuItemId:string; name:string; quantity:number; unitPricePaise:number}[]>([]);
  const [customerName,setCustomerName]=useState("");
  const [customerPhone,setCustomerPhone]=useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPaise: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [msg,setMsg]=useState<{type:"success"|"error"|"info"; text:string}|null>(null);
  const [categoryFilter,setCategoryFilter]=useState<string>("All");
  const [posting,setPosting]=useState(false);
  const [lastOrder,setLastOrder]=useState<{orderNumber:string; total:number} | null>(null);

  const categories = useMemo(()=> Array.from(new Set(items.map(i=> (i.category?.name || "Other").trim()).filter(Boolean))), [items]);
  const filtered = useMemo(()=> categoryFilter==="All" ? items : items.filter(i=> (i.category?.name?.trim()||"Other")===categoryFilter), [items, categoryFilter]);

  function addToCart(it: MenuItem){
    if (!it?.id || typeof it.pricePaise !== 'number') return;
    setCart(c=> {
      const idx=c.findIndex(x=>x.menuItemId===it.id);
      if(idx>=0){ const copy=[...c]; copy[idx]={...copy[idx], quantity: (copy[idx].quantity||0)+1}; return copy; }
      return [...c,{menuItemId:it.id, name: it.name, quantity:1, unitPricePaise: it.pricePaise}];
    });
    setMsg(null);
  }
  function decQty(idx:number){
    setCart(c=>{
      const copy=[...c];
      const q = Math.max(1, (copy[idx]?.quantity||1)-1);
      copy[idx]={...copy[idx], quantity: q};
      return copy;
    });
  }
  function incQty(idx:number){
    setCart(c=>{
      const copy=[...c];
      copy[idx]={...copy[idx], quantity: (copy[idx].quantity||0)+1};
      return copy;
    });
  }
  function removeItem(idx:number){ setCart(c=> c.filter((_,i)=> i!==idx)); }

  const subtotal = cart.reduce((s,c)=> s + (Number(c.unitPricePaise)||0)*(Number(c.quantity)||0),0);
  const discountPaise = appliedCoupon ? Math.min(appliedCoupon.discountPaise, subtotal) : 0;
  const taxable = Math.max(0, subtotal - discountPaise);
  const cgst = Math.round(taxable * 0.09);
  const sgst = Math.round(taxable * 0.09);
  const total = taxable + cgst + sgst;

  function applyPOSCoupon(codeToApply?: string) {
    const target = (codeToApply || couponCode).trim().toUpperCase();
    if (!target) {
      setCouponError("Enter a coupon code");
      return;
    }
    if (cart.length === 0) {
      setCouponError("Add items to cart before applying coupon");
      return;
    }
    const discount = calculateCouponDiscount(target, subtotal);
    if (discount > 0) {
      setAppliedCoupon({ code: target, discountPaise: discount });
      setCouponCode(target);
      setCouponError(null);
    } else {
      setCouponError(`Invalid coupon code.`);
    }
  }

  function removePOSCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  }

  async function placeOrder(){
    if(!selectedOutlet) return setMsg({type:"error", text:"Select an outlet first — complete 8-Step Onboarding to create your business."});
    if(cart.length===0) return setMsg({type:"error", text:"Cart is empty — tap menu items to add."});
    if(selectedTable && orderType !== "DINE_IN"){
      return setMsg({type:"error", text:"Tables only for Dine-in orders. Change order type to Dine-in or clear table."});
    }
    // Validate quantities
    for(const c of cart){ if(!c.menuItemId || c.quantity <1 || c.unitPricePaise <0) return setMsg({type:"error", text:`Invalid item ${c.name} — remove and re-add.`}); }
    setPosting(true); setMsg({type:"info", text:"Placing order..."});
    try{
      const res=await apiFetch("/api/orders",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({
        outletId: selectedOutlet, type: orderType, tableId: selectedTable||undefined, customerName: customerName?.trim()||undefined, customerPhone: customerPhone?.trim()||undefined,
        items: cart.map(c=> ({ menuItemId:c.menuItemId, name:c.name, quantity:c.quantity, unitPricePaise:c.unitPricePaise })),
        discountPaise,
        paymentMethod,
      })});
      const text = await res.text();
      let j: Record<string, unknown> = {};
      try{ j=JSON.parse(text); }catch{ j={raw:text}; }
      if(!res.ok){
        const raw = (j.raw as string) || "";
        const errMsg = (j.error as string) || raw.slice(0,300) || `Failed ${res.status}`;
        if(raw.includes("e2b-traffic-access-token") || res.status===403){
          setMsg({type:"error", text:"Preview blocked — open via Arena LIVE PREVIEW and hard refresh (Ctrl+Shift+R), then retry."});
        } else if(res.status===401){
          setMsg({type:"error", text:"Session expired — sign in again via green Demo button."});
        } else {
          setMsg({type:"error", text: errMsg});
        }
        return;
      }
      const orderNumber = (j.orderNumber as string) || (j.orderId as string) || 'OK';
      const billedTotal = (j as unknown as { totals:{total:number}}).totals?.total ?? total;
      setLastOrder({orderNumber, total: billedTotal});
      setMsg({type:"success", text:`✓ Order ${orderNumber} billed via ${paymentMethod}! ${formatINR(billedTotal)} ${discountPaise>0 ? `(Saved ${formatINR(discountPaise)})` : ""} — KOT sent to kitchen.`});
      setCart([]);
      setAppliedCoupon(null);
      setCouponCode("");
    }catch(err: unknown){
      const m = err instanceof Error ? err.message : String(err);
      setMsg({type:"error", text: m.includes("Failed to fetch") ? "Network error — use Arena LIVE PREVIEW and hard refresh." : m});
    }finally{ setPosting(false); }
  }

  // Derive selected table label safely
  const selectedTableLabel = selectedTable ? (tables.find(t=>t.id===selectedTable)?.number || "") : "";

  if(initialItems.length===0 && initialOutlets.length===0){
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-white">POS — Billing</h1>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No outlets or menu found. Complete <a href="/app/onboarding" className="underline text-white font-bold">8-Step Onboarding</a> to seed demo data, or create items in <a href="/app/menu" className="underline">Menu</a>.
        </div>
        <DarkCard className="p-8 text-center">
          <div className="text-white/40 text-sm">POS needs at least 1 outlet and menu items. Demo seed creates Koramangala outlet + 7 items.</div>
        </DarkCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">POS — Billing</h1>
          <p className="text-sm text-white/50">Paise-precise • CGST 9% + SGST 9% • KOT auto-fired • {items.length} items</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={selectedOutlet} onChange={e=>setSelectedOutlet(e.target.value)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-[#3D954F] focus:outline-none">
            <option value="" className="text-black">Select outlet</option>
            {outlets.map(o=> <option key={o.id} value={o.id} className="text-black">{o.name}</option>)}
          </select>
          {outlets.length===0 && <span className="text-xs text-amber-300">No outlet — onboard first</span>}
        </div>
      </div>

      {lastOrder && (
        <div className="rounded-2xl border border-[#3D954F]/30 bg-[#3D954F]/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-sm font-black text-white">Last order: {lastOrder.orderNumber}</div><div className="text-xs text-white/60">Total {formatINR(lastOrder.total)} • Sent to kitchen • View in Orders / Kitchen</div></div>
          <div className="flex gap-2"><a href="/app/orders" className="rounded-full bg-white text-[#07110a] px-4 py-2 text-xs font-bold hover:bg-white/90">View Orders →</a><a href="/app/kitchen" className="rounded-full border border-white/20 bg-white/10 text-white px-4 py-2 text-xs font-bold hover:bg-white/20">KDS →</a></div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle>Menu {filtered.length>0 ? `• ${filtered.length}` : ""}</DarkCardTitle>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["All",...categories].map(c=> (
                <button key={c} onClick={()=>setCategoryFilter(c)} className={`rounded-full px-4 py-1.5 text-xs font-bold border transition ${categoryFilter===c?"bg-[#3D954F] text-white border-[#3D954F] shadow":"bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}>
                  {c}
                </button>
              ))}
            </div>
          </DarkCardHeader>
          <DarkCardContent>
            {items.length===0 ? (
              <div className="text-sm text-white/40 py-10 text-center rounded-xl border border-dashed border-white/10">
                No menu yet. <a href="/app/menu" className="text-[#3D954F] underline">Create items in Menu</a> or run Onboarding.
              </div>
            ) : filtered.length===0 ? (
              <div className="text-sm text-white/40 py-8 text-center">No items in {categoryFilter}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map(it=> (
                  <button key={it.id} onClick={()=>addToCart(it)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left hover:bg-white/[0.08] hover:border-[#3D954F]/40 transition group focus:outline-none focus:ring-2 focus:ring-[#3D954F]/50">
                    <div className="h-14 rounded-xl bg-gradient-to-br from-[#3D954F]/20 to-[#07110a] border border-[#3D954F]/20 flex items-center justify-center text-xs font-bold text-[#3D954F] group-hover:bg-[#3D954F] group-hover:text-white transition">
                      {it.isVeg ? "● VEG" : "● NON-VEG"}
                    </div>
                    <div className="mt-2 text-sm font-bold text-white truncate" title={it.name}>{it.name}</div>
                    <div className="text-xs text-white/60">{formatINR(it.pricePaise)}</div>
                    <div className="mt-1 text-[11px] text-[#3D954F] opacity-0 group-hover:opacity-100 transition">Tap to add →</div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div><Label className="text-white/70 text-xs">Order type</Label><select value={orderType} onChange={e=>setOrderType(e.target.value as typeof orderType)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#07110a] px-3 py-2.5 text-sm text-white focus:border-[#3D954F] focus:outline-none"><option value="DINE_IN" className="text-black">Dine-in</option><option value="TAKEAWAY" className="text-black">Takeaway</option><option value="DELIVERY" className="text-black">Delivery</option></select></div>
              <div><Label className="text-white/70 text-xs">Table {orderType!=="DINE_IN" && <span className="text-amber-300">(Dine-in only)</span>}</Label><select value={selectedTable} onChange={e=>setSelectedTable(e.target.value)} disabled={orderType!=="DINE_IN"} className="mt-1 w-full rounded-xl border border-white/10 bg-[#07110a] px-3 py-2.5 text-sm text-white focus:border-[#3D954F] focus:outline-none disabled:opacity-40"><option value="" className="text-black">No table</option>{tables.map(t=> <option key={t.id} value={t.id} className="text-black">{t.number} — {t.area} ({t.status})</option>)}</select></div>
              <div><Label className="text-white/70 text-xs">Customer phone</Label><Input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1 bg-[#07110a] border-white/10 text-white placeholder:text-white/30 focus:border-[#3D954F]" /></div>
            </div>
          </DarkCardContent>
        </DarkCard>

        <DarkCard className="h-fit lg:sticky lg:top-[80px] border-[#3D954F]/20 bg-[#0F1F14] shadow-xl">
          <DarkCardHeader>
            <DarkCardTitle className="flex items-center justify-between"><span>Current Order</span><span className="text-xs font-normal text-white/40">{cart.length} item{cart.length!==1?'s':''}</span></DarkCardTitle>
            <div className="text-xs text-white/40">CGST 9% + SGST 9% • Auto KOT • Paise math</div>
          </DarkCardHeader>
          <DarkCardContent className="space-y-3">
            <div><Label className="text-white/70 text-xs">Customer name</Label><Input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Walk-in (optional)" className="mt-1 bg-[#07110a] border-white/10 text-white placeholder:text-white/30 focus:border-[#3D954F]" /></div>

            {cart.length===0 ? (
              <div className="text-sm text-white/40 py-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">Cart empty<br/><span className="text-xs">Tap menu items to add</span></div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {cart.map((c,i)=> (
                  <div key={`${c.menuItemId}-${i}`} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                    <div className="min-w-0 flex-1"><div className="text-sm font-bold text-white truncate" title={c.name}>{c.name}</div><div className="text-xs text-white/50">{formatINR(c.unitPricePaise)} × {c.quantity} = {formatINR((c.unitPricePaise||0)*c.quantity)}</div></div>
                    <div className="flex items-center gap-1 ml-2">
                      <button aria-label="Decrease quantity" onClick={()=>decQty(i)} className="h-7 w-7 rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 flex items-center justify-center text-sm">−</button>
                      <span className="text-sm font-bold text-white w-6 text-center">{c.quantity}</span>
                      <button aria-label="Increase quantity" onClick={()=>incQty(i)} className="h-7 w-7 rounded-full bg-[#3D954F] text-white hover:bg-[#2e7a3e] flex items-center justify-center text-sm">+</button>
                      <button aria-label="Remove item" onClick={()=>removeItem(i)} className="ml-1 h-7 w-7 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Option Method */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-white/70 text-xs font-semibold flex items-center justify-between">
                <span>Payment Option Method</span>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">{paymentMethod}</span>
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["UPI", "CASH", "CARD"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-xl py-2 px-2 text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === m
                        ? "bg-[#3D954F] text-white border-[#3D954F] shadow-sm"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {m === "UPI" && <QrCode className="h-3.5 w-3.5" />}
                    {m === "CASH" && <Banknote className="h-3.5 w-3.5" />}
                    {m === "CARD" && <CreditCard className="h-3.5 w-3.5" />}
                    <span>{m === "UPI" ? "UPI / QR" : m === "CASH" ? "Cash" : "Card"}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Customer QR Code for UPI */}
              {paymentMethod === "UPI" && total > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span className="flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5 text-emerald-400" /> Customer Scan & Pay</span>
                    <span className="text-[11px] bg-emerald-400 text-slate-900 px-2 py-0.5 rounded-full font-black">{formatINR(total)}</span>
                  </div>
                  <div className="mx-auto w-fit p-2 bg-white rounded-xl shadow-lg border border-emerald-400/40">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=restronex@icici&pn=RestroNex%20Restaurant&am=${(total/100).toFixed(2)}&cu=INR`)}&margin=2`}
                      alt="Customer UPI QR Code"
                      className="w-28 h-28 object-contain rounded"
                    />
                  </div>
                  <div className="text-[10px] text-emerald-200/80 font-medium">Scan with GPay, PhonePe, Paytm, BHIM</div>
                </div>
              )}
            </div>

            {/* Coupon Code in Payment Option Method */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#3D954F]" /> Coupon Code
                </Label>
                {appliedCoupon && (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" /> {appliedCoupon.code} Applied
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponError(null); }}
                  placeholder="Enter code (e.g. SAVE10)"
                  className="bg-[#07110a] border-white/10 text-white placeholder:text-white/30 text-xs h-9 focus:border-[#3D954F]"
                />
                <button
                  type="button"
                  onClick={() => applyPOSCoupon()}
                  className="rounded-xl bg-[#3D954F] hover:bg-[#2e7a3e] text-white text-xs font-bold px-3.5 py-2 shrink-0 transition"
                >
                  Apply
                </button>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={removePOSCoupon}
                    className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 text-xs px-2.5 py-2 shrink-0 flex items-center justify-center"
                    title="Remove coupon"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>



              {couponError && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                  {couponError}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#070B07] border border-white/5 p-4 space-y-1.5">
              <div className="flex justify-between text-xs text-white/60"><span>Subtotal</span><span className="text-white font-semibold">{formatINR(subtotal)}</span></div>
              {discountPaise > 0 && (
                <div className="flex justify-between text-xs text-emerald-300 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>−{formatINR(discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-white/50"><span>CGST 9%</span><span>{formatINR(cgst)}</span></div>
              <div className="flex justify-between text-xs text-white/50"><span>SGST 9%</span><span>{formatINR(sgst)}</span></div>
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10"><span>Total Payable</span><span>{formatINR(total)}</span></div>
              <div className="text-[11px] text-white/30 text-center pt-1">Inclusive of all taxes • {orderType.replace('_',' ')} {selectedTableLabel ? `• Table ${selectedTableLabel}` : ''} • Pay via {paymentMethod}</div>
            </div>

            <button onClick={placeOrder} disabled={posting || cart.length===0} className="w-full rounded-full bg-[#3D954F] py-3.5 text-sm font-black text-white hover:bg-[#2e7a3e] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition flex items-center justify-center gap-2">
              {posting ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> Processing...</> : `Bill & Pay via ${paymentMethod} — ${formatINR(total)}`}
            </button>

            {msg && <div role="status" className={`text-xs p-3 rounded-xl border flex gap-2 break-words ${msg.type==="success" ? "bg-[#3D954F]/15 border-[#3D954F]/30 text-white" : msg.type==="error" ? "bg-red-500/10 border-red-500/30 text-red-200" : "bg-white/5 border-white/10 text-white/70"}`}>{msg.text}</div>}

            <div className="flex gap-2 text-xs">
              <button onClick={()=>{ setCart([]); setMsg(null); }} disabled={cart.length===0} className="flex-1 rounded-full border border-white/10 bg-white/5 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30">Clear cart</button>
              <a href="/app/kitchen" className="flex-1 rounded-full bg-white/5 border border-white/10 py-2 text-center text-white/70 hover:bg-white/10">KDS →</a>
            </div>
            <div className="text-[11px] text-white/25 text-center">Paise math • No float rounding • Razorpay on subscription only</div>
          </DarkCardContent>
        </DarkCard>
      </div>
    </div>
  );
}
