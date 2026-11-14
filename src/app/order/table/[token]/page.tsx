"use client";

import React, { useEffect, useState, use } from "react";
import { formatINR } from "@/lib/money";
import {
  Check,
  ShoppingBag,
  X,
  Plus,
  Minus,
  ArrowRight,
  UtensilsCrossed,
  QrCode,
  Smartphone,
  Receipt,
  CheckCircle2,
} from "lucide-react";

export default function GuestQRTableOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<
    { menuItemId: string; name: string; pricePaise: number; quantity: number }[]
  >([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Online Payment State for Cart Ordering
  const [payOnline, setPayOnline] = useState(true);
  const [showCartQr, setShowCartQr] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  // While Dining: Settle Active Table Bill State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePhone, setSettlePhone] = useState("");
  const [settleUtr, setSettleUtr] = useState("");
  const [settlingBill, setSettlingBill] = useState(false);
  const [showSettleQr, setShowSettleQr] = useState(false);
  const [settleSuccessMsg, setSettleSuccessMsg] = useState<string | null>(null);

  async function fetchMenu() {
    try {
      const res = await fetch(`/api/qr/${token}`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed to load table menu");
      } else {
        setData(j);
        if (j.activeOrder?.customerPhone && !customerPhone) {
          setCustomerPhone(j.activeOrder.customerPhone);
          setSettlePhone(j.activeOrder.customerPhone);
        }
      }
    } catch {
      setError("Network connection issue. Please check Wi-Fi and refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function addToCart(item: any) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [
        ...prev,
        { menuItemId: item.id, name: item.name, pricePaise: item.pricePaise, quantity: 1 },
      ];
    });
  }

  function decrementItem(itemId: string) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === itemId);
      if (idx < 0) return prev;
      if (prev[idx].quantity <= 1) {
        return prev.filter((i) => i.menuItemId !== itemId);
      }
      const copy = [...prev];
      copy[idx].quantity -= 1;
      return copy;
    });
  }

  // Submit Order with optional Online Payment
  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/qr/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customerName,
          customerPhone,
          whatsappConsent,
          notes,
          payOnline,
          paymentMethod: "UPI",
          paymentRef: paymentRef.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Failed to submit order");
      } else {
        setPlacedOrder(j);
        setCart([]);
        setIsCartOpen(false);
        fetchMenu();
      }
    } catch {
      alert("Submission failed. Please call your steward.");
    } finally {
      setSubmitting(false);
    }
  }

  // Settle active unpaid table bill while dining
  async function handleSettleActiveBill() {
    if (!data?.activeOrder?.id) return;
    setSettlingBill(true);
    try {
      const res = await fetch(`/api/qr/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.activeOrder.id,
          paymentMethod: "UPI",
          paymentRef: settleUtr.trim() || undefined,
          customerPhone: settlePhone.trim() || customerPhone.trim() || undefined,
          customerName: customerName.trim() || undefined,
          whatsappConsent: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Failed to settle bill");
      } else {
        setSettleSuccessMsg(j.message || "Bill settled successfully!");
        setTimeout(() => {
          setIsSettleModalOpen(false);
          setSettleSuccessMsg(null);
          fetchMenu();
        }, 2200);
      }
    } catch {
      alert("Failed to confirm payment. Please check your connection or notify staff.");
    } finally {
      setSettlingBill(false);
    }
  }

  const cartTotalPaise = cart.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
  const cartTaxPaise = Math.round(cartTotalPaise * 0.18);
  const cartGrandTotalPaise = cartTotalPaise + cartTaxPaise;
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-6 text-[#172B25]">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-[#16845B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#718078]">Loading restaurant menu…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-6 text-[#172B25]">
        <div className="max-w-md w-full bg-white border border-[#E5EBE7] rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <h1 className="text-xl font-extrabold text-[#172B25]">Unable to Load Table</h1>
          <p className="text-sm text-[#718078] leading-relaxed">{error}</p>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-[#16845B] text-white px-6 py-2.5 text-xs font-bold hover:bg-[#116B49] transition shadow-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { table, outlet, restaurant, categories, activeOrder, paymentConfig } = data;

  const upiId = paymentConfig?.upiId || "ajaydpi2005@ptyes";
  const merchantName = paymentConfig?.merchantName || restaurant?.name || "WAFFLE PLUM HOUSE";

  // Dynamic UPI URL for Cart Ordering
  const cartUpiAmount = (cartGrandTotalPaise / 100).toFixed(2);
  const cartUpiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    merchantName
  )}&am=${cartUpiAmount}&cu=INR&tn=${encodeURIComponent(
    `Table-${table.number}-Order`
  )}`;
  const cartQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    cartUpiLink
  )}`;

  // Dynamic UPI URL for Active Table Bill (While Dining)
  const activeOrderAmount = activeOrder ? (activeOrder.totalPaise / 100).toFixed(2) : "0.00";
  const activeOrderUpiLink = activeOrder
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        merchantName
      )}&am=${activeOrderAmount}&cu=INR&tn=${encodeURIComponent(
        `Table-${table.number}-Bill-${activeOrder.orderNumber}`
      )}`
    : "";
  const activeOrderQrUrl = activeOrder
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        activeOrderUpiLink
      )}`
    : "";

  const allItems = categories.flatMap((c: any) =>
    c.items.map((it: any) => ({ ...it, categoryName: c.name }))
  );

  const displayedItems =
    activeCategory === "ALL"
      ? allItems
      : allItems.filter((i: any) => i.categoryId === activeCategory);

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25] pb-28">
      {/* Restaurant Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E5EBE7] px-4 py-3 shadow-2xs">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-base text-[#172B25] leading-snug">
              {restaurant.name}
            </h1>
            <p className="text-[11px] text-[#718078]">
              {outlet.name} • {outlet.city}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/30 px-3 py-1 text-xs font-black text-[#16845B]">
              Table {table.number}
            </span>
          </div>
        </div>
      </header>

      {/* While Dining: Active Table Order Banner */}
      {activeOrder && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          {!activeOrder.isPaid ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-extrabold text-amber-950">
                    Active Bill for Table {table.number}
                  </span>
                </div>
                <span className="text-xs font-black text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-full">
                  {formatINR(activeOrder.totalPaise)}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-tight">
                Order <b className="font-bold">#{activeOrder.orderNumber}</b> is currently dining.
                You can settle your bill online instantly from your phone!
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => setIsSettleModalOpen(true)}
                  className="flex-1 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white py-2 px-3 text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  ⚡ Pay Bill Online Now
                </button>
                <button
                  onClick={() => setIsSettleModalOpen(true)}
                  className="rounded-xl border border-amber-300 bg-white/80 hover:bg-white text-amber-950 py-2 px-3 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  View Bill
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE] p-3 text-xs flex items-center justify-between text-[#16845B] font-bold shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Table {table.number} bill is paid & settled ({formatINR(activeOrder.totalPaise)})</span>
              </div>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#16845B]/30">
                PAID ONLINE
              </span>
            </div>
          )}
        </div>
      )}

      {/* Confirmation View If Placed In This Session */}
      {placedOrder && (
        <div className="max-w-lg mx-auto p-4">
          <div className="rounded-3xl border border-[#16845B]/30 bg-[#E8F5EE] p-6 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-full bg-[#16845B] text-white grid place-items-center mx-auto shadow-xs">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <h2 className="text-xl font-black text-[#172B25]">
              {placedOrder.isPaid ? "Order Received & Paid Online!" : "Order Sent to Kitchen!"}
            </h2>
            <p className="text-xs text-[#718078] leading-relaxed">
              Order <b className="text-[#172B25] font-bold">{placedOrder.orderNumber}</b> has been received by the kitchen for <b>Table {table.number}</b>.
            </p>
            <div className="p-3.5 bg-white/90 rounded-2xl border border-[#E5EBE7] text-left text-xs space-y-2">
              <div className="flex justify-between font-bold text-[#172B25]">
                <span>Status</span>
                <span className="text-[#16845B] uppercase font-black">{placedOrder.status}</span>
              </div>
              <div className="flex justify-between text-[#718078]">
                <span>Total Amount</span>
                <span className="font-extrabold text-[#172B25]">
                  {formatINR(placedOrder.totals?.total || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#E5EBE7]">
                <span>Payment</span>
                {placedOrder.isPaid ? (
                  <span className="font-bold text-[#16845B] bg-[#E8F5EE] px-2 py-0.5 rounded-full border border-[#16845B]/20 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Paid Online (UPI)
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                    Pay at counter after dining
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setPlacedOrder(null)}
              className="mt-2 text-xs font-bold text-[#16845B] underline cursor-pointer"
            >
              Order more items
            </button>
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="sticky top-[57px] z-10 bg-[#F8FAF9]/95 backdrop-blur-md py-2.5 border-b border-[#E5EBE7]">
        <div className="max-w-lg mx-auto px-4 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition shadow-2xs cursor-pointer ${
              activeCategory === "ALL"
                ? "bg-[#16845B] text-white border border-[#16845B]"
                : "bg-white text-[#718078] border border-[#E5EBE7] hover:bg-[#F8FAF9]"
            }`}
          >
            All Items ({allItems.length})
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition shadow-2xs cursor-pointer ${
                activeCategory === c.id
                  ? "bg-[#16845B] text-white border border-[#16845B]"
                  : "bg-white text-[#718078] border border-[#E5EBE7] hover:bg-[#F8FAF9]"
              }`}
            >
              {c.name} ({c.items.length})
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {displayedItems.map((item: any) => {
          const inCart = cart.find((i) => i.menuItemId === item.id);
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs flex items-center justify-between gap-3 hover:border-[#16845B]/40 transition"
            >
              <div className="space-y-1 pr-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      item.isVeg ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  />
                  <h3 className="font-bold text-sm text-[#172B25] leading-snug">{item.name}</h3>
                </div>
                {item.description && (
                  <p className="text-xs text-[#718078] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
                <div className="text-xs font-extrabold text-[#16845B] pt-0.5">
                  {formatINR(item.pricePaise)}
                </div>
              </div>

              {/* Food Image Thumbnail + Add Control */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#E5EBE7] bg-[#F8FAF9] relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#718078]/50 bg-[#F8FAF9]">
                      <UtensilsCrossed className="w-5 h-5 text-[#16845B]/40" />
                    </div>
                  )}
                </div>

                {/* Add / Qty Control */}
                {inCart ? (
                  <div className="flex items-center gap-1.5 bg-[#E8F5EE] border border-[#16845B]/30 rounded-full px-2 py-0.5">
                    <button
                      onClick={() => decrementItem(item.id)}
                      className="h-5 w-5 rounded-full bg-white text-[#16845B] font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="font-extrabold text-xs text-[#16845B] min-w-[12px] text-center">
                      {inCart.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="h-5 w-5 rounded-full bg-[#16845B] text-white font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    className="rounded-full bg-white border border-[#16845B] text-[#16845B] hover:bg-[#16845B] hover:text-white px-3 py-1 text-xs font-bold transition shadow-2xs w-full text-center cursor-pointer"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {displayedItems.length === 0 && (
          <div className="text-center py-12 text-[#718078] text-sm">
            No dishes found in this category.
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 z-30 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full rounded-2xl bg-[#16845B] hover:bg-[#116B49] text-white p-3.5 flex items-center justify-between shadow-lg transition active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-white/20 text-white font-extrabold text-xs grid place-items-center">
                {cartItemCount}
              </span>
              <span className="font-bold text-sm">
                View Cart • {formatINR(cartGrandTotalPaise)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold">
              Review & Order <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer / Modal with Online Payment Options */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#16845B]" />
                <h3 className="font-bold text-base text-[#172B25]">
                  Table {table.number} Order Cart
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer hover:bg-[#E5EBE7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-2 divide-y divide-[#E5EBE7]/60">
              {cart.map((item) => (
                <div
                  key={item.menuItemId}
                  className="pt-2 flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-bold text-[#172B25]">{item.name}</div>
                    <div className="text-xs text-[#718078]">
                      {formatINR(item.pricePaise)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementItem(item.menuItemId)}
                      className="h-6 w-6 rounded-full bg-[#F8FAF9] text-[#172B25] font-black text-xs grid place-items-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-[#172B25] min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        addToCart({
                          id: item.menuItemId,
                          name: item.name,
                          pricePaise: item.pricePaise,
                        })
                      }
                      className="h-6 w-6 rounded-full bg-[#16845B] text-white font-black text-xs grid place-items-center cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-xs font-extrabold text-[#172B25] ml-2 min-w-[60px] text-right">
                      {formatINR(item.pricePaise * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Customer Details & Cooking Notes */}
            <div className="pt-2 border-t border-[#E5EBE7] space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">
                    Your Name
                  </label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">
                    WhatsApp Phone
                  </label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">
                  Kitchen Cooking Note
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Less spicy, extra napkins, serve beverage first…"
                  className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs text-[#172B25] focus:outline-none focus:border-[#16845B]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#718078]">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#16845B]"
                />
                <span>Send itemized tax invoice to WhatsApp upon bill settlement</span>
              </label>
            </div>

            {/* Bill Summary */}
            <div className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs space-y-1.5">
              <div className="flex justify-between text-[#718078]">
                <span>Items Subtotal</span>
                <span className="font-bold text-[#172B25]">{formatINR(cartTotalPaise)}</span>
              </div>
              <div className="flex justify-between text-[#718078]">
                <span>Taxes (CGST 9% + SGST 9%)</span>
                <span className="font-bold text-[#172B25]">{formatINR(cartTaxPaise)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#172B25] pt-1 border-t border-[#E5EBE7]">
                <span>Total Payable</span>
                <span className="text-[#16845B] font-black">{formatINR(cartGrandTotalPaise)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-[11px] font-bold text-[#172B25] uppercase tracking-wide">
                Choose How to Pay
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayOnline(true)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                    payOnline
                      ? "border-[#16845B] bg-[#E8F5EE]/60 text-[#172B25] ring-2 ring-[#16845B]/20"
                      : "border-[#E5EBE7] bg-white text-[#718078] hover:bg-[#F8FAF9]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Smartphone className="h-4 w-4 text-[#16845B]" />
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#16845B] text-white">
                      Instant
                    </span>
                  </div>
                  <div className="text-xs font-black">⚡ Pay Online Now</div>
                  <div className="text-[10px] text-[#718078]">GPay, PhonePe, Paytm, UPI</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPayOnline(false)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    !payOnline
                      ? "border-[#16845B] bg-[#E8F5EE]/60 text-[#172B25] ring-2 ring-[#16845B]/20"
                      : "border-[#E5EBE7] bg-white text-[#718078] hover:bg-[#F8FAF9]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Receipt className="h-4 w-4 text-[#718078]" />
                  </div>
                  <div className="text-xs font-black">💵 Pay Later</div>
                  <div className="text-[10px] text-[#718078]">Cash / Card at counter</div>
                </button>
              </div>

              {/* Online Payment Interactive Section */}
              {payOnline && (
                <div className="p-3.5 rounded-2xl border border-[#16845B]/30 bg-[#F8FAF9] space-y-3">
                  <div className="text-xs font-bold text-[#172B25] flex items-center justify-between">
                    <span>UPI Payee: {merchantName}</span>
                    <span className="text-[10px] font-mono font-bold text-[#16845B] bg-white px-2 py-0.5 rounded-full border border-[#E5EBE7]">
                      {upiId}
                    </span>
                  </div>

                  {/* 1-Tap UPI Launch Button on Mobile */}
                  <a
                    href={cartUpiLink}
                    className="w-full rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 px-3 text-xs font-black flex items-center justify-center gap-2 shadow-xs transition active:scale-98"
                  >
                    <Smartphone className="h-4 w-4" />
                    🚀 Open UPI App to Pay {formatINR(cartGrandTotalPaise)}
                  </a>

                  {/* QR Code toggle */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowCartQr(!showCartQr)}
                      className="text-[11px] font-bold text-[#16845B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="h-3 w-3" />
                      {showCartQr ? "Hide QR Code" : "Or Scan QR Code on Screen"}
                    </button>
                  </div>

                  {showCartQr && (
                    <div className="bg-white p-3 rounded-2xl border border-[#E5EBE7] flex flex-col items-center gap-2 animate-in fade-in duration-200">
                      <img
                        src={cartQrUrl}
                        alt="Dynamic UPI QR Code"
                        className="w-40 h-40 object-contain rounded-lg border border-[#E5EBE7]"
                      />
                      <p className="text-[10px] text-[#718078] text-center">
                        Scan using Google Pay, PhonePe, Paytm, CRED or BHIM
                      </p>
                    </div>
                  )}

                  {/* Reference ID / UTR input */}
                  <div>
                    <input
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="UPI Transaction ID / UTR (Optional, e.g. 4012...)"
                      className="w-full bg-white border border-[#E5EBE7] rounded-xl px-3 py-2 text-[11px] text-[#172B25] focus:outline-none focus:border-[#16845B]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3.5 text-sm font-black shadow-sm transition disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {submitting
                ? "Processing Table Order…"
                : payOnline
                ? `Confirm & Pay ${formatINR(cartGrandTotalPaise)} Online →`
                : `Send Table ${table.number} Order to Kitchen →`}
            </button>
          </div>
        </div>
      )}

      {/* Settle Active Table Bill Modal (While Dining) */}
      {isSettleModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#16845B]" />
                <div>
                  <h3 className="font-black text-base text-[#172B25]">
                    Settle Table {table.number} Bill
                  </h3>
                  <p className="text-[11px] text-[#718078]">
                    Order #{activeOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="h-8 w-8 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer hover:bg-[#E5EBE7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success Feedback Notification */}
            {settleSuccessMsg && (
              <div className="p-4 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/40 text-[#16845B] text-center space-y-1 animate-in zoom-in-95">
                <div className="h-10 w-10 rounded-full bg-[#16845B] text-white grid place-items-center mx-auto shadow-xs">
                  <Check className="h-5 w-5 stroke-[3]" />
                </div>
                <div className="font-black text-sm">{settleSuccessMsg}</div>
                <div className="text-xs text-[#718078]">
                  Table bill settled! Official invoice is being sent to your WhatsApp.
                </div>
              </div>
            )}

            {!settleSuccessMsg && (
              <>
                {/* Itemized Bill Breakdown */}
                <div className="space-y-1.5 divide-y divide-[#E5EBE7]/50 max-h-48 overflow-y-auto pr-1">
                  {activeOrder.items?.map((it: any, idx: number) => (
                    <div
                      key={it.id || idx}
                      className="pt-1.5 flex items-center justify-between text-xs"
                    >
                      <span className="text-[#172B25] font-semibold">
                        {it.quantity}x {it.name}
                      </span>
                      <span className="font-extrabold text-[#172B25]">
                        {formatINR(it.totalPaise)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bill Amount Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#E8F5EE]/60 to-[#F8FAF9] border border-[#16845B]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-[#718078] block">
                      Total Bill Amount
                    </span>
                    <span className="text-xl font-black text-[#16845B]">
                      {formatINR(activeOrder.totalPaise)}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#16845B] text-white">
                    0% Convenience Fee
                  </span>
                </div>

                {/* 1-Tap Mobile UPI App Launch */}
                <div className="space-y-2.5">
                  <a
                    href={activeOrderUpiLink}
                    className="w-full rounded-2xl bg-[#16845B] hover:bg-[#116B49] text-white py-3 px-4 text-xs font-black flex items-center justify-center gap-2 shadow-md transition active:scale-98"
                  >
                    <Smartphone className="h-4 w-4" />
                    🚀 Launch UPI App to Pay {formatINR(activeOrder.totalPaise)}
                  </a>

                  {/* QR Code toggle */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowSettleQr(!showSettleQr)}
                      className="text-xs font-bold text-[#16845B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      {showSettleQr ? "Hide QR Code" : "Show UPI QR Code to Scan"}
                    </button>
                  </div>

                  {showSettleQr && (
                    <div className="bg-white p-3.5 rounded-2xl border border-[#E5EBE7] flex flex-col items-center gap-2 animate-in fade-in">
                      <img
                        src={activeOrderQrUrl}
                        alt="Dynamic UPI QR Code"
                        className="w-48 h-48 object-contain rounded-xl border border-[#E5EBE7]"
                      />
                      <p className="text-[11px] text-[#718078] text-center font-semibold">
                        Scan with Google Pay, PhonePe, Paytm, or BHIM
                      </p>
                    </div>
                  )}
                </div>

                {/* WhatsApp & UTR Details */}
                <div className="space-y-2 pt-2 border-t border-[#E5EBE7]">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">
                      WhatsApp Phone for Digital Invoice
                    </label>
                    <input
                      value={settlePhone}
                      onChange={(e) => setSettlePhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">
                      UPI UTR / Reference (Optional)
                    </label>
                    <input
                      value={settleUtr}
                      onChange={(e) => setSettleUtr(e.target.value)}
                      placeholder="e.g. 401234567890"
                      className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs text-[#172B25] focus:outline-none focus:border-[#16845B]"
                    />
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleSettleActiveBill}
                  disabled={settlingBill}
                  className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3 text-sm font-black shadow-sm transition disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {settlingBill
                    ? "Settling Table Bill…"
                    : `Confirm Payment & Settle Table Bill (${formatINR(activeOrder.totalPaise)}) →`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
