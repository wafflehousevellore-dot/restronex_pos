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
  Receipt,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export type QRCartAddon = {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  pricePaise: number;
};

export type QRCartItem = {
  lineId: string;
  menuItemId: string;
  name: string;
  pricePaise: number;
  basePricePaise: number;
  quantity: number;
  notes?: string;
  selectedAddons: QRCartAddon[];
};

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
  const [cart, setCart] = useState<QRCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Add-on & Modifier Customizer Modal State
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<QRCartAddon[]>([]);
  const [itemNotes, setItemNotes] = useState<string>("");
  const [customizingQty, setCustomizingQty] = useState<number>(1);

  // Online Payment State for Cart Ordering
  const [payOnline, setPayOnline] = useState(true);
  const [showManualCartUpi, setShowManualCartUpi] = useState(false);

  // While Dining: Settle Active Table Bill State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePhone, setSettlePhone] = useState("");
  const [settlingBill, setSettlingBill] = useState(false);
  const [showManualSettleUpi, setShowManualSettleUpi] = useState(false);
  const [settleSuccessMsg, setSettleSuccessMsg] = useState<string | null>(null);

  // Post-PhonePe redirect verification state
  const [verifyingPhonePe, setVerifyingPhonePe] = useState(false);
  const [phonePeStatusMsg, setPhonePeStatusMsg] = useState<string | null>(null);

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

  // Check if returning from PhonePe payment redirect
  useEffect(() => {
    fetchMenu();

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isPhonePeCheck = urlParams.get("phonepe_check") === "1";
      const returnOrderId = urlParams.get("orderId");

      if (isPhonePeCheck && returnOrderId) {
        setVerifyingPhonePe(true);
        setPhonePeStatusMsg("Verifying payment with PhonePe…");

        // Verify with PhonePe API
        fetch(`/api/payments/phonepe/status?orderId=${returnOrderId}`)
          .then((r) => r.json())
          .then((res) => {
            if (res.ok && res.isPaid) {
              setPlacedOrder({
                orderNumber: res.orderNumber,
                totals: { total: res.totalPaise },
                status: "BILLED",
                isPaid: true,
                utr: res.utr,
                paymentMethod: "PhonePe UPI",
              });
              setSettleSuccessMsg("Payment verified successfully via PhonePe!");
              // Clean URL query parameters
              window.history.replaceState({}, document.title, window.location.pathname);
              fetchMenu();
            } else {
              setPhonePeStatusMsg(
                res.message || "Payment is pending or was cancelled. Staff can assist at the counter."
              );
            }
          })
          .catch(() => {
            setPhonePeStatusMsg("Unable to verify payment status automatically. Please check with staff.");
          })
          .finally(() => {
            setVerifyingPhonePe(false);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function getActiveAddonGroups(item: any) {
    return (item?.addonLinks || [])
      .map((l: any) => l.addonGroup)
      .filter((g: any) => g && g.isActive !== false && Array.isArray(g.options) && g.options.length > 0);
  }

  function handleProductAddClick(item: any) {
    const activeGroups = getActiveAddonGroups(item);
    if (activeGroups.length > 0) {
      // Pre-select default options if any
      const defaults: QRCartAddon[] = [];
      for (const group of activeGroups) {
        for (const opt of group.options) {
          if (opt.isDefault && opt.isActive !== false) {
            defaults.push({
              groupId: group.id,
              groupName: group.name,
              optionId: opt.id,
              name: opt.name,
              pricePaise: opt.pricePaise || 0,
            });
          }
        }
      }
      setSelectedAddons(defaults);
      setItemNotes("");
      setCustomizingQty(1);
      setCustomizingItem(item);
    } else {
      addDirectToCart(item);
    }
  }

  function addDirectToCart(item: any) {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.menuItemId === item.id && (!i.selectedAddons || i.selectedAddons.length === 0)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [
        ...prev,
        {
          lineId: `${item.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          menuItemId: item.id,
          name: item.name,
          basePricePaise: item.pricePaise,
          pricePaise: item.pricePaise,
          quantity: 1,
          selectedAddons: [],
        },
      ];
    });
  }

  function toggleAddonOption(group: any, option: any) {
    setSelectedAddons((prev) => {
      const isSingle = group.selectionType === "SINGLE";
      const existingInGroup = prev.filter((a) => a.groupId === group.id);
      const isAlreadySelected = existingInGroup.some((a) => a.optionId === option.id);

      if (isSingle) {
        if (isAlreadySelected) {
          return group.isRequired ? prev : prev.filter((a) => a.optionId !== option.id);
        }
        const withoutGroup = prev.filter((a) => a.groupId !== group.id);
        return [
          ...withoutGroup,
          {
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            name: option.name,
            pricePaise: option.pricePaise || 0,
          },
        ];
      }

      if (isAlreadySelected) {
        return prev.filter((a) => a.optionId !== option.id);
      }

      if (group.maxSelections && existingInGroup.length >= group.maxSelections) {
        return prev;
      }

      return [
        ...prev,
        {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          name: option.name,
          pricePaise: option.pricePaise || 0,
        },
      ];
    });
  }

  function handleSaveCustomizedItem() {
    if (!customizingItem) return;
    const activeGroups = getActiveAddonGroups(customizingItem);

    for (const group of activeGroups) {
      const selected = selectedAddons.filter((a) => a.groupId === group.id);
      if (group.isRequired && selected.length === 0) {
        alert(`Please select required option(s) for "${group.name}".`);
        return;
      }
      if (group.minSelections > 0 && selected.length < group.minSelections) {
        alert(`Please select at least ${group.minSelections} option(s) for "${group.name}".`);
        return;
      }
    }

    const addonsSum = selectedAddons.reduce((s, a) => s + (a.pricePaise || 0), 0);
    const effectiveUnitPricePaise = customizingItem.pricePaise + addonsSum;

    setCart((prev) => [
      ...prev,
      {
        lineId: `${customizingItem.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: customizingItem.id,
        name: customizingItem.name,
        basePricePaise: customizingItem.pricePaise,
        pricePaise: effectiveUnitPricePaise,
        quantity: Math.max(1, customizingQty),
        notes: itemNotes.trim() || undefined,
        selectedAddons,
      },
    ]);

    setCustomizingItem(null);
    setSelectedAddons([]);
    setItemNotes("");
    setCustomizingQty(1);
  }

  function incrementCartLine(lineId: string) {
    setCart((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l))
    );
  }

  function decrementCartLine(lineId: string) {
    setCart((prev) => {
      const line = prev.find((l) => l.lineId === lineId);
      if (!line) return prev;
      if (line.quantity <= 1) {
        return prev.filter((l) => l.lineId !== lineId);
      }
      return prev.map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity - 1 } : l));
    });
  }

  function removeCartLine(lineId: string) {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  }

  function decrementItem(itemId: string) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === itemId);
      if (idx < 0) return prev;
      if (prev[idx].quantity <= 1) {
        return prev.filter((_, i) => i !== idx);
      }
      const copy = [...prev];
      copy[idx].quantity -= 1;
      return copy;
    });
  }

  // Submit Order with PHONEPE PAYMENT GATEWAY AUTOMATIC VERIFICATION
  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      // Step 1: Register Table Order
      const res = await fetch(`/api/qr/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            notes: line.notes || undefined,
            selectedAddons: line.selectedAddons || [],
            modifiers: line.selectedAddons || [],
          })),
          customerName,
          customerPhone,
          whatsappConsent,
          notes,
          payOnline: false, // Initially unpaid until verified by PhonePe
        }),
      });
      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to place order");
      }

      // If customer chose "Pay Later at Counter", finish immediately
      if (!payOnline) {
        setPlacedOrder({
          ...orderData,
          isPaid: false,
        });
        setCart([]);
        setIsCartOpen(false);
        fetchMenu();
        return;
      }

      // Step 2: Initiate PhonePe Payment Gateway
      const initiateRes = await fetch("/api/payments/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          token,
        }),
      });
      const initiateData = await initiateRes.json();

      if (!initiateRes.ok || !initiateData.redirectUrl) {
        // Fallback: order is registered in kitchen, guest can pay at counter
        setPlacedOrder({
          ...orderData,
          isPaid: false,
          fallbackNotice: initiateData.error || "PhonePe gateway offline. Order registered for counter payment.",
        });
        setCart([]);
        setIsCartOpen(false);
        fetchMenu();
        return;
      }

      // Redirect customer to PhonePe Pay Page (1-tap PhonePe, GPay, Paytm, Cards)
      window.location.href = initiateData.redirectUrl;
    } catch (err: any) {
      alert(err.message || "Order submission failed. Please call your steward.");
      setSubmitting(false);
    }
  }

  // Settle active unpaid table bill with PHONEPE PAYMENT GATEWAY
  async function handleSettleActiveBill() {
    if (!data?.activeOrder?.id) return;
    setSettlingBill(true);
    try {
      const initiateRes = await fetch("/api/payments/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.activeOrder.id,
          token,
        }),
      });
      const initiateData = await initiateRes.json();

      if (!initiateRes.ok || !initiateData.redirectUrl) {
        throw new Error(initiateData.error || "PhonePe gateway is currently unavailable. Please pay at counter.");
      }

      // Redirect diner to PhonePe Pay Page
      window.location.href = initiateData.redirectUrl;
    } catch (err: any) {
      alert(err.message || "Failed to initiate PhonePe payment.");
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

  // Manual fallback UPI link
  const cartUpiAmount = (cartGrandTotalPaise / 100).toFixed(2);
  const cartUpiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    merchantName
  )}&am=${cartUpiAmount}&cu=INR&tn=${encodeURIComponent(
    `Table-${table.number}-Order`
  )}`;

  const activeOrderAmount = activeOrder ? (activeOrder.totalPaise / 100).toFixed(2) : "0.00";
  const activeOrderUpiLink = activeOrder
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        merchantName
      )}&am=${activeOrderAmount}&cu=INR&tn=${encodeURIComponent(
        `Table-${table.number}-Bill-${activeOrder.orderNumber}`
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

      {/* Return from PhonePe Status Notification */}
      {verifyingPhonePe && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="rounded-2xl border border-[#5f259f]/30 bg-[#5f259f]/10 p-3.5 flex items-center gap-3 text-xs font-bold text-[#5f259f] animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin shrink-0 text-[#5f259f]" />
            <span>{phonePeStatusMsg || "Verifying payment with PhonePe…"}</span>
          </div>
        </div>
      )}

      {phonePeStatusMsg && !verifyingPhonePe && !placedOrder?.isPaid && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 flex items-center justify-between text-xs text-amber-900">
            <span>ℹ️ {phonePeStatusMsg}</span>
            <button
              onClick={() => setPhonePeStatusMsg(null)}
              className="text-amber-800 font-black px-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
                Order <b className="font-bold">#{activeOrder.orderNumber}</b> is dining.
                Settle your bill online with <b>instant automatic verification</b> via PhonePe, Google Pay, Paytm, or Cards!
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => setIsSettleModalOpen(true)}
                  className="flex-1 rounded-xl bg-[#5f259f] hover:bg-[#4d1d82] text-white py-2.5 px-3 text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ShieldCheck className="h-4 w-4" />
                  ⚡ Pay via PhonePe (Auto-Verified)
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
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#16845B]/30 font-black">
                🟢 VERIFIED PAID
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
              {placedOrder.isPaid ? "Payment Verified & Order Received!" : "Order Sent to Kitchen!"}
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
                  <span className="font-bold text-[#5f259f] bg-[#5f259f]/10 px-2 py-0.5 rounded-full border border-[#5f259f]/20 text-[11px] flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#5f259f]" /> Verified via PhonePe UPI
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                    Pay at counter after dining
                  </span>
                )}
              </div>
              {placedOrder.utr && (
                <div className="text-[10px] text-[#718078] font-mono pt-1">
                  Bank UTR: {placedOrder.utr}
                </div>
              )}
              {placedOrder.fallbackNotice && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  ℹ️ {placedOrder.fallbackNotice}
                </div>
              )}
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
          const itemInCartCount = cart
            .filter((i) => i.menuItemId === item.id)
            .reduce((sum, i) => sum + i.quantity, 0);
          const hasAddons = getActiveAddonGroups(item).length > 0;
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
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs font-extrabold text-[#16845B]">
                    {formatINR(item.pricePaise)}
                  </span>
                  {hasAddons && (
                    <span className="text-[10px] text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 font-bold px-1.5 py-0.5 rounded-full">
                      Customisable
                    </span>
                  )}
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
                {hasAddons ? (
                  itemInCartCount > 0 ? (
                    <button
                      onClick={() => handleProductAddClick(item)}
                      className="rounded-full bg-[#E8F5EE] border border-[#16845B] text-[#16845B] px-2.5 py-1 text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-[#16845B] hover:text-white transition cursor-pointer"
                    >
                      <span>{itemInCartCount} added</span>
                      <Plus className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleProductAddClick(item)}
                      className="rounded-full bg-white border border-[#16845B] text-[#16845B] hover:bg-[#16845B] hover:text-white px-3 py-1 text-xs font-bold transition shadow-2xs w-full text-center cursor-pointer"
                    >
                      + Add
                    </button>
                  )
                ) : itemInCartCount > 0 ? (
                  <div className="flex items-center gap-1.5 bg-[#E8F5EE] border border-[#16845B]/30 rounded-full px-2 py-0.5">
                    <button
                      onClick={() => decrementItem(item.id)}
                      className="h-5 w-5 rounded-full bg-white text-[#16845B] font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="font-extrabold text-xs text-[#16845B] min-w-[12px] text-center">
                      {itemInCartCount}
                    </span>
                    <button
                      onClick={() => handleProductAddClick(item)}
                      className="h-5 w-5 rounded-full bg-[#16845B] text-white font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleProductAddClick(item)}
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

      {/* Cart Drawer with PhonePe Payment Gateway Verification */}
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
            <div className="space-y-2.5 divide-y divide-[#E5EBE7]/60">
              {cart.map((item) => (
                <div
                  key={item.lineId}
                  className="pt-2 flex items-start justify-between text-sm gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#172B25] text-sm leading-tight">{item.name}</div>
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="text-[11px] text-[#16845B] mt-0.5 space-y-0.5">
                        {item.selectedAddons.map((addon) => (
                          <div key={addon.optionId} className="flex items-center gap-1">
                            <span>+ {addon.name}</span>
                            {addon.pricePaise > 0 && (
                              <span className="text-[#718078]">({formatINR(addon.pricePaise)})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] text-amber-800 italic mt-0.5">
                        ↳ Note: {item.notes}
                      </div>
                    )}
                    <div className="text-xs text-[#718078] mt-1">
                      {formatINR(item.pricePaise)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => decrementCartLine(item.lineId)}
                      className="h-6 w-6 rounded-full bg-[#F8FAF9] text-[#172B25] font-black text-xs grid place-items-center cursor-pointer hover:bg-gray-200 transition"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-[#172B25] min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => incrementCartLine(item.lineId)}
                      className="h-6 w-6 rounded-full bg-[#16845B] text-white font-black text-xs grid place-items-center cursor-pointer hover:bg-[#116B49] transition"
                    >
                      +
                    </button>
                    <span className="text-xs font-extrabold text-[#172B25] ml-2 min-w-[65px] text-right">
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
                <span>Send itemized tax invoice to WhatsApp upon payment</span>
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
                Choose Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayOnline(true)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                    payOnline
                      ? "border-[#5f259f] bg-[#5f259f]/10 text-[#172B25] ring-2 ring-[#5f259f]/20"
                      : "border-[#E5EBE7] bg-white text-[#718078] hover:bg-[#F8FAF9]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <ShieldCheck className="h-4 w-4 text-[#5f259f]" />
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#5f259f] text-white">
                      0% Fee
                    </span>
                  </div>
                  <div className="text-xs font-black text-[#172B25]">⚡ Pay with PhonePe</div>
                  <div className="text-[10px] text-[#718078]">Auto-Verified UPI & Cards</div>
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

              {payOnline && (
                <div className="p-3 rounded-2xl bg-[#5f259f]/10 border border-[#5f259f]/20 text-[11px] text-[#5f259f] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>PhonePe Gateway: 0% Fee Auto-Verification</span>
                  </div>
                  <span className="text-[9px] bg-white px-2 py-0.5 rounded-full font-extrabold border border-[#5f259f]/30">
                    PhonePe • GPay • Paytm
                  </span>
                </div>
              )}

              {/* Fallback Manual QR accordion */}
              {payOnline && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualCartUpi(!showManualCartUpi)}
                    className="text-[10px] text-[#718078] hover:text-[#172B25] underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <QrCode className="h-3 w-3" />
                    {showManualCartUpi ? "Hide Staff QR" : "Alternative: Scan Direct Staff UPI QR"}
                  </button>
                  {showManualCartUpi && (
                    <div className="mt-2 p-3 bg-white border border-[#E5EBE7] rounded-xl flex flex-col items-center gap-2">
                      <div className="p-1.5 bg-white border border-[#E5EBE7] rounded-lg shadow-2xs">
                        <QRCodeSVG
                          value={cartUpiLink}
                          size={140}
                          level="M"
                          includeMargin={false}
                          className="mx-auto"
                        />
                      </div>
                      <p className="text-[10px] text-[#718078]">
                        UPI: <b>{upiId}</b> ({merchantName})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit / Pay Button */}
            <button
              onClick={submitOrder}
              disabled={submitting}
              className={`w-full rounded-full text-white py-3.5 text-sm font-black shadow-sm transition disabled:opacity-50 cursor-pointer active:scale-98 flex items-center justify-center gap-2 ${
                payOnline ? "bg-[#5f259f] hover:bg-[#4d1d82]" : "bg-[#16845B] hover:bg-[#116B49]"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening PhonePe Gateway…
                </>
              ) : payOnline ? (
                `🚀 Pay ${formatINR(cartGrandTotalPaise)} via PhonePe & Order →`
              ) : (
                `Send Table ${table.number} Order to Kitchen →`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Settle Active Table Bill Modal (While Dining) with PhonePe Automatic Verification */}
      {isSettleModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#5f259f]" />
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
              <div className="p-4 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/40 text-[#16845B] text-center space-y-1.5 animate-in zoom-in-95">
                <div className="h-10 w-10 rounded-full bg-[#16845B] text-white grid place-items-center mx-auto shadow-xs">
                  <Check className="h-5 w-5 stroke-[3]" />
                </div>
                <div className="font-black text-sm">{settleSuccessMsg}</div>
                <div className="text-xs text-[#718078]">
                  Digital tax invoice sent to your WhatsApp. Thank you for dining with us!
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
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#5f259f]/10 to-[#F8FAF9] border border-[#5f259f]/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-[#718078] block">
                      Total Bill Amount
                    </span>
                    <span className="text-xl font-black text-[#5f259f]">
                      {formatINR(activeOrder.totalPaise)}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#5f259f] text-white flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Auto-Verified
                  </span>
                </div>

                {/* Phone for WhatsApp Receipt */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#718078] uppercase mb-1">
                    WhatsApp Phone for Bill PDF
                  </label>
                  <input
                    value={settlePhone}
                    onChange={(e) => setSettlePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B25] focus:outline-none focus:border-[#5f259f]"
                  />
                </div>

                {/* PhonePe Automated Payment Gateway Button */}
                <button
                  onClick={handleSettleActiveBill}
                  disabled={settlingBill}
                  className="w-full rounded-2xl bg-[#5f259f] hover:bg-[#4d1d82] text-white py-3.5 px-4 text-xs font-black flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {settlingBill ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening PhonePe Gateway…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      🚀 Pay {formatINR(activeOrder.totalPaise)} via PhonePe (Auto-Verified)
                    </>
                  )}
                </button>

                {/* Manual UPI fallback toggle */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualSettleUpi(!showManualSettleUpi)}
                    className="text-[10px] text-[#718078] hover:text-[#172B25] underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <QrCode className="h-3 w-3" />
                    {showManualSettleUpi ? "Hide Staff QR" : "Having issues? Show Direct Staff UPI QR"}
                  </button>
                  {showManualSettleUpi && (
                    <div className="mt-2 p-3 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl flex flex-col items-center gap-2">
                      <a
                        href={activeOrderUpiLink}
                        className="text-xs font-bold text-[#16845B] underline"
                      >
                        Click to Launch Direct UPI App
                      </a>
                      <div className="p-1.5 bg-white border border-[#E5EBE7] rounded-lg shadow-2xs">
                        <QRCodeSVG
                          value={activeOrderUpiLink}
                          size={140}
                          level="M"
                          includeMargin={false}
                          className="mx-auto"
                        />
                      </div>
                      <p className="text-[10px] text-[#718078]">
                        Pay to: <b>{upiId}</b> ({merchantName})
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Product Add-on & Customizer Bottom-Sheet Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E5EBE7] pb-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      customizingItem.isVeg ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  />
                  <h3 className="font-extrabold text-base text-[#172B25] leading-snug">
                    {customizingItem.name}
                  </h3>
                </div>
                <div className="text-xs font-black text-[#16845B]">
                  Base Price: {formatINR(customizingItem.pricePaise)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="h-8 w-8 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer hover:bg-[#E5EBE7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Groups & Options Body */}
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {getActiveAddonGroups(customizingItem).map((group: any) => {
                const isSingle = group.selectionType === "SINGLE";
                const groupSelected = selectedAddons.filter((a) => a.groupId === group.id);
                return (
                  <div key={group.id} className="rounded-2xl border border-[#E5EBE7] p-3.5 bg-[#F8FAF9] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-[#172B25] uppercase tracking-wide">
                          {group.name}
                        </span>
                        <div className="text-[11px] text-[#718078]">
                          {isSingle
                            ? "Select 1 option"
                            : group.maxSelections
                            ? `Choose up to ${group.maxSelections}`
                            : "Multiple options allowed"}
                        </div>
                      </div>
                      {group.isRequired ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          Optional
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {group.options?.filter((o: any) => o.isActive !== false).map((opt: any) => {
                        const isChecked = selectedAddons.some((a) => a.optionId === opt.id);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => toggleAddonOption(group, opt)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                              isChecked
                                ? "bg-[#E8F5EE] border-[#16845B] text-[#172B25] font-semibold"
                                : "bg-white border-[#E5EBE7] text-[#4A5D55] hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                                  isChecked
                                    ? "bg-[#16845B] border-[#16845B] text-white"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span>{opt.name}</span>
                            </div>
                            <span className="font-bold text-[#16845B]">
                              {opt.pricePaise > 0 ? `+ ${formatINR(opt.pricePaise)}` : "Free"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Special Cooking Instructions Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#172B25]">
                  Special Instructions
                </label>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. Less spicy, extra crunchy, no cutlery, allergic to nuts..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] focus:outline-none focus:border-[#16845B] text-[#172B25]"
                />
              </div>
            </div>

            {/* Bottom Add Action Bar */}
            <div className="pt-3 border-t border-[#E5EBE7] flex items-center gap-3 shrink-0">
              <div className="flex items-center border border-[#D2DFD8] rounded-full p-1 bg-white">
                <button
                  type="button"
                  onClick={() => setCustomizingQty((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-xs font-black text-[#172B25]">
                  {customizingQty}
                </span>
                <button
                  type="button"
                  onClick={() => setCustomizingQty((q) => q + 1)}
                  className="w-7 h-7 rounded-full bg-[#16845B] text-white flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveCustomizedItem}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3 px-4 font-bold text-xs flex items-center justify-between shadow-sm cursor-pointer transition active:scale-98"
              >
                <span>Add Item to Order</span>
                <span>
                  {formatINR(
                    (customizingItem.pricePaise +
                      selectedAddons.reduce((s, a) => s + (a.pricePaise || 0), 0)) *
                      customizingQty
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
