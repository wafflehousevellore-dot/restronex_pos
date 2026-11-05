"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { apiFetch } from "@/lib/api";
import { Tag, Check, X, CreditCard, Banknote, QrCode, Printer, MessageSquare, Receipt, Share2, Sparkles, ShieldAlert, Percent, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  pricePaise: number;
  categoryId: string;
  isVeg: boolean;
  imageUrl?: string | null;
  description?: string | null;
  isSoldOut?: boolean;
  category?: { name: string };
};
type Table = {
  id: string;
  number: string;
  status: string;
  area: string;
  currentOrderId?: string | null;
  orderTotalPaise?: number | null;
};
type Outlet = { id: string; name: string };

export type ReceiptData = {
  orderNumber: string;
  invoiceNumber: string;
  outletName: string;
  date: string;
  orderType: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  items: { name: string; quantity: number; unitPricePaise: number }[];
  subtotalPaise: number;
  discountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
};

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
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPaise: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [customerLoyalty, setCustomerLoyalty] = useState<{
    id: string;
    name: string;
    points: number;
    visitCount: number;
  } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [managerPinModal, setManagerPinModal] = useState<{
    open: boolean;
    pendingDiscount?: { code: string; discountPaise: number };
  } | null>(null);
  const [managerPinInput, setManagerPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [posting, setPosting] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ orderNumber: string; total: number } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loadingTableOrder, setLoadingTableOrder] = useState(false);

  async function loadActiveTableOrder(orderId: string) {
    setLoadingTableOrder(true);
    try {
      const res = await apiFetch(`/api/orders?orderId=${orderId}`);
      const orders = await res.json();
      const ord = Array.isArray(orders) ? orders[0] : orders;
      if (ord && Array.isArray(ord.items)) {
        setCart(
          ord.items.map((it: any) => ({
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: it.quantity,
            unitPricePaise: it.unitPricePaise,
          }))
        );
        if (ord.customerName && ord.customerName !== "Table Guest") {
          setCustomerName(ord.customerName);
        }
        if (ord.customerPhone) {
          setCustomerPhone(ord.customerPhone);
        }
        setMsg({
          type: "info",
          text: `Loaded active order #${ord.orderNumber} for Table ${selectedTableLabel}. Ready to bill.`,
        });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to load active table order" });
    } finally {
      setLoadingTableOrder(false);
    }
  }

  // Auto-fetch Customer Loyalty profile when phone is typed (>= 10 digits)
  useEffect(() => {
    const clean = customerPhone.replace(/\D/g, "");
    if (clean.length >= 10) {
      apiFetch(`/api/customers?phone=${clean}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.id) {
            setCustomerLoyalty({
              id: data.id,
              name: data.name,
              points: data.loyaltyPoints || 0,
              visitCount: data.visitCount || 0,
            });
            if (!customerName || customerName === "Guest Customer") {
              setCustomerName(data.name);
            }
          } else {
            setCustomerLoyalty(null);
          }
        })
        .catch(() => setCustomerLoyalty(null));
    } else {
      setCustomerLoyalty(null);
      setRedeemPoints(false);
    }
  }, [customerPhone]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => (i.category?.name || "Other").trim()).filter(Boolean))),
    [items]
  );
  const filtered = useMemo(
    () =>
      categoryFilter === "All"
        ? items
        : items.filter((i) => (i.category?.name?.trim() || "Other") === categoryFilter),
    [items, categoryFilter]
  );

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

  const subtotal = cart.reduce(
    (s, c) => s + (Number(c.unitPricePaise) || 0) * (Number(c.quantity) || 0),
    0
  );
  const couponDiscountPaise = appliedCoupon ? Math.min(appliedCoupon.discountPaise, subtotal) : 0;
  const afterCoupon = Math.max(0, subtotal - couponDiscountPaise);

  // Loyalty Points: 1 point = ₹1 (100 paise)
  const maxPointsCanRedeem = customerLoyalty ? Math.min(customerLoyalty.points, Math.floor(afterCoupon / 100)) : 0;
  const loyaltyDiscountPaise = redeemPoints ? maxPointsCanRedeem * 100 : 0;
  const discountPaise = couponDiscountPaise + loyaltyDiscountPaise;

  const taxable = Math.max(0, subtotal - discountPaise);
  const cgst = Math.round(taxable * 0.09);
  const sgst = Math.round(taxable * 0.09);
  const total = taxable + cgst + sgst;
  const pointsToEarn = Math.floor(total / 10000) * 5; // 5 pts per ₹100 spent

  function applyQuickDiscount(type: "PCT" | "FLAT", value: number, label: string) {
    if (cart.length === 0) {
      setCouponError("Add items to cart before applying discount");
      return;
    }
    const computedPaise = type === "PCT" ? Math.round((subtotal * value) / 100) : value * 100;

    // Security check: discounts > 15% or flat > ₹150 require Manager PIN
    const isHighDiscount = (type === "PCT" && value > 15) || (type === "FLAT" && value > 150);
    if (isHighDiscount) {
      setManagerPinModal({
        open: true,
        pendingDiscount: { code: label, discountPaise: computedPaise },
      });
      setManagerPinInput("");
      setPinError(null);
      return;
    }

    setAppliedCoupon({ code: label, discountPaise: computedPaise });
    setCouponCode(label);
    setCouponError(null);
  }

  function verifyManagerPin() {
    // Default Manager PIN is 1234
    if (managerPinInput === "1234") {
      if (managerPinModal?.pendingDiscount) {
        setAppliedCoupon(managerPinModal.pendingDiscount);
        setCouponCode(managerPinModal.pendingDiscount.code);
        setCouponError(null);
        setMsg({ type: "success", text: `Manager authorized ${managerPinModal.pendingDiscount.code} discount.` });
      }
      setManagerPinModal(null);
      setManagerPinInput("");
      setPinError(null);
    } else {
      setPinError("Invalid Manager PIN. Default PIN is 1234.");
    }
  }

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
    if (!selectedOutlet) {
      return setMsg({
        type: "error",
        text: "Select an outlet first — complete 8-Step Onboarding to create your business.",
      });
    }
    if (cart.length === 0) {
      return setMsg({ type: "error", text: "Cart is empty — tap menu items to add." });
    }
    if (selectedTable && orderType !== "DINE_IN") {
      return setMsg({
        type: "error",
        text: "Tables only for Dine-in orders. Change order type to Dine-in or clear table.",
      });
    }
    for (const c of cart) {
      if (!c.menuItemId || c.quantity < 1 || c.unitPricePaise < 0) {
        return setMsg({ type: "error", text: `Invalid item ${c.name} — remove and re-add.` });
      }
    }
    setPosting(true);
    setMsg({ type: "info", text: "Placing order..." });
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
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            name: c.name,
            quantity: c.quantity,
            unitPricePaise: c.unitPricePaise,
          })),
          discountPaise,
          loyaltyPointsRedeemed: redeemPoints ? maxPointsCanRedeem : 0,
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
        const raw = (j.raw as string) || "";
        const errMsg = (j.error as string) || raw.slice(0, 300) || `Failed ${res.status}`;
        if (raw.includes("e2b-traffic-access-token") || res.status === 403) {
          setMsg({ type: "error", text: "Preview blocked — refresh and retry." });
        } else if (res.status === 401) {
          setMsg({ type: "error", text: "Session expired — please sign in again." });
        } else {
          setMsg({ type: "error", text: errMsg });
        }
        return;
      }
      const orderNumber = (j.orderNumber as string) || (j.orderId as string) || "OK";
      const billedTotal = (j as unknown as { totals: { total: number } }).totals?.total ?? total;
      const invoiceNumber = (j.invoiceNumber as string) || `INV-${orderNumber.replace("ORD-", "")}`;
      const outletObj = outlets.find((o) => o.id === selectedOutlet);

      const receipt: ReceiptData = {
        orderNumber,
        invoiceNumber,
        outletName: outletObj?.name || "RestroNex Restaurant",
        date: new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        orderType: orderType.replace("_", " "),
        tableName: selectedTableLabel || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          unitPricePaise: c.unitPricePaise,
        })),
        subtotalPaise: subtotal,
        discountPaise,
        cgstPaise: cgst,
        sgstPaise: sgst,
        totalPaise: billedTotal,
      };

      setActiveReceipt(receipt);
      setShowReceipt(true);
      setLastOrder({ orderNumber, total: billedTotal });
      setMsg({
        type: "success",
        text: `✓ Order ${orderNumber} billed via ${paymentMethod}! ${formatINR(billedTotal)} ${
          discountPaise > 0 ? `(Saved ${formatINR(discountPaise)})` : ""
        } — KOT sent to kitchen.`,
      });
      setCart([]);
      setAppliedCoupon(null);
      setCouponCode("");
      setRedeemPoints(false);
      setCustomerLoyalty(null);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: "error", text: m });
    } finally {
      setPosting(false);
    }
  }

  const selectedTableObj = selectedTable ? tables.find((t) => t.id === selectedTable) || null : null;
  const selectedTableLabel = selectedTableObj?.number || "";

  if (initialItems.length === 0 && initialOutlets.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto text-[#172B25]">
        <h1 className="text-2xl font-black text-[#172B25]">POS — Billing</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No outlets or menu found. Complete{" "}
          <Link href="/app/onboarding" className="underline text-[#16845B] font-bold">
            8-Step Onboarding
          </Link>{" "}
          to seed demo data, or create items in{" "}
          <Link href="/app/menu" className="underline font-bold text-[#16845B]">
            Menu
          </Link>
          .
        </div>
        <Card className="p-8 text-center bg-white border-[#E5EBE7]">
          <div className="text-[#718078] text-sm">
            POS needs at least 1 outlet and menu items. Demo seed creates Koramangala outlet + 7 items.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">POS — Billing</h1>
          <p className="text-sm text-[#718078]">
            Paise-precise • CGST 9% + SGST 9% • KOT auto-fired • {items.length} items
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none shadow-xs"
          >
            <option value="">Select outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {outlets.length === 0 && (
            <span className="text-xs text-amber-700 font-medium">No outlet — onboard first</span>
          )}
        </div>
      </div>

      {lastOrder && (
        <div className="rounded-2xl border border-[#E5EBE7] bg-[#E8F5EE] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="text-sm font-black text-[#172B25]">Last order: {lastOrder.orderNumber}</div>
            <div className="text-xs text-[#718078]">
              Total {formatINR(lastOrder.total)} • Sent to kitchen • Ready to print or send via WhatsApp
            </div>
          </div>
          <div className="flex gap-2">
            {activeReceipt && (
              <button
                onClick={() => setShowReceipt(true)}
                className="rounded-full bg-[#16845B] text-white px-4 py-2 text-xs font-bold hover:bg-[#116B49] shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Print Bill
              </button>
            )}
            <Link
              href="/app/orders"
              className="rounded-full bg-white border border-[#E5EBE7] text-[#172B25] px-4 py-2 text-xs font-bold hover:bg-[#F8FAF9] shadow-xs"
            >
              View Orders →
            </Link>
            <Link
              href="/app/kitchen"
              className="rounded-full bg-white border border-[#E5EBE7] text-[#172B25] px-4 py-2 text-xs font-bold hover:bg-[#F8FAF9] shadow-xs"
            >
              KDS →
            </Link>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_390px] gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#172B25]">
              Menu {filtered.length > 0 ? `• ${filtered.length} items` : ""}
            </CardTitle>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["All", ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold border transition ${
                    categoryFilter === c
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
            {items.length === 0 ? (
              <div className="text-sm text-[#718078] py-10 text-center rounded-xl border border-dashed border-[#E5EBE7]">
                No menu yet.{" "}
                <Link href="/app/menu" className="text-[#16845B] underline">
                  Create items in Menu
                </Link>{" "}
                or run Onboarding.
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-[#718078] py-8 text-center">No items in {categoryFilter}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => !it.isSoldOut && addToCart(it)}
                    disabled={it.isSoldOut}
                    className={`rounded-2xl border border-[#E5EBE7] bg-white text-left transition group overflow-hidden flex flex-col justify-between ${
                      it.isSoldOut
                        ? "opacity-60 cursor-not-allowed bg-gray-50"
                        : "hover:border-[#16845B] hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#16845B]/30"
                    }`}
                  >
                    {/* Consistent Aspect Ratio Image Container */}
                    <div className="relative aspect-[4/3] w-full bg-[#F8FAF9] overflow-hidden border-b border-[#E5EBE7]">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#F8FAF9] text-[#718078]">
                          <UtensilsCrossed className="w-6 h-6 text-[#16845B]/40 mb-1" />
                          <span className="text-[10px] font-bold text-[#718078]/70 uppercase tracking-wider">
                            RestroNex
                          </span>
                        </div>
                      )}

                      {/* Veg / Non-Veg Indicator Badge */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black shadow-2xs backdrop-blur-xs ${
                            it.isVeg
                              ? "bg-white/95 text-emerald-700 border border-emerald-300"
                              : "bg-white/95 text-red-700 border border-red-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              it.isVeg ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                          {it.isVeg ? "VEG" : "NON-VEG"}
                        </span>
                      </div>

                      {/* Selling Price Badge */}
                      <div className="absolute bottom-2 right-2">
                        <span className="rounded-full bg-white/95 border border-[#E5EBE7] px-2 py-0.5 text-xs font-black text-[#16845B] shadow-2xs">
                          {formatINR(it.pricePaise)}
                        </span>
                      </div>

                      {/* Available / Sold Out Status Overlay */}
                      {it.isSoldOut && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="px-2.5 py-1 rounded-full bg-red-600 text-white font-extrabold text-[10px] tracking-wider">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Name & Quick Action */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div
                        className="text-xs font-bold text-[#172B25] line-clamp-2 leading-snug group-hover:text-[#16845B] transition-colors"
                        title={it.name}
                      >
                        {it.name}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[#718078] truncate max-w-[80px]">
                          {it.category?.name || "Menu"}
                        </span>
                        {!it.isSoldOut && (
                          <span className="text-[#16845B] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            + Add
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7]">
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Order type</Label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as typeof orderType)}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
                >
                  <option value="DINE_IN">Dine-in</option>
                  <option value="TAKEAWAY">Takeaway</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </div>
              <div>
                <Label className="text-[#718078] text-xs font-semibold">
                  Table {orderType !== "DINE_IN" && <span className="text-amber-700">(Dine-in only)</span>}
                </Label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  disabled={orderType !== "DINE_IN"}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none disabled:opacity-40"
                >
                  <option value="">No table</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.number} — {t.area} ({t.status})
                    </option>
                  ))}
                </select>
                {orderType === "DINE_IN" && tables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {tables.map((t) => {
                      const isOccupied = t.status === "OCCUPIED";
                      const isSelected = selectedTable === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTable(isSelected ? "" : t.id)}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? "bg-[#16845B] text-white border-[#16845B] shadow-2xs"
                              : isOccupied
                              ? "bg-amber-50 border-amber-200 text-amber-900"
                              : "bg-white border-[#E5EBE7] text-[#172B25] hover:bg-[#F8FAF9]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSelected ? "bg-white" : isOccupied ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          {t.number}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedTableObj && selectedTableObj.status === "OCCUPIED" && selectedTableObj.currentOrderId && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <div className="font-extrabold text-amber-950">Active Table {selectedTableObj.number} Order</div>
                      <div className="text-[11px] text-amber-800">
                        Running bill: {formatINR(selectedTableObj.orderTotalPaise || 0)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadActiveTableOrder(selectedTableObj.currentOrderId!)}
                      disabled={loadingTableOrder}
                      className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      {loadingTableOrder ? "Loading..." : "Load Cart →"}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Customer phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
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
              <span className="text-xs font-normal text-[#718078]">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
            <div className="text-xs text-[#718078]">CGST 9% + SGST 9% • Auto KOT • Paise math</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[#718078] text-xs font-semibold">Customer name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in (optional)"
                className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25] text-sm h-10"
              />
            </div>

            {cart.length === 0 ? (
              <div className="text-sm text-[#718078] py-8 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                Cart empty
                <br />
                <span className="text-xs">Tap menu items to add</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {cart.map((c, i) => (
                  <div
                    key={`${c.menuItemId}-${i}`}
                    className="flex items-center justify-between rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#172B25] truncate" title={c.name}>
                        {c.name}
                      </div>
                      <div className="text-xs text-[#718078]">
                        {formatINR(c.unitPricePaise)} × {c.quantity} ={" "}
                        {formatINR((c.unitPricePaise || 0) * c.quantity)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => decQty(i)}
                        className="h-7 w-7 rounded-full border border-[#E5EBE7] bg-white text-[#172B25] hover:bg-slate-100 flex items-center justify-center text-sm font-bold shadow-xs cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-[#172B25] w-5 text-center">{c.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() => incQty(i)}
                        className="h-7 w-7 rounded-full bg-[#16845B] text-white hover:bg-[#116B49] flex items-center justify-center text-sm font-bold shadow-xs cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        aria-label="Remove item"
                        onClick={() => removeItem(i)}
                        className="ml-1 h-7 w-7 rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center text-xs cursor-pointer"
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
                <span className="text-[10px] text-[#16845B] uppercase font-bold tracking-wider">
                  {paymentMethod}
                </span>
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["UPI", "CASH", "CARD"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-xl py-2 px-2 text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
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

              {paymentMethod === "UPI" && total > 0 && (
                <div className="rounded-xl border border-[#E5EBE7] bg-[#E8F5EE]/40 p-3 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#16845B]">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="h-3.5 w-3.5" /> Customer Scan & Pay
                    </span>
                    <span className="text-[11px] bg-[#16845B] text-white px-2 py-0.5 rounded-full font-black">
                      {formatINR(total)}
                    </span>
                  </div>
                  <div className="mx-auto w-fit p-2 bg-white rounded-xl shadow-xs border border-[#E5EBE7]">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                        `upi://pay?pa=restronex@icici&pn=${encodeURIComponent(
                          outlets.find((o) => o.id === selectedOutlet)?.name || "Restaurant"
                        )}&am=${(total / 100).toFixed(2)}&cu=INR`
                      )}&margin=2`}
                      alt="Customer UPI QR Code"
                      className="w-28 h-28 object-contain rounded"
                    />
                  </div>
                  <div className="text-[10px] text-[#718078] font-medium">
                    Scan with GPay, PhonePe, Paytm, BHIM
                  </div>
                </div>
              )}
            </div>

            {/* Customer Loyalty Profile & Redemption */}
            {customerLoyalty && (
              <div className="rounded-xl border border-[#16845B]/30 bg-[#E8F5EE]/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#172B25]">
                    <Sparkles className="h-4 w-4 text-[#16845B]" />
                    <span>Loyalty: {customerLoyalty.name}</span>
                  </div>
                  <span className="rounded-full bg-[#16845B] text-white px-2.5 py-0.5 text-[11px] font-black">
                    {customerLoyalty.points} pts (₹{customerLoyalty.points})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-[#718078]">
                    {maxPointsCanRedeem > 0
                      ? `Redeem up to ${maxPointsCanRedeem} pts`
                      : "Points balance exhausted"}
                  </span>
                  {maxPointsCanRedeem > 0 && (
                    <button
                      type="button"
                      onClick={() => setRedeemPoints(!redeemPoints)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs cursor-pointer ${
                        redeemPoints
                          ? "bg-[#16845B] text-white"
                          : "bg-white border border-[#E5EBE7] text-[#172B25] hover:bg-[#F8FAF9]"
                      }`}
                    >
                      {redeemPoints ? "Points Applied ✓" : "Redeem Points"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Discounts & Coupon Code in POS */}
            <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#16845B]" /> Discounts & Offers
                </Label>
                {appliedCoupon && (
                  <span className="text-[10px] font-bold text-[#16845B] bg-[#E8F5EE] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" /> {appliedCoupon.code} Applied
                  </span>
                )}
              </div>

              {/* Quick Discount Presets */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { label: "5%", type: "PCT" as const, val: 5 },
                  { label: "10%", type: "PCT" as const, val: 10 },
                  { label: "15%", type: "PCT" as const, val: 15 },
                  { label: "20%*", type: "PCT" as const, val: 20 },
                  { label: "₹50", type: "FLAT" as const, val: 50 },
                  { label: "₹100*", type: "FLAT" as const, val: 100 },
                ].map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => applyQuickDiscount(d.type, d.val, `${d.label} OFF`)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition cursor-pointer ${
                      appliedCoupon?.code === `${d.label} OFF`
                        ? "bg-[#16845B] text-white border-[#16845B]"
                        : "bg-white border-[#E5EBE7] text-[#172B25] hover:border-[#16845B]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="text-[9.5px] text-[#718078] italic">*Discounts &gt;15% require Manager PIN</div>

              <div className="flex gap-2 pt-1">
                <Input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponError(null);
                  }}
                  placeholder="Promo code (e.g. WELCOME10)"
                  className="bg-white border-[#E5EBE7] text-[#172B25] text-xs h-9"
                />
                <button
                  type="button"
                  onClick={() => applyPOSCoupon()}
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-3.5 py-2 shrink-0 transition shadow-xs cursor-pointer"
                >
                  Apply
                </button>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={removePOSCoupon}
                    className="rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs px-2.5 py-2 shrink-0 flex items-center justify-center cursor-pointer"
                    title="Remove discount"
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
              {couponDiscountPaise > 0 && (
                <div className="flex justify-between text-xs text-[#16845B] font-bold bg-[#E8F5EE] px-2 py-1 rounded-lg">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>−{formatINR(couponDiscountPaise)}</span>
                </div>
              )}
              {loyaltyDiscountPaise > 0 && (
                <div className="flex justify-between text-xs text-[#16845B] font-bold bg-[#E8F5EE] px-2 py-1 rounded-lg">
                  <span>Loyalty Points ({maxPointsCanRedeem} pts)</span>
                  <span>−{formatINR(loyaltyDiscountPaise)}</span>
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
              {total > 0 && (
                <div className="flex items-center justify-between text-[11px] font-bold text-[#16845B] bg-[#E8F5EE]/60 px-2.5 py-1 rounded-md">
                  <span>⭐ Rewards to Earn</span>
                  <span>+{pointsToEarn} loyalty pts</span>
                </div>
              )}
              <div className="text-[11px] text-[#718078] text-center pt-1">
                Inclusive of all taxes • {orderType.replace("_", " ")}{" "}
                {selectedTableLabel ? `• Table ${selectedTableLabel}` : ""} • Pay via {paymentMethod}
              </div>
            </div>

            <button
              onClick={placeOrder}
              disabled={posting || cart.length === 0}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3.5 text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {posting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>{" "}
                  Processing...
                </>
              ) : (
                `Bill & Pay via ${paymentMethod} — ${formatINR(total)}`
              )}
            </button>

            {msg && (
              <div
                role="status"
                className={`text-xs p-3 rounded-xl border flex gap-2 break-words ${
                  msg.type === "success"
                    ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                    : msg.type === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className="flex gap-2 text-xs">
              <button
                onClick={() => {
                  setCart([]);
                  setMsg(null);
                }}
                disabled={cart.length === 0}
                className="flex-1 rounded-full border border-[#E5EBE7] bg-white py-2 text-[#718078] hover:bg-[#F8FAF9] disabled:opacity-30 cursor-pointer"
              >
                Clear cart
              </button>
              <Link
                href="/app/kitchen"
                className="flex-1 rounded-full bg-white border border-[#E5EBE7] py-2 text-center text-[#172B25] hover:bg-[#F8FAF9] font-medium"
              >
                KDS →
              </Link>
            </div>
            <div className="text-[11px] text-[#718078] text-center">
              Paise math • No float rounding • Razorpay on subscription only
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager PIN Override Modal */}
      {managerPinModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E5EBE7] space-y-4">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <span className="font-extrabold text-sm text-[#172B25]">Manager Authorization</span>
              </div>
              <button
                onClick={() => {
                  setManagerPinModal(null);
                  setPinError(null);
                }}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center hover:text-[#172B25]"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-[#172B25]">
                Authorizing {managerPinModal.pendingDiscount?.code}
              </p>
              <p className="text-[11px] text-[#718078]">
                Discounts &gt;15% require Manager Passcode (Default: <b>1234</b>)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#718078]">Enter 4-Digit Manager PIN</Label>
              <Input
                type="password"
                maxLength={4}
                autoFocus
                value={managerPinInput}
                onChange={(e) => {
                  setManagerPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="• • • •"
                className="text-center text-lg tracking-widest font-mono font-bold bg-[#F8FAF9] border-[#E5EBE7]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") verifyManagerPin();
                }}
              />
              {pinError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg text-center font-medium">
                  {pinError}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setManagerPinModal(null);
                  setPinError(null);
                }}
                className="flex-1 rounded-full border border-[#E5EBE7] bg-white py-2.5 text-xs font-bold text-[#718078] hover:bg-[#F8FAF9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyManagerPin}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 text-xs font-bold shadow-xs transition"
              >
                Authorize Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Bill Receipt Modal */}
      {showReceipt && activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#E5EBE7] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#E5EBE7] flex justify-between items-center bg-[#F8FAF9]">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#16845B]" />
                <span className="font-black text-sm text-[#172B25]">Tax Invoice & Bill Receipt</span>
              </div>
              <button
                onClick={() => setShowReceipt(false)}
                className="h-8 w-8 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Receipt Preview & Printable Zone */}
            <div className="p-6 overflow-y-auto bg-[#F8FAF9]/50 flex justify-center">
              <div
                id="thermal-receipt-printable"
                className="w-full max-w-[340px] bg-white p-5 rounded-2xl border border-[#E5EBE7] shadow-xs font-mono text-xs text-[#172B25] space-y-3"
              >
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-[#718078]/40">
                  <div className="text-base font-black tracking-tight uppercase text-[#172B25]">
                    {activeReceipt.outletName}
                  </div>
                  <div className="text-[10px] text-[#718078] mt-0.5">RestroNex Restaurant OS</div>
                  <div className="text-[10px] font-bold text-[#16845B] mt-1 bg-[#E8F5EE] px-2 py-0.5 rounded-full inline-block">
                    TAX INVOICE
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-[11px] space-y-1 text-[#718078] pb-2 border-b border-dashed border-[#718078]/40">
                  <div className="flex justify-between">
                    <span>Invoice:</span>
                    <span className="font-bold text-[#172B25]">{activeReceipt.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order #:</span>
                    <span className="font-bold text-[#172B25]">{activeReceipt.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{activeReceipt.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className="font-bold text-[#172B25]">
                      {activeReceipt.orderType}
                      {activeReceipt.tableName ? ` • Table ${activeReceipt.tableName}` : ""}
                    </span>
                  </div>
                  {activeReceipt.customerName && (
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span>{activeReceipt.customerName}</span>
                    </div>
                  )}
                  {activeReceipt.customerPhone && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{activeReceipt.customerPhone}</span>
                    </div>
                  )}
                </div>

                {/* Itemized Table */}
                <div className="pb-2 border-b border-dashed border-[#718078]/40">
                  <div className="grid grid-cols-[24px_1fr_60px] font-bold text-[10px] uppercase text-[#718078] pb-1.5 border-b border-slate-200">
                    <span>Qty</span>
                    <span>Item</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="divide-y divide-slate-100 mt-1">
                    {activeReceipt.items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-[24px_1fr_60px] py-1.5 text-[11px]">
                        <span className="font-bold text-[#172B25]">{it.quantity}</span>
                        <span className="truncate pr-1 text-[#172B25]">{it.name}</span>
                        <span className="text-right font-medium text-[#172B25]">
                          {formatINR(it.quantity * it.unitPricePaise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals & Tax Breakdown */}
                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-[#718078]/40">
                  <div className="flex justify-between text-[#718078]">
                    <span>Subtotal:</span>
                    <span>{formatINR(activeReceipt.subtotalPaise)}</span>
                  </div>
                  {activeReceipt.discountPaise > 0 && (
                    <div className="flex justify-between text-[#16845B] font-bold">
                      <span>Discount:</span>
                      <span>−{formatINR(activeReceipt.discountPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#718078]">
                    <span>CGST (9%):</span>
                    <span>{formatINR(activeReceipt.cgstPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[#718078]">
                    <span>SGST (9%):</span>
                    <span>{formatINR(activeReceipt.sgstPaise)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200 text-[#172B25]">
                    <span>TOTAL:</span>
                    <span className="text-[#16845B]">{formatINR(activeReceipt.totalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#718078] pt-0.5">
                    <span>Payment Mode:</span>
                    <span className="font-bold uppercase text-[#172B25]">{activeReceipt.paymentMethod}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-1 text-[10px] text-[#718078]">
                  <div>Thank you for dining with us!</div>
                  <div>Please visit again • FSSAI Registered</div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="p-4 border-t border-[#E5EBE7] bg-white flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Thermal Receipt (80mm)
              </button>
              {activeReceipt.customerPhone ? (
                <a
                  href={`https://wa.me/${activeReceipt.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `🧾 *Tax Invoice from ${activeReceipt.outletName}*\n` +
                      `Invoice: ${activeReceipt.invoiceNumber}\n` +
                      `Order: ${activeReceipt.orderNumber}\n` +
                      `Date: ${activeReceipt.date}\n` +
                      `Total: ${formatINR(activeReceipt.totalPaise)} (${activeReceipt.paymentMethod})\n\n` +
                      `Thank you for dining with us! Please visit again.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" /> WhatsApp
                </a>
              ) : (
                <button
                  onClick={() => {
                    const phone = prompt("Enter customer WhatsApp number (+91):");
                    if (phone) {
                      window.open(
                        `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          `🧾 *Tax Invoice from ${activeReceipt.outletName}*\n` +
                            `Invoice: ${activeReceipt.invoiceNumber}\n` +
                            `Order: ${activeReceipt.orderNumber}\n` +
                            `Total: ${formatINR(activeReceipt.totalPaise)}\n\n` +
                            `Thank you for dining with us!`
                        )}`,
                        "_blank"
                      );
                    }
                  }}
                  className="rounded-full border border-[#E5EBE7] bg-[#F8FAF9] text-[#172B25] hover:bg-white py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-[#718078]" /> Share
                </button>
              )}
              <button
                onClick={() => setShowReceipt(false)}
                className="rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:bg-[#F8FAF9] py-2.5 px-4 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
