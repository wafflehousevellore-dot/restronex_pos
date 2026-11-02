"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          setMsg({type:"error", text:"Preview blocked — refresh and retry."});
        } else if(res.status===401){
          setMsg({type:"error", text:"Session expired — please sign in again."});
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
      setMsg({type:"error", text: m});
    }finally{ setPosting(false); }
  }

  const selectedTableLabel = selectedTable ? (tables.find(t=>t.id===selectedTable)?.number || "") : "";

  if(initialItems.length===0 && initialOutlets.length===0){
    return (
      <div className="space-y-4 max-w-2xl mx-auto text-[#172B25]">
        <h1 className="text-2xl font-black text-[#172B25]">POS — Billing</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No outlets or menu found. Complete <a href="/app/onboarding" className="underline text-[#16845B] font-bold">8-Step Onboarding</a> to seed demo data, or create items in <a href="/app/menu" className="underline font-bold">Menu</a>.
        </div>
        <Card className="p-8 text-center bg-white border-[#E5EBE7]">
          <div className="text-[#718078] text-sm">POS needs at least 1 outlet and menu items. Demo seed creates Koramangala outlet + 7 items.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">POS — Billing</h1>
          <p className="text-sm text-[#718078]">Paise-precise • CGST 9% + SGST 9% • KOT auto-fired • {items.length} items</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedOutlet}
            onChange={e=>setSelectedOutlet(e.target.value)}
            className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none shadow-xs"
          >
            <option value="">Select outlet</option>
            {outlets.map(o=> <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {outlets.length===0 && <span className="text-xs text-amber-700 font-medium">No outlet — onboard first</span>}
        </div>
      </div>

      {lastOrder && (
        <div className="rounded-2xl border border-[#E5EBE7] bg-[#E8F5EE] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="text-sm font-black text-[#172B25]">Last order: {lastOrder.orderNumber}</div>
            <div className="text-xs text-[#718078]">Total {formatINR(lastOrder.total)} • Sent to kitchen • View in Orders / Kitchen</div>
          </div>
          <div className="flex gap-2">
            <a href="/app/orders" className="rounded-full bg-white border border-[#E5EBE7] text-[#172B25] px-4 py-2 text-xs font-bold hover:bg-[#F8FAF9] shadow-xs">
              View Orders →
            </a>
            <a href="/app/kitchen" className="rounded-full bg-[#16845B] text-white px-4 py-2 text-xs font-bold hover:bg-[#116B49] shadow-xs">
              KDS →
            </a>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_390px] gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Menu {filtered.length>0 ? `• ${filtered.length} items` : ""}</CardTitle>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["All",...categories].map(c=> (
                <button
                  key={c}
                  onClick={()=>setCategoryFilter(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold border transition ${
                    categoryFilter===c
                      ? "bg-[#16845B] text-white border-[#16845B] shadow-xs"
                      : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {items.length===0 ? (
              <div className="text-sm text-[#718078] py-10 text-center rounded-xl border border-dashed border-[#E5EBE7]">
                No menu yet. <a href="/app/menu" className="text-[#16845B] underline">Create items in Menu</a> or run Onboarding.
              </div>
            ) : filtered.length===0 ? (
              <div className="text-sm text-[#718078] py-8 text-center">No items in {categoryFilter}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map(it=> (
                  <button
                    key={it.id}
                    onClick={()=>addToCart(it)}
                    className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 text-left hover:border-[#16845B] hover:bg-white hover:shadow-xs transition group focus:outline-none focus:ring-2 focus:ring-[#16845B]/30"
                  >
                    <div className={`h-12 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                      it.isVeg ? "bg-[#E8F5EE] border border-[#E5EBE7] text-[#16845B]" : "bg-red-50 border border-red-100 text-red-600"
                    }`}>
                      {it.isVeg ? "● VEG" : "● NON-VEG"}
                    </div>
                    <div className="mt-2 text-sm font-bold text-[#172B25] truncate" title={it.name}>{it.name}</div>
                    <div className="text-xs font-semibold text-[#16845B]">{formatINR(it.pricePaise)}</div>
                    <div className="mt-1 text-[11px] text-[#16845B] opacity-0 group-hover:opacity-100 transition font-medium">Tap to add →</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7]">
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Order type</Label>
                <select
                  value={orderType}
                  onChange={e=>setOrderType(e.target.value as typeof orderType)}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
                >
                  <option value="DINE_IN">Dine-in</option>
                  <option value="TAKEAWAY">Takeaway</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </div>
              <div>
                <Label className="text-[#718078] text-xs font-semibold">
                  Table {orderType!=="DINE_IN" && <span className="text-amber-700">(Dine-in only)</span>}
                </Label>
                <select
                  value={selectedTable}
                  onChange={e=>setSelectedTable(e.target.value)}
                  disabled={orderType!=="DINE_IN"}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none disabled:opacity-40"
                >
                  <option value="">No table</option>
                  {tables.map(t=> <option key={t.id} value={t.id}>{t.number} — {t.area} ({t.status})</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Customer phone</Label>
                <Input
                  value={customerPhone}
                  onChange={e=>setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Order Cart Card */}
        <Card className="h-fit lg:sticky lg:top-[80px] border-[#E5EBE7] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#172B25] flex items-center justify-between">
              <span>Current Order</span>
              <span className="text-xs font-normal text-[#718078]">{cart.length} item{cart.length!==1?'s':''}</span>
            </CardTitle>
            <div className="text-xs text-[#718078]">CGST 9% + SGST 9% • Auto KOT • Paise math</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[#718078] text-xs font-semibold">Customer name</Label>
              <Input
                value={customerName}
                onChange={e=>setCustomerName(e.target.value)}
                placeholder="Walk-in (optional)"
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25] text-sm h-10"
              />
            </div>

            {cart.length===0 ? (
              <div className="text-sm text-[#718078] py-8 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                Cart empty<br/><span className="text-xs">Tap menu items to add</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {cart.map((c,i)=> (
                  <div key={`${c.menuItemId}-${i}`} className="flex items-center justify-between rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#172B25] truncate" title={c.name}>{c.name}</div>
                      <div className="text-xs text-[#718078]">{formatINR(c.unitPricePaise)} × {c.quantity} = {formatINR((c.unitPricePaise||0)*c.quantity)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        aria-label="Decrease quantity"
                        onClick={()=>decQty(i)}
                        className="h-7 w-7 rounded-full border border-[#E5EBE7] bg-white text-[#172B25] hover:bg-slate-100 flex items-center justify-center text-sm font-bold shadow-xs"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-[#172B25] w-5 text-center">{c.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={()=>incQty(i)}
                        className="h-7 w-7 rounded-full bg-[#16845B] text-white hover:bg-[#116B49] flex items-center justify-center text-sm font-bold shadow-xs"
                      >
                        +
                      </button>
                      <button
                        aria-label="Remove item"
                        onClick={()=>removeItem(i)}
                        className="ml-1 h-7 w-7 rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-[#718078] text-xs font-semibold flex items-center justify-between">
                <span>Payment Option Method</span>
                <span className="text-[10px] text-[#16845B] uppercase font-bold tracking-wider">{paymentMethod}</span>
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["UPI", "CASH", "CARD"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-xl py-2 px-2 text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === m
                        ? "bg-[#16845B] text-white border-[#16845B] shadow-xs"
                        : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
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
                <div className="rounded-xl border border-[#E5EBE7] bg-[#E8F5EE]/40 p-3 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#16845B]">
                    <span className="flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" /> Customer Scan & Pay</span>
                    <span className="text-[11px] bg-[#16845B] text-white px-2 py-0.5 rounded-full font-black">{formatINR(total)}</span>
                  </div>
                  <div className="mx-auto w-fit p-2 bg-white rounded-xl shadow-xs border border-[#E5EBE7]">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=restronex@icici&pn=RestroNex%20Restaurant&am=${(total/100).toFixed(2)}&cu=INR`)}&margin=2`}
                      alt="Customer UPI QR Code"
                      className="w-28 h-28 object-contain rounded"
                    />
                  </div>
                  <div className="text-[10px] text-[#718078] font-medium">Scan with GPay, PhonePe, Paytm, BHIM</div>
                </div>
              )}
            </div>

            {/* Coupon Code in POS */}
            <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#16845B]" /> Coupon Code
                </Label>
                {appliedCoupon && (
                  <span className="text-[10px] font-bold text-[#16845B] bg-[#E8F5EE] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" /> {appliedCoupon.code} Applied
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponError(null); }}
                  placeholder="Enter code (e.g. SAVE10)"
                  className="bg-white border-[#E5EBE7] text-[#172B25] text-xs h-9"
                />
                <button
                  type="button"
                  onClick={() => applyPOSCoupon()}
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-3.5 py-2 shrink-0 transition shadow-xs"
                >
                  Apply
                </button>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={removePOSCoupon}
                    className="rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs px-2.5 py-2 shrink-0 flex items-center justify-center"
                    title="Remove coupon"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {couponError && (
                <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                  {couponError}
                </div>
              )}
            </div>

            {/* Bill Summary */}
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-4 space-y-2">
              <div className="flex justify-between text-xs text-[#718078]">
                <span>Subtotal</span>
                <span className="text-[#172B25] font-semibold">{formatINR(subtotal)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex justify-between text-xs text-[#16845B] font-bold bg-[#E8F5EE] px-2 py-1 rounded-lg">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>−{formatINR(discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#718078]">
                <span>CGST 9%</span>
                <span className="text-[#172B25] font-medium">{formatINR(cgst)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#718078]">
                <span>SGST 9%</span>
                <span className="text-[#172B25] font-medium">{formatINR(sgst)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#172B25] pt-2 border-t border-[#E5EBE7]">
                <span>Total Payable</span>
                <span className="text-[#16845B] text-base">{formatINR(total)}</span>
              </div>
              <div className="text-[11px] text-[#718078] text-center pt-1">
                Inclusive of all taxes • {orderType.replace('_',' ')} {selectedTableLabel ? `• Table ${selectedTableLabel}` : ''} • Pay via {paymentMethod}
              </div>
            </div>

            <button
              onClick={placeOrder}
              disabled={posting || cart.length===0}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3.5 text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition flex items-center justify-center gap-2"
            >
              {posting ? (
                <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> Processing...</>
              ) : (
                `Bill & Pay via ${paymentMethod} — ${formatINR(total)}`
              )}
            </button>

            {msg && (
              <div role="status" className={`text-xs p-3 rounded-xl border flex gap-2 break-words ${
                msg.type==="success" ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]" : msg.type==="error" ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"
              }`}>
                {msg.text}
              </div>
            )}

            <div className="flex gap-2 text-xs">
              <button
                onClick={()=>{ setCart([]); setMsg(null); }}
                disabled={cart.length===0}
                className="flex-1 rounded-full border border-[#E5EBE7] bg-white py-2 text-[#718078] hover:bg-[#F8FAF9] disabled:opacity-30"
              >
                Clear cart
              </button>
              <a
                href="/app/kitchen"
                className="flex-1 rounded-full bg-white border border-[#E5EBE7] py-2 text-center text-[#172B25] hover:bg-[#F8FAF9] font-medium"
              >
                KDS →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
