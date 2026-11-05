"use client";

import React, { useEffect, useState, use } from "react";
import { formatINR } from "@/lib/money";
import { Check, ShoppingBag, X, Plus, Minus, ArrowRight, UtensilsCrossed } from "lucide-react";

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
  const [cart, setCart] = useState<{ menuItemId: string; name: string; pricePaise: number; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`/api/qr/${token}`);
        const j = await res.json();
        if (!res.ok) {
          setError(j.error || "Failed to load table menu");
        } else {
          setData(j);
        }
      } catch {
        setError("Network connection issue. Please check Wi-Fi and refresh.");
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [token]);

  function addToCart(item: any) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { menuItemId: item.id, name: item.name, pricePaise: item.pricePaise, quantity: 1 }];
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
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Failed to submit order");
      } else {
        setPlacedOrder(j);
        setCart([]);
        setIsCartOpen(false);
      }
    } catch {
      alert("Submission failed. Please call your steward.");
    } finally {
      setSubmitting(false);
    }
  }

  const cartTotalPaise = cart.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
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
              className="rounded-full bg-[#16845B] text-white px-6 py-2.5 text-xs font-bold hover:bg-[#116B49] transition shadow-xs"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { table, outlet, restaurant, categories } = data;

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
            <h1 className="font-extrabold text-base text-[#172B25] leading-snug">{restaurant.name}</h1>
            <p className="text-[11px] text-[#718078]">{outlet.name} • {outlet.city}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/30 px-3 py-1 text-xs font-black text-[#16845B]">
              Table {table.number}
            </span>
          </div>
        </div>
      </header>

      {/* Confirmation View If Placed */}
      {placedOrder && (
        <div className="max-w-lg mx-auto p-4">
          <div className="rounded-3xl border border-[#16845B]/30 bg-[#E8F5EE] p-6 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-full bg-[#16845B] text-white grid place-items-center mx-auto">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <h2 className="text-xl font-black text-[#172B25]">Order Sent to Kitchen!</h2>
            <p className="text-xs text-[#718078] leading-relaxed">
              Order <b className="text-[#172B25] font-bold">{placedOrder.orderNumber}</b> has been received by the kitchen for <b>Table {table.number}</b>.
            </p>
            <div className="p-3 bg-white/80 rounded-2xl border border-[#E5EBE7] text-left text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-[#172B25]">
                <span>Status</span>
                <span className="text-[#16845B] uppercase font-black">{placedOrder.status}</span>
              </div>
              <div className="flex justify-between text-[#718078]">
                <span>Total Amount</span>
                <span className="font-bold text-[#172B25]">{formatINR(placedOrder.totals.total)}</span>
              </div>
            </div>
            <button
              onClick={() => setPlacedOrder(null)}
              className="mt-2 text-xs font-bold text-[#16845B] underline"
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
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition shadow-2xs ${
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
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition shadow-2xs ${
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
                  <p className="text-xs text-[#718078] line-clamp-2 leading-relaxed">{item.description}</p>
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
                      className="h-5 w-5 rounded-full bg-white text-[#16845B] font-black text-xs flex items-center justify-center shadow-2xs"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="font-extrabold text-xs text-[#16845B] min-w-[12px] text-center">
                      {inCart.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="h-5 w-5 rounded-full bg-[#16845B] text-white font-black text-xs flex items-center justify-center shadow-2xs"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    className="rounded-full bg-white border border-[#16845B] text-[#16845B] hover:bg-[#16845B] hover:text-white px-3 py-1 text-xs font-bold transition shadow-2xs w-full text-center"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {displayedItems.length === 0 && (
          <div className="text-center py-12 text-[#718078] text-sm">No dishes found in this category.</div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 z-30 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full rounded-2xl bg-[#16845B] hover:bg-[#116B49] text-white p-3.5 flex items-center justify-between shadow-lg transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-white/20 text-white font-extrabold text-xs grid place-items-center">
                {cartItemCount}
              </span>
              <span className="font-bold text-sm">View Cart • {formatINR(cartTotalPaise)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold">
              Review & Order <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#16845B]" />
                <h3 className="font-bold text-base text-[#172B25]">Table {table.number} Order Cart</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-2.5 divide-y divide-[#E5EBE7]/60">
              {cart.map((item) => (
                <div key={item.menuItemId} className="pt-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-bold text-[#172B25]">{item.name}</div>
                    <div className="text-xs text-[#718078]">{formatINR(item.pricePaise)} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementItem(item.menuItemId)}
                      className="h-6 w-6 rounded-full bg-[#F8FAF9] text-[#172B25] font-black text-xs grid place-items-center"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-[#172B25] min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart({ id: item.menuItemId, name: item.name, pricePaise: item.pricePaise })}
                      className="h-6 w-6 rounded-full bg-[#16845B] text-white font-black text-xs grid place-items-center"
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

            {/* Customer Details & WhatsApp Opt-In */}
            <div className="pt-2 border-t border-[#E5EBE7] space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">Your Name</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">WhatsApp Phone</label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">Kitchen Cooking Note</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Less spicy, extra napkins, serve beverages first…"
                  className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs text-[#172B25] focus:outline-none focus:border-[#16845B]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#718078]">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  className="h-4 w-4 rounded text-[#16845B] focus:ring-[#16845B]"
                />
                <span>Send itemized digital invoice to WhatsApp upon bill settlement</span>
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
                <span className="font-bold text-[#172B25]">{formatINR(Math.round(cartTotalPaise * 0.18))}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#172B25] pt-1 border-t border-[#E5EBE7]">
                <span>Total Payable</span>
                <span className="text-[#16845B]">{formatINR(Math.round(cartTotalPaise * 1.18))}</span>
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3.5 text-sm font-extrabold shadow-sm transition disabled:opacity-50"
            >
              {submitting ? "Sending to Kitchen…" : `Confirm Table ${table.number} Order →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
