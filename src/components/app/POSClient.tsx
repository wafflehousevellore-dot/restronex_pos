"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { apiFetch } from "@/lib/api";
import {
  Tag,
  Check,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Search,
  Printer,
  MessageSquare,
} from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  pricePaise: number;
  categoryId: string;
  isVeg: boolean;
  category?: { name: string };
};
type Table = { id: string; number: string; status: string; area: string };
type Outlet = { id: string; name: string };

function calculateCouponDiscount(code: string, subtotalPaise: number): number {
  const c = code.trim().toUpperCase();
  if (
    c === "PAY2" ||
    c === "TEST2" ||
    c === "RS2" ||
    c === "100OFF" ||
    c === "TEST100" ||
    c === "TESTPAY" ||
    c === "2RS" ||
    c === "100%" ||
    c === "FREE" ||
    c === "2RUPEES"
  ) {
    return Math.max(0, subtotalPaise - 169);
  }
  if (c === "SAVE10" || c === "WELCOME10") return Math.round(subtotalPaise * 0.1);
  if (c === "FLAT50") return Math.min(5000, subtotalPaise);
  if (c === "CHEF20" || c === "FESTIVE20") return Math.round(subtotalPaise * 0.2);
  return 0;
}

export default function POSClient({
  initialItems,
  initialTables,
  initialOutlets,
}: {
  initialItems: MenuItem[];
  initialTables: Table[];
  initialOutlets: Outlet[];
}) {
  const [items] = useState<MenuItem[]>(initialItems);
  const [tables] = useState<Table[]>(initialTables);
  const [outlets] = useState<Outlet[]>(initialOutlets);
  const [selectedOutlet, setSelectedOutlet] = useState<string>(initialOutlets[0]?.id || "");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [cart, setCart] = useState<
    { menuItemId: string; name: string; quantity: number; unitPricePaise: number }[]
  >([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPaise: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const [completedOrderModal, setCompletedOrderModal] = useState<any | null>(null);
  const [lastOrder, setLastOrder] = useState<{ orderNumber: string; total: number; invoiceNumber?: string } | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => (i.category?.name || "Other").trim()).filter(Boolean))),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchCat = categoryFilter === "All" || (i.category?.name?.trim() || "Other") === categoryFilter;
      const matchSearch = !searchQuery.trim() || i.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [items, categoryFilter, searchQuery]);

  function addToCart(it: MenuItem) {
    if (!it?.id || typeof it.pricePaise !== "number") return;
    setCart((c) => {
      const idx = c.findIndex((x) => x.menuItemId === it.id);
      if (idx >= 0) {
        const copy = [...c];
        copy[idx] = { ...copy[idx], quantity: (copy[idx].quantity || 0) + 1 };
        return copy;
      }
      return [...c, { menuItemId: it.id, name: it.name, quantity: 1, unitPricePaise: it.pricePaise }];
    });
    setMsg(null);
  }

  function decQty(idx: number) {
    setCart((c) => {
      const copy = [...c];
      const q = Math.max(1, (copy[idx]?.quantity || 1) - 1);
      copy[idx] = { ...copy[idx], quantity: q };
      return copy;
    });
  }

  function incQty(idx: number) {
    setCart((c) => {
      const copy = [...c];
      copy[idx] = { ...copy[idx], quantity: (copy[idx].quantity || 0) + 1 };
      return copy;
    });
  }

  function removeItem(idx: number) {
    setCart((c) => c.filter((_, i) => i !== idx));
  }

  const subtotal = cart.reduce((s, c) => s + (Number(c.unitPricePaise) || 0) * (Number(c.quantity) || 0), 0);
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

  async function placeOrder() {
    if (!selectedOutlet)
      return setMsg({
        type: "error",
        text: "Select an outlet first — complete 8-Step Onboarding to create your business.",
      });
    if (cart.length === 0) return setMsg({ type: "error", text: "Cart is empty — tap menu items to add." });
    if (selectedTable && orderType !== "DINE_IN") {
      return setMsg({
        type: "error",
        text: "Tables only for Dine-in orders. Change order type to Dine-in or clear table.",
      });
    }

    setPosting(true);
    setMsg({ type: "info", text: "Placing order & settling bill..." });
    try {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutlet,
          type: orderType,
          tableId: selectedTable || undefined,
          customerName: customerName?.trim() || undefined,
          customerPhone: customerPhone?.trim() || undefined,
          whatsappConsent,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            name: c.name,
            quantity: c.quantity,
            unitPricePaise: c.unitPricePaise,
          })),
          discountPaise,
          paymentMethod,
        }),
      });

      const text = await res.text();
      let j: Record<string, unknown> = {};
      try {
        j = JSON.parse(text);
      } catch {
        j = { raw: text };
      }

      if (!res.ok) {
        const errMsg = (j.error as string) || `Failed ${res.status}`;
        setMsg({ type: "error", text: errMsg });
        return;
      }

      const orderNumber = (j.orderNumber as string) || "OK";
      const invoiceNumber = (j.invoiceNumber as string) || "INV-0001";
      const billedTotal = (j as unknown as { totals: { total: number } }).totals?.total ?? total;

      setLastOrder({ orderNumber, total: billedTotal, invoiceNumber });
      setCompletedOrderModal({
        orderNumber,
        invoiceNumber,
        total: billedTotal,
        items: [...cart],
        customerName,
        customerPhone,
        paymentMethod,
        orderType,
        table: tables.find((t) => t.id === selectedTable)?.number,
      });

      setMsg({
        type: "success",
        text: `✓ Order ${orderNumber} billed via ${paymentMethod}! Invoice: ${invoiceNumber}.`,
      });

      setCart([]);
      setAppliedCoupon(null);
      setCouponCode("");
      setSelectedTable("");
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: "error", text: m });
    } finally {
      setPosting(false);
    }
  }

  const selectedTableLabel = selectedTable ? tables.find((t) => t.id === selectedTable)?.number || "" : "";

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Restaurant POS Billing</h1>
          <p className="text-sm text-[#718078]">
            Paise-precise • CGST 9% + SGST 9% • Instant KOT & WhatsApp delivery • {items.length} dishes
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none shadow-xs"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {lastOrder && (
        <div className="rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="text-sm font-black text-[#172B25]">
              Last Billed Order: {lastOrder.orderNumber} • {lastOrder.invoiceNumber}
            </div>
            <div className="text-xs text-[#718078]">
              Total {formatINR(lastOrder.total)} • KOT fired to kitchen • Printed to Thermal Queue
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="/app/orders"
              className="rounded-full bg-white border border-[#E5EBE7] text-[#172B25] px-4 py-2 text-xs font-bold hover:bg-[#F8FAF9] shadow-xs"
            >
              Orders Ledger →
            </a>
            <a
              href="/app/kitchen"
              className="rounded-full bg-[#16845B] text-white px-4 py-2 text-xs font-bold hover:bg-[#116B49] shadow-xs"
            >
              Live KDS →
            </a>
          </div>
        </div>
      )}

      {/* Main Grid: Menu vs Cart */}
      <div className="grid lg:grid-cols-[1fr_390px] gap-6">
        {/* Menu Section */}
        <Card className="bg-white border-[#E5EBE7] shadow-sm">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold text-[#172B25]">
                Menu Catalog ({filtered.length} Items)
              </CardTitle>

              {/* Fast Dish Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dish name…"
                  className="pl-9 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-full focus:bg-white"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {["All", ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold border transition shadow-2xs ${
                    categoryFilter === c
                      ? "bg-[#16845B] text-white border-[#16845B]"
                      : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {filtered.length === 0 ? (
              <div className="text-sm text-[#718078] py-12 text-center rounded-2xl border border-dashed border-[#E5EBE7]">
                No dishes matching &ldquo;{searchQuery || categoryFilter}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => addToCart(it)}
                    className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 text-left hover:border-[#16845B] hover:bg-white hover:shadow-xs transition group focus:outline-none focus:ring-2 focus:ring-[#16845B]/30"
                  >
                    <div
                      className={`h-9 rounded-xl flex items-center justify-between px-2.5 text-[10px] font-black uppercase ${
                        it.isVeg
                          ? "bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B]"
                          : "bg-red-50 border border-red-200 text-red-600"
                      }`}
                    >
                      <span>{it.isVeg ? "VEG" : "NON-VEG"}</span>
                      <span className="text-[11px] font-extrabold">{formatINR(it.pricePaise)}</span>
                    </div>

                    <div className="mt-2 text-sm font-bold text-[#172B25] truncate" title={it.name}>
                      {it.name}
                    </div>
                    <div className="mt-1 text-[11px] text-[#16845B] opacity-0 group-hover:opacity-100 transition font-bold">
                      + Add to Cart
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Service Mode & Table Bar */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7]">
              <div>
                <Label className="text-[#718078] text-[11px] font-semibold">Service Mode</Label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as typeof orderType)}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none"
                >
                  <option value="DINE_IN">Dine-In (Table Seating)</option>
                  <option value="TAKEAWAY">Takeaway / Counter Pickup</option>
                  <option value="DELIVERY">Direct Delivery</option>
                </select>
              </div>

              <div>
                <Label className="text-[#718078] text-[11px] font-semibold">
                  Select Table {orderType !== "DINE_IN" && "(Dine-In only)"}
                </Label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  disabled={orderType !== "DINE_IN"}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none disabled:opacity-40"
                >
                  <option value="">No table selected</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.number} ({t.area} • {t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[#718078] text-[11px] font-semibold">Customer Mobile (WhatsApp)</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-xs h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Order Cart Card */}
        <Card className="h-fit lg:sticky lg:top-[80px] border-[#E5EBE7] bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-[#172B25] flex items-center justify-between text-base">
              <span>Order Summary</span>
              <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] px-2.5 py-0.5 rounded-full">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
            <div className="text-[11px] text-[#718078]">
              {orderType.replace("_", " ")} {selectedTableLabel ? `• Table ${selectedTableLabel}` : ""}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div>
              <Label className="text-[#718078] text-[11px] font-semibold">Customer Name (Optional)</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Guest"
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25] text-xs h-9"
              />
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="text-xs text-[#718078] py-8 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                Cart is currently empty.<br />
                <span className="text-[10px]">Tap dishes on the menu to add.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.map((c, i) => (
                  <div
                    key={`${c.menuItemId}-${i}`}
                    className="flex items-center justify-between rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#172B25] truncate">{c.name}</div>
                      <div className="text-[10px] text-[#718078]">
                        {formatINR(c.unitPricePaise)} × {c.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => decQty(i)}
                        className="h-6 w-6 rounded-full border border-[#E5EBE7] bg-white text-[#172B25] hover:bg-slate-100 flex items-center justify-center text-xs font-bold shadow-2xs"
                      >
                        −
                      </button>
                      <span className="text-xs font-black text-[#172B25] w-5 text-center">{c.quantity}</span>
                      <button
                        onClick={() => incQty(i)}
                        className="h-6 w-6 rounded-full bg-[#16845B] text-white hover:bg-[#116B49] flex items-center justify-center text-xs font-bold shadow-2xs"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(i)}
                        className="ml-1 h-6 w-6 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Selector */}
            <div className="space-y-1.5">
              <Label className="text-[#718078] text-[11px] font-semibold">Payment Option</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["UPI", "CASH", "CARD"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-xl py-2 px-1 text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === m
                        ? "bg-[#16845B] text-white border-[#16845B] shadow-2xs"
                        : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
                    }`}
                  >
                    {m === "UPI" && <QrCode className="h-3.5 w-3.5" />}
                    {m === "CASH" && <Banknote className="h-3.5 w-3.5" />}
                    {m === "CARD" && <CreditCard className="h-3.5 w-3.5" />}
                    <span>{m === "UPI" ? "UPI QR" : m === "CASH" ? "Cash" : "Card"}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Customer Scan & Pay UPI QR */}
              {paymentMethod === "UPI" && total > 0 && (
                <div className="rounded-xl border border-[#E5EBE7] bg-[#E8F5EE]/40 p-3 text-center space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#16845B]">
                    <span>Scan & Pay Dynamic UPI</span>
                    <span className="bg-[#16845B] text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                      {formatINR(total)}
                    </span>
                  </div>
                  <div className="mx-auto w-fit p-1.5 bg-white rounded-xl shadow-2xs border border-[#E5EBE7]">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                        `upi://pay?pa=restronex@icici&pn=RestroNex%20Restaurant&am=${(total / 100).toFixed(2)}&cu=INR`
                      )}`}
                      alt="Customer UPI QR Code"
                      className="w-24 h-24 object-contain rounded"
                    />
                  </div>
                  <div className="text-[10px] text-[#718078]">GPay, PhonePe, Paytm, BHIM</div>
                </div>
              )}
            </div>

            {/* WhatsApp Consent */}
            {customerPhone && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#718078] p-2 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  className="h-4 w-4 rounded text-[#16845B] focus:ring-[#16845B]"
                />
                <span className="text-[11px] leading-tight">
                  Auto-deliver itemized PDF receipt to customer on WhatsApp
                </span>
              </label>
            )}

            {/* Promo / Discount Coupon */}
            <div className="space-y-1">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#718078]" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon code (e.g. SAVE10)"
                    className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] pl-8 pr-2 py-1.5 text-xs font-bold text-[#172B25] uppercase placeholder:font-normal focus:bg-white focus:border-[#16845B] focus:outline-none"
                  />
                </div>
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={removePOSCoupon}
                    className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => applyPOSCoupon()}
                    className="px-3 py-1.5 rounded-xl bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20 text-xs font-bold hover:bg-[#16845B] hover:text-white transition"
                  >
                    Apply
                  </button>
                )}
              </div>
              {couponError && (
                <div className="text-[11px] text-red-600 font-medium pl-1">{couponError}</div>
              )}
            </div>

            {/* Bill Math Summary */}
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#718078]">
                <span>Subtotal</span>
                <span className="text-[#172B25] font-bold">{formatINR(subtotal)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex justify-between text-[#16845B] font-bold">
                  <span>Discount</span>
                  <span>−{formatINR(discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#718078]">
                <span>CGST (9%)</span>
                <span>{formatINR(cgst)}</span>
              </div>
              <div className="flex justify-between text-[#718078]">
                <span>SGST (9%)</span>
                <span>{formatINR(sgst)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#172B25] pt-1.5 border-t border-[#E5EBE7]">
                <span>Total Payable</span>
                <span className="text-[#16845B]">{formatINR(total)}</span>
              </div>
            </div>

            {/* Place & Bill Button */}
            <button
              onClick={placeOrder}
              disabled={posting || cart.length === 0}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3.5 text-xs font-black disabled:opacity-40 shadow-sm transition flex items-center justify-center gap-2"
            >
              {posting ? "Processing Bill…" : `Settle & Bill (${formatINR(total)})`}
            </button>

            {msg && (
              <div
                className={`text-xs p-3 rounded-xl border flex gap-2 ${
                  msg.type === "success"
                    ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {msg.text}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completed Order & Invoice Modal */}
      {completedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2 text-[#16845B]">
                <Check className="h-5 w-5 font-black" />
                <h3 className="font-extrabold text-base text-[#172B25]">Order Settled & Billed</h3>
              </div>
              <button
                onClick={() => setCompletedOrderModal(null)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Bill Receipt Preview */}
            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-2 text-xs font-mono">
              <div className="text-center font-bold text-sm text-[#172B25]">RESTRONEX RESTAURANT</div>
              <div className="text-center text-[10px] text-[#718078]">TAX INVOICE / CASH BILL</div>
              <div className="border-b border-dashed border-[#E5EBE7] pb-2 text-[11px] space-y-0.5">
                <div>Invoice: <b>{completedOrderModal.invoiceNumber}</b></div>
                <div>Order: {completedOrderModal.orderNumber}</div>
                <div>Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                {completedOrderModal.table && <div>Table: {completedOrderModal.table}</div>}
                <div>Payment: {completedOrderModal.paymentMethod}</div>
              </div>

              <div className="space-y-1 py-1">
                {completedOrderModal.items.map((it: any) => (
                  <div key={it.menuItemId} className="flex justify-between text-[11px]">
                    <span>{it.name} × {it.quantity}</span>
                    <span>{formatINR(it.unitPricePaise * it.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-[#E5EBE7] pt-2 flex justify-between font-bold text-sm text-[#172B25]">
                <span>PAID TOTAL</span>
                <span className="text-[#16845B]">{formatINR(completedOrderModal.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 rounded-full border border-[#E5EBE7] bg-white py-2.5 text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Receipt
                </button>

                {completedOrderModal.customerPhone && (
                  <a
                    href={`https://wa.me/${completedOrderModal.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hello ${completedOrderModal.customerName || "Guest"}! Thank you for dining with us.\nYour Invoice ${completedOrderModal.invoiceNumber} for Order ${completedOrderModal.orderNumber} (Total: ${formatINR(completedOrderModal.total)}) is settled.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Receipt
                  </a>
                )}
              </div>

              <button
                onClick={() => setCompletedOrderModal(null)}
                className="w-full rounded-full bg-[#F8FAF9] text-[#718078] hover:text-[#172B25] py-2 text-xs font-bold"
              >
                Close & Next Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
