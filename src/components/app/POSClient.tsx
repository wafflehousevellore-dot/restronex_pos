"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { formatINR } from "@/lib/money";
import { apiFetch } from "@/lib/api";
import {
  dispatchClientPrintJob,
  discoverBluetoothPrinter,
  getOrRestoreBleDevice,
} from "@/lib/client-print";
import {
  Tag,
  Check,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Share2,
  Sparkles,
  ShieldAlert,
  Bluetooth,
  Clock,
  Keyboard,
  Layers,
  FileText,
  Trash2,
  Minus,
  Plus,
  AlertCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { POSCategoryNav } from "./pos/POSCategoryNav";
import { POSProductGrid } from "./pos/POSProductGrid";
import { POSCustomiseModal } from "./pos/POSCustomiseModal";
import { POSHoldOrdersModal, HeldOrder } from "./pos/POSHoldOrdersModal";
import { POSSplitPaymentModal, SplitPaymentResult } from "./pos/POSSplitPaymentModal";
import { POSRecentOrdersDrawer, RecentPOSOrder } from "./pos/POSRecentOrdersDrawer";
import { POSShortcutsHelpModal } from "./pos/POSShortcutsHelpModal";
import { cn } from "@/lib/utils";

function createCheckoutIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pos_${crypto.randomUUID()}`;
  }
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export type AddonOption = {
  id: string;
  name: string;
  pricePaise: number;
  isDefault?: boolean;
  isActive?: boolean;
};

export type AddonGroup = {
  id: string;
  name: string;
  description?: string | null;
  selectionType: "SINGLE" | "MULTIPLE" | string;
  minSelections: number;
  maxSelections?: number | null;
  isRequired: boolean;
  options: AddonOption[];
};

export type MenuItem = {
  id: string;
  name: string;
  pricePaise: number;
  categoryId: string;
  isVeg: boolean;
  imageUrl?: string | null;
  description?: string | null;
  isSoldOut?: boolean;
  category?: { name: string };
  addonLinks?: Array<{
    id: string;
    addonGroupId: string;
    addonGroup: AddonGroup;
  }>;
};

export type POSCartAddon = {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  pricePaise: number;
};

export type POSCartItem = {
  cartItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  selectedAddons: POSCartAddon[];
  effectiveUnitPricePaise: number;
  totalPaise: number;
  notes?: string;
  isVeg?: boolean;
};

export type Table = {
  id: string;
  number: string;
  status: string;
  area: string;
  currentOrderId?: string | null;
  orderTotalPaise?: number | null;
};

export type Outlet = { id: string; name: string };

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
  items: {
    name: string;
    quantity: number;
    unitPricePaise: number;
    modifiers?: { name: string; pricePaise: number }[];
  }[];
  subtotalPaise: number;
  discountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
  orderId?: string;
  invoicePdfUrl?: string | null;
  whatsappStatus?: string;
  printJobId?: string | null;
  printStatus?: string;
  paperWidth?: "58mm" | "80mm";
  printerName?: string | null;
};

function calculateCouponDiscount(code: string, subtotalPaise: number): number {
  const c = code.trim().toUpperCase();
  if (!c) return 0;
  if (c === "FLAT50" || c === "WELCOME50") return Math.min(5000, subtotalPaise);
  if (c === "FLAT100" || c === "SAVE100") return Math.min(10000, subtotalPaise);
  if (c === "FESTIVE10" || c === "DISCOUNT10") return Math.round(subtotalPaise * 0.1);
  if (c === "FESTIVE20" || c === "DISCOUNT20" || c === "VIP20") return Math.round(subtotalPaise * 0.2);
  if (c === "STAFF50") return Math.round(subtotalPaise * 0.5);
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
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Navigation & Category filters
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [dietFilter, setDietFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [inStockOnly, setInStockOnly] = useState<boolean>(true);

  // Modals & Panels state
  const [customiseItem, setCustomiseItem] = useState<{
    product: MenuItem;
    editingCartItemId: string | null;
    initialQuantity: number;
    initialSelections: Record<string, string[]>;
    initialNotes?: string;
  } | null>(null);

  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHoldOrdersModal, setShowHoldOrdersModal] = useState<boolean>(false);
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [showRecentOrdersDrawer, setShowRecentOrdersDrawer] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Customer & Loyalty State
  const [customerName, setCustomerName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [customerLoyalty, setCustomerLoyalty] = useState<{
    id: string;
    name: string;
    points: number;
    visitCount: number;
  } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "SPLIT">("UPI");
  const [splitResult, setSplitResult] = useState<SplitPaymentResult | null>(null);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [activeUpiId, setActiveUpiId] = useState("9513008467@upi");
  const [activeMerchantName, setActiveMerchantName] = useState("WAFFLE PLUM HOUSE");
  const [showUpiFullscreen, setShowUpiFullscreen] = useState(false);

  // Discount & Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPaise: number } | null>(null);
  const [managerPinModal, setManagerPinModal] = useState<{
    open: boolean;
    pendingDiscount?: { code: string; discountPaise: number };
  } | null>(null);
  const [managerPinInput, setManagerPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Order Completion State
  const [posting, setPosting] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState<string>("");
  const [lastOrder, setLastOrder] = useState<{ orderNumber: string; total: number } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentPOSOrder[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Bluetooth printing
  const [bleConnected, setBleConnected] = useState(false);
  const [connectingBle, setConnectingBle] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Categories list with counts
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    items.forEach((item) => {
      const catId = item.categoryId || "uncategorized";
      const catName = item.category?.name || "Uncategorized";
      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, count: 0 });
      }
      map.get(catId)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let list = items;

    if (selectedCategory !== "All") {
      list = list.filter((i) => i.categoryId === selectedCategory);
    }

    if (dietFilter === "VEG") {
      list = list.filter((i) => i.isVeg);
    } else if (dietFilter === "NON_VEG") {
      list = list.filter((i) => !i.isVeg);
    }

    if (inStockOnly) {
      list = list.filter((i) => !i.isSoldOut);
    }

    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase().trim();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.category?.name && i.category.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [items, selectedCategory, dietFilter, inStockOnly, productSearchQuery]);

  // Load held orders from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("restronex_pos_held_orders");
      if (saved) {
        setHeldOrders(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save held orders to localStorage
  const saveHeldOrders = (orders: HeldOrder[]) => {
    setHeldOrders(orders);
    try {
      localStorage.setItem("restronex_pos_held_orders", JSON.stringify(orders));
    } catch {}
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if (e.key === "Escape") {
        setCustomiseItem(null);
        setShowHoldOrdersModal(false);
        setShowSplitModal(false);
        setShowRecentOrdersDrawer(false);
        setShowShortcutsModal(false);
        setShowClearConfirm(false);
        return;
      }

      if (e.key === "F1" || (e.key === "/" && !isInput)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!isInput) {
        if (e.key === "F2") {
          e.preventDefault();
          setOrderType((prev) =>
            prev === "DINE_IN" ? "TAKEAWAY" : prev === "TAKEAWAY" ? "DELIVERY" : "DINE_IN"
          );
        } else if (e.key === "F4") {
          e.preventDefault();
          handleHoldCurrentOrder();
        } else if (e.key === "F9") {
          e.preventDefault();
          setPaymentMethod("CASH");
        } else if (e.key === "F10") {
          e.preventDefault();
          setPaymentMethod("UPI");
        } else if (e.key === "?") {
          e.preventDefault();
          setShowShortcutsModal(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Phone Lookup for Customer CRM & Loyalty Points
  useEffect(() => {
    const raw = customerPhone.replace(/\D/g, "");
    if (raw.length < 10) {
      setCustomerLoyalty(null);
      setRedeemPoints(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const fullPhone = `${countryCode}${raw.slice(-10)}`;
        const res = await apiFetch(`/api/customers?phone=${encodeURIComponent(fullPhone)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.customer) {
            setCustomerName(data.customer.name || "");
            setCustomerLoyalty({
              id: data.customer.id,
              name: data.customer.name,
              points: data.customer.loyaltyPoints || 0,
              visitCount: data.customer.visitCount || 1,
            });
          }
        }
      } catch {}
    }, 400);

    return () => clearTimeout(timer);
  }, [customerPhone, countryCode]);

  // Load Table Order if selected table has active order
  useEffect(() => {
    if (!selectedTable || orderType !== "DINE_IN") return;
    const tableObj = tables.find((t) => t.id === selectedTable);
    if (!tableObj || !tableObj.currentOrderId) return;

    (async () => {
      try {
        const res = await apiFetch(`/api/orders?orderId=${tableObj.currentOrderId}`);
        if (res.ok) {
          const data = await res.json();
          const order = Array.isArray(data) ? data[0] : data;
          if (order && order.items && order.items.length > 0) {
            const loadedCart: POSCartItem[] = order.items.map((i: any) => ({
              cartItemId: `loaded_${i.id}`,
              menuItemId: i.menuItemId,
              name: i.name,
              quantity: i.quantity,
              unitPricePaise: i.unitPricePaise,
              selectedAddons: (i.addons || []).map((a: any) => ({
                groupId: a.addonOption?.addonGroupId || "",
                groupName: "Addon",
                optionId: a.addonOptionId,
                name: a.addonOption?.name || "Modifier",
                pricePaise: a.unitPricePaise,
              })),
              effectiveUnitPricePaise: i.totalPaise / i.quantity,
              totalPaise: i.totalPaise,
              notes: i.notes || undefined,
            }));
            setCart(loadedCart);
            setMsg({
              type: "info",
              text: `Loaded existing order ${order.orderNumber} for Table ${tableObj.number}.`,
            });
          }
        }
      } catch {}
    })();
  }, [selectedTable, orderType, tables]);

  // Cart Management Handlers
  const handleSelectItem = (item: MenuItem) => {
    if (item.addonLinks && item.addonLinks.length > 0) {
      // Open Customisation Modal
      const initialSel: Record<string, string[]> = {};
      item.addonLinks.forEach((link) => {
        const defaultOpts = link.addonGroup?.options?.filter((o) => o.isDefault).map((o) => o.id) || [];
        if (defaultOpts.length > 0) {
          initialSel[link.addonGroupId] = defaultOpts;
        }
      });

      setCustomiseItem({
        product: item,
        editingCartItemId: null,
        initialQuantity: 1,
        initialSelections: initialSel,
      });
    } else {
      // Instant Quick Add
      handleQuickAdd(item);
    }
  };

  const handleQuickAdd = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id && c.selectedAddons.length === 0);
      if (existing) {
        return prev.map((c) =>
          c.cartItemId === existing.cartItemId
            ? {
                ...c,
                quantity: c.quantity + 1,
                totalPaise: c.effectiveUnitPricePaise * (c.quantity + 1),
              }
            : c
        );
      }

      const newCartItem: POSCartItem = {
        cartItemId: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPricePaise: item.pricePaise,
        selectedAddons: [],
        effectiveUnitPricePaise: item.pricePaise,
        totalPaise: item.pricePaise,
        isVeg: item.isVeg,
      };

      return [...prev, newCartItem];
    });
  };

  const handleConfirmCustomise = (payload: {
    quantity: number;
    selectedAddons: POSCartAddon[];
    notes?: string;
  }) => {
    if (!customiseItem) return;

    setCart((prev) => {
      if (customiseItem.editingCartItemId) {
        // Update existing item
        return prev.map((c) => {
          if (c.cartItemId === customiseItem.editingCartItemId) {
            const addonsUnitPrice = payload.selectedAddons.reduce((sum, a) => sum + a.pricePaise, 0);
            const effectiveUnitPrice = c.unitPricePaise + addonsUnitPrice;
            return {
              ...c,
              quantity: payload.quantity,
              selectedAddons: payload.selectedAddons,
              effectiveUnitPricePaise: effectiveUnitPrice,
              totalPaise: effectiveUnitPrice * payload.quantity,
              notes: payload.notes,
            };
          }
          return c;
        });
      }

      // Add new configured item
      const addonsUnitPrice = payload.selectedAddons.reduce((sum, a) => sum + a.pricePaise, 0);
      const effectiveUnitPrice = customiseItem.product.pricePaise + addonsUnitPrice;

      const newCartItem: POSCartItem = {
        cartItemId: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: customiseItem.product.id,
        name: customiseItem.product.name,
        quantity: payload.quantity,
        unitPricePaise: customiseItem.product.pricePaise,
        selectedAddons: payload.selectedAddons,
        effectiveUnitPricePaise: effectiveUnitPrice,
        totalPaise: effectiveUnitPrice * payload.quantity,
        notes: payload.notes,
        isVeg: customiseItem.product.isVeg,
      };

      return [...prev, newCartItem];
    });

    setCustomiseItem(null);
  };

  const handleEditCartLine = (cartItem: POSCartItem) => {
    const product = items.find((i) => i.id === cartItem.menuItemId);
    if (!product) return;

    const currentSelections: Record<string, string[]> = {};
    cartItem.selectedAddons.forEach((a) => {
      if (!currentSelections[a.groupId]) currentSelections[a.groupId] = [];
      currentSelections[a.groupId].push(a.optionId);
    });

    setCustomiseItem({
      product,
      editingCartItemId: cartItem.cartItemId,
      initialQuantity: cartItem.quantity,
      initialSelections: currentSelections,
      initialNotes: cartItem.notes,
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.cartItemId === cartItemId) {
            const nextQty = c.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...c,
              quantity: nextQty,
              totalPaise: c.effectiveUnitPricePaise * nextQty,
            };
          }
          return c;
        })
        .filter(Boolean) as POSCartItem[]
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((c) => c.cartItemId !== cartItemId));
  };

  const handleHoldCurrentOrder = () => {
    if (cart.length === 0) {
      setMsg({ type: "error", text: "Cart is empty. Add items before holding bill." });
      return;
    }

    const tableObj = tables.find((t) => t.id === selectedTable);
    const holdLabel =
      orderType === "DINE_IN" && tableObj
        ? `Table ${tableObj.number}`
        : customerName
        ? customerName
        : `Bill #${heldOrders.length + 1}`;

    const newHeld: HeldOrder = {
      id: `held_${Date.now()}`,
      label: holdLabel,
      cart: [...cart],
      orderType,
      tableId: selectedTable || undefined,
      tableName: tableObj?.number,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      heldAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      totalPaise: grandTotalPaise,
    };

    saveHeldOrders([...heldOrders, newHeld]);
    setCart([]);
    setSelectedTable("");
    setCustomerName("");
    setCustomerPhone("");
    setAppliedCoupon(null);
    setMsg({ type: "success", text: `Order parked: "${holdLabel}".` });
  };

  const handleResumeOrder = (held: HeldOrder) => {
    setCart(held.cart);
    setOrderType(held.orderType);
    if (held.tableId) setSelectedTable(held.tableId);
    if (held.customerName) setCustomerName(held.customerName);
    if (held.customerPhone) setCustomerPhone(held.customerPhone);
    saveHeldOrders(heldOrders.filter((h) => h.id !== held.id));
    setMsg({ type: "info", text: `Resumed order "${held.label}".` });
  };

  const handleDeleteHeldOrder = (heldId: string) => {
    saveHeldOrders(heldOrders.filter((h) => h.id !== heldId));
  };

  // Bill & Tax Calculations
  const subtotalPaise = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPaise, 0);
  }, [cart]);

  const couponDiscountPaise = appliedCoupon
    ? Math.min(appliedCoupon.discountPaise, subtotalPaise)
    : 0;

  const maxPointsCanRedeem = customerLoyalty ? Math.min(customerLoyalty.points, Math.floor(subtotalPaise / 100)) : 0;
  const loyaltyDiscountPaise = redeemPoints ? maxPointsCanRedeem * 100 : 0;
  const totalDiscountPaise = couponDiscountPaise + loyaltyDiscountPaise;

  const taxablePaise = Math.max(0, subtotalPaise - totalDiscountPaise);
  // GST 5% standard restaurant tax (2.5% CGST + 2.5% SGST)
  const cgstPaise = Math.round(taxablePaise * 0.025);
  const sgstPaise = Math.round(taxablePaise * 0.025);
  const taxPaise = cgstPaise + sgstPaise;

  const grandTotalPaise = taxablePaise + taxPaise;

  // Bluetooth Printer Connection
  const handleConnectBluetoothPrinter = async () => {
    setConnectingBle(true);
    try {
      const dev = await discoverBluetoothPrinter();
      if (dev) {
        setBleConnected(true);
        setMsg({ type: "success", text: `Bluetooth printer connected: ${dev.name || "Thermal Printer"}` });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to connect Bluetooth printer." });
    } finally {
      setConnectingBle(false);
    }
  };

  // Checkout Execution
  const handleCheckout = async (targetPaymentMethod?: "CASH" | "UPI" | "CARD" | "SPLIT") => {
    const finalMethod = targetPaymentMethod || paymentMethod;

    if (cart.length === 0) {
      setMsg({ type: "error", text: "Cart is empty. Add products to bill." });
      return;
    }

    if (orderType === "DINE_IN" && !selectedTable) {
      setMsg({ type: "error", text: "Please select a dining table for Dine-in orders." });
      return;
    }

    setPosting(true);
    setMsg({ type: "info", text: "Processing bill & firing KOT..." });

    const idempotencyKey = checkoutKey || createCheckoutIdempotencyKey();
    setCheckoutKey(idempotencyKey);

    const rawTrimmedPhone = customerPhone.trim();
    const normalizedSubmitPhone = rawTrimmedPhone
      ? rawTrimmedPhone.startsWith("+")
        ? rawTrimmedPhone
        : `${countryCode}${rawTrimmedPhone.replace(/^0+/, "")}`
      : undefined;

    try {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutlet,
          idempotencyKey,
          type: orderType,
          tableId: selectedTable || undefined,
          customerName: customerName.trim() || undefined,
          customerPhone: normalizedSubmitPhone,
          whatsappConsent: !!(normalizedSubmitPhone && whatsappConsent),
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            name: c.name,
            quantity: c.quantity,
            unitPricePaise: c.unitPricePaise,
            selectedAddons: c.selectedAddons.map((a) => ({
              optionId: a.optionId,
              groupId: a.groupId,
              name: a.name,
              pricePaise: a.pricePaise,
            })),
            notes: c.notes,
          })),
          discountPaise: totalDiscountPaise,
          paymentMethod: finalMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg({ type: "error", text: data.error || `Checkout failed (${res.status})` });
        setPosting(false);
        return;
      }

      const orderNumber = data.orderNumber || "ORD-OK";
      const invoiceNumber = data.invoiceNumber || `INV-${orderNumber.replace("ORD-", "")}`;
      const outletObj = outlets.find((o) => o.id === selectedOutlet);
      const tableObj = tables.find((t) => t.id === selectedTable);

      const receipt: ReceiptData = {
        orderNumber,
        invoiceNumber,
        outletName: outletObj?.name || "RestroNex Restaurant",
        date: new Date().toLocaleString("en-IN"),
        orderType,
        tableName: tableObj?.number,
        customerName: customerName.trim() || undefined,
        customerPhone: normalizedSubmitPhone,
        paymentMethod: finalMethod,
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          unitPricePaise: c.unitPricePaise,
          modifiers: c.selectedAddons.map((a) => ({ name: a.name, pricePaise: a.pricePaise })),
        })),
        subtotalPaise,
        discountPaise: totalDiscountPaise,
        cgstPaise,
        sgstPaise,
        totalPaise: grandTotalPaise,
        orderId: data.orderId,
        invoicePdfUrl: data.invoicePdfUrl,
        paperWidth: (data.printJob?.paperWidth as "58mm" | "80mm") || "58mm",
        printJobId: data.printJob?.jobId,
        printStatus: data.printJob?.status,
        printerName: data.printJob?.printerName,
      };

      setActiveReceipt(receipt);
      setLastOrder({ orderNumber, total: grandTotalPaise });
      setShowReceipt(true);

      // Auto-dispatch thermal print job
      if (data.printJob && data.printJob.requiresClientDispatch) {
        dispatchClientPrintJob({
          jobId: data.printJob.jobId,
          printerType: data.printJob.printerType,
          connectionString: data.printJob.connectionString,
          bridgeUrl: data.printJob.bridgeUrl,
          paperWidth: data.printJob.paperWidth || "58mm",
          escPosBase64: data.printJob.escPosBase64,
          textLines: data.printJob.textLines,
          qrData: data.printJob.qrData || data.invoicePdfUrl,
        }).catch((err) => {
          console.warn("[POS Auto-Print] Silent hardware dispatch notice:", err);
        });
      }

      // Add to recent orders feed
      const newRecent: RecentPOSOrder = {
        id: data.orderId || `order_${Date.now()}`,
        orderNumber,
        invoiceNumber,
        createdAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        orderType,
        tableName: tableObj?.number,
        customerName: customerName.trim() || undefined,
        customerPhone: normalizedSubmitPhone,
        totalPaise: grandTotalPaise,
        isPaid: true,
        status: "COMPLETED",
        items: cart.map((c) => ({ name: c.name, quantity: c.quantity })),
      };
      setRecentOrders((prev) => [newRecent, ...prev.slice(0, 19)]);

      // Reset cart
      setCart([]);
      setSelectedTable("");
      setCustomerName("");
      setCustomerPhone("");
      setAppliedCoupon(null);
      setRedeemPoints(false);
      setSplitResult(null);
      setCheckoutKey("");
      setMsg({ type: "success", text: `Bill ${orderNumber} completed & KOT dispatched.` });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Network error while completing order." });
    } finally {
      setPosting(false);
    }
  };

  // Manual Print & Reprint Handlers
  const handleManualPrintBill = async () => {
    if (!activeReceipt) return;
    setIsPrinting(true);

    try {
      if (activeReceipt.orderId) {
        const res = await fetch("/api/print-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: activeReceipt.orderId,
            jobType: "BILL",
            paperWidth: activeReceipt.paperWidth || "58mm",
          }),
        });
        const data = await res.json();
        if (data.requiresClientDispatch) {
          await dispatchClientPrintJob({
            jobId: data.jobId,
            printerType: data.printerType,
            connectionString: data.connectionString,
            bridgeUrl: data.bridgeUrl,
            paperWidth: data.paperWidth || activeReceipt.paperWidth || "58mm",
            escPosBase64: data.escPosBase64,
            textLines: data.textLines,
            qrData: data.qrData || activeReceipt.invoicePdfUrl,
          });
          setMsg({ type: "success", text: `Bill dispatched to ${data.printerName || "Thermal Printer"}` });
        }
      }
    } catch (e) {
      console.warn("[POS Manual Print] Hardware dispatch warning:", e);
    } finally {
      setIsPrinting(false);
    }

    // Always invoke window.print() so browser/OS thermal printer prints the #thermal-receipt-printable
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handleReprintBill = async (o: RecentPOSOrder) => {
    try {
      const res = await fetch("/api/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: o.id,
          jobType: "BILL",
        }),
      });
      const data = await res.json();
      if (data.requiresClientDispatch) {
        await dispatchClientPrintJob({
          jobId: data.jobId,
          printerType: data.printerType,
          connectionString: data.connectionString,
          bridgeUrl: data.bridgeUrl,
          paperWidth: data.paperWidth || "58mm",
          escPosBase64: data.escPosBase64,
          textLines: data.textLines,
          qrData: data.qrData,
        });
        setMsg({ type: "success", text: `Bill reprint sent to ${data.printerName || "Thermal Printer"}` });
        return;
      }
    } catch (err) {
      console.warn("[POS Reprint] Direct dispatch fallback:", err);
    }

    // Fallback: Populate activeReceipt and open print
    setActiveReceipt({
      orderNumber: o.orderNumber,
      invoiceNumber: o.invoiceNumber || `INV-${o.orderNumber.replace("ORD-", "")}`,
      outletName: outlets.find((x) => x.id === selectedOutlet)?.name || "RestroNex Restaurant",
      date: new Date().toLocaleString("en-IN"),
      orderType: o.orderType,
      tableName: o.tableName,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      paymentMethod: "CASH",
      items: o.items && o.items.length > 0
        ? o.items.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            unitPricePaise: Math.round(o.totalPaise / Math.max(1, o.items.length)),
          }))
        : [{ name: "Order Items", quantity: 1, unitPricePaise: o.totalPaise }],
      subtotalPaise: o.totalPaise,
      discountPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      totalPaise: o.totalPaise,
      orderId: o.id,
      paperWidth: "58mm",
    });
    setShowReceipt(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleReprintKOT = async (o: RecentPOSOrder) => {
    try {
      const res = await fetch("/api/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: o.id,
          jobType: "KOT",
        }),
      });
      const data = await res.json();
      if (data.requiresClientDispatch) {
        await dispatchClientPrintJob({
          jobId: data.jobId,
          printerType: data.printerType,
          connectionString: data.connectionString,
          bridgeUrl: data.bridgeUrl,
          paperWidth: data.paperWidth || "58mm",
          escPosBase64: data.escPosBase64,
          textLines: data.textLines,
        });
        setMsg({ type: "success", text: `KOT printed for #${o.orderNumber}` });
        return;
      }
    } catch (err) {
      console.warn("[POS KOT Reprint] Error:", err);
    }
    setMsg({ type: "info", text: `KOT re-queued for ${o.orderNumber}.` });
  };

  return (
    <div className="space-y-4 text-[#172B25]">
      {/* Top POS Action & Status Bar */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Outlet & Table Context */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-sm text-[#172B25]">
            <span>Terminal</span>
            <span className="text-xs text-[#718078]">•</span>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-2.5 py-1 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  📍 {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Bluetooth Printer */}
          <button
            type="button"
            onClick={handleConnectBluetoothPrinter}
            disabled={connectingBle}
            className={cn(
              "rounded-xl px-3 py-1 text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer",
              bleConnected
                ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                : "bg-white border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
            )}
          >
            <Bluetooth className={cn("h-3.5 w-3.5", connectingBle && "animate-spin")} />
            <span>{bleConnected ? "BT Thermal Ready" : "Connect BT"}</span>
          </button>
        </div>

        {/* Right: Parked Orders, Recent Orders, Shortcuts */}
        <div className="flex items-center gap-2">
          {/* Held Orders Queue Button */}
          <button
            type="button"
            onClick={() => setShowHoldOrdersModal(true)}
            className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-white text-[#172B25] px-3 py-1.5 text-xs font-bold shadow-2xs transition flex items-center gap-1.5 relative"
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Held Orders</span>
            {heldOrders.length > 0 && (
              <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2">
                {heldOrders.length}
              </span>
            )}
          </button>

          {/* Recent Orders Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowRecentOrdersDrawer(true)}
            className="rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] text-[#172B25] px-3 py-1.5 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-[#16845B]" />
            <span>Recent Orders</span>
          </button>

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 rounded-xl border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alert / Notice Message */}
      {msg && (
        <div
          className={cn(
            "p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in",
            msg.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
            msg.type === "error" && "bg-red-50 border-red-200 text-red-800",
            msg.type === "info" && "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
          )}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" && <Check className="h-4 w-4 text-emerald-600" />}
            {msg.type === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
            {msg.type === "info" && <Sparkles className="h-4 w-4 text-[#16845B]" />}
            <span>{msg.text}</span>
          </div>
          <button type="button" onClick={() => setMsg(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Three-Panel Desktop POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_400px] xl:grid-cols-[230px_1fr_420px] gap-4 h-[calc(100vh-190px)] min-h-[640px]">
        {/* PANEL 1: Category Navigation & Diet Filters */}
        <div className="h-full hidden md:block">
          <POSCategoryNav
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            dietFilter={dietFilter}
            onDietFilterChange={setDietFilter}
            inStockOnly={inStockOnly}
            onInStockOnlyChange={setInStockOnly}
            totalProductsCount={items.length}
          />
        </div>

        {/* PANEL 2: Product Cards Grid */}
        <div className="h-full">
          <POSProductGrid
            items={filteredProducts}
            onSelectItem={handleSelectItem}
            searchQuery={productSearchQuery}
            onSearchChange={setProductSearchQuery}
            searchInputRef={searchInputRef}
          />
        </div>

        {/* PANEL 3: Current Order (Cart & Checkout) */}
        <div className="h-full flex flex-col bg-white border border-[#E5EBE7] rounded-3xl p-4 shadow-2xs overflow-hidden">
          {/* Order Header: Type & Table */}
          <div className="pb-3 border-b border-[#E5EBE7] space-y-2.5 shrink-0">
            {/* Order Type Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#F8FAF9] p-1 rounded-2xl border border-[#E5EBE7]">
              {(["DINE_IN", "TAKEAWAY", "DELIVERY"] as const).map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setOrderType(ot)}
                  className={cn(
                    "py-1.5 text-xs font-bold rounded-xl transition text-center select-none",
                    orderType === ot
                      ? "bg-[#16845B] text-white shadow-2xs"
                      : "text-[#718078] hover:text-[#172B25]"
                  )}
                >
                  {ot.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Context Inputs: Table (for Dine-In) & Customer Phone */}
            <div className="grid grid-cols-2 gap-2">
              {orderType === "DINE_IN" ? (
                <div>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full h-8 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-2.5 text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  >
                    <option value="">Select Table...</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.number} ({t.area}) {t.status === "OCCUPIED" ? "🔴 Occupied" : "🟢 Free"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs font-bold text-[#718078] flex items-center px-1">
                  {orderType === "TAKEAWAY" ? "Counter Pickup" : "Direct Delivery"}
                </div>
              )}

              {/* Customer Mobile */}
              <div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Customer Phone..."
                  className="w-full h-8 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-2.5 text-xs text-[#172B25] placeholder-[#A0ACA5] focus:outline-none focus:border-[#16845B]"
                />
              </div>
            </div>

            {/* Customer Loyalty Points Card */}
            {customerLoyalty && (
              <div className="p-2 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#16845B]">{customerLoyalty.name || "Member"}</span>
                  <span className="text-[11px] text-[#718078]"> • {customerLoyalty.points} pts</span>
                </div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-[#16845B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.checked)}
                    className="rounded border-[#16845B] text-[#16845B] h-3.5 w-3.5"
                  />
                  <span>Redeem (₹{maxPointsCanRedeem})</span>
                </label>
              </div>
            )}
          </div>

          {/* Cart Items Scrollable List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#718078]">
                <div className="h-12 w-12 rounded-2xl bg-[#F8FAF9] flex items-center justify-center text-[#A0ACA5] mb-2">
                  <Tag className="h-6 w-6" />
                </div>
                <div className="text-sm font-bold text-[#172B25]">Current cart is empty</div>
                <div className="text-xs mt-0.5">Click any menu item to start billing.</div>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9]/60 p-2.5 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-[#172B25] flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            item.isVeg ? "bg-emerald-600" : "bg-red-600"
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {/* Selected Modifiers Pills */}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.selectedAddons.map((addon, aIdx) => (
                            <span
                              key={aIdx}
                              className="text-[10px] font-semibold bg-white border border-[#E5EBE7] px-1.5 py-0.2 rounded-md text-[#718078]"
                            >
                              +{addon.name} ({formatINR(addon.pricePaise)})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Line Notes */}
                      {item.notes && (
                        <div className="text-[10px] text-amber-700 font-medium italic pt-0.5">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>

                    {/* Line Total */}
                    <span className="font-bold text-xs text-[#172B25] shrink-0">
                      {formatINR(item.totalPaise)}
                    </span>
                  </div>

                  {/* Quantity & Action Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-[#718078]">
                      <button
                        type="button"
                        onClick={() => handleEditCartLine(item)}
                        className="font-bold text-[#16845B] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-white border border-[#E5EBE7] rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, -1)}
                          className="h-6 w-6 rounded flex items-center justify-center text-[#718078] hover:text-[#172B25]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, 1)}
                          className="h-6 w-6 rounded flex items-center justify-center text-[#718078] hover:text-[#172B25]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCartItem(item.cartItemId)}
                        className="p-1 rounded-lg text-[#718078] hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bill Breakdown & Net Payable */}
          <div className="pt-3 border-t border-[#E5EBE7] space-y-2 shrink-0 bg-white">
            <div className="space-y-1 text-xs text-[#718078]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-[#172B25]">{formatINR(subtotalPaise)}</span>
              </div>

              {totalDiscountPaise > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span>-{formatINR(totalDiscountPaise)}</span>
                </div>
              )}

              <div className="flex justify-between text-[11px]">
                <span>Taxes (CGST 2.5% + SGST 2.5%)</span>
                <span>{formatINR(taxPaise)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-[#E5EBE7] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#718078] uppercase tracking-wider block">
                  Net Payable
                </span>
                <span className="text-xl font-black text-[#16845B]">
                  {formatINR(grandTotalPaise)}
                </span>
              </div>

              {/* Cart Quick Utility: Hold / Clear */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleHoldCurrentOrder}
                  className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-white text-[#718078] hover:text-[#172B25] px-2.5 py-1 text-xs font-bold transition shadow-2xs"
                  title="Hold Order (F4)"
                >
                  Hold
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={cart.length === 0}
                  className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-red-50 text-[#718078] hover:text-red-600 px-2 py-1 text-xs font-bold transition disabled:opacity-40"
                  title="Clear Cart"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Payment & Checkout Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={posting || cart.length === 0}
                onClick={() => handleCheckout("CASH")}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Banknote className="h-4 w-4" />
                <span>Cash (F9)</span>
              </button>

              <button
                type="button"
                disabled={posting || cart.length === 0}
                onClick={() => handleCheckout("UPI")}
                className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white font-bold py-2.5 text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>UPI QR (F10)</span>
              </button>
            </div>

            {/* Split & Card Trigger */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={posting || cart.length === 0}
                onClick={() => setShowSplitModal(true)}
                className="flex-1 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-white text-[#172B25] font-bold py-1.5 text-xs transition"
              >
                Split Bill
              </button>
              <button
                type="button"
                disabled={posting || cart.length === 0}
                onClick={() => handleCheckout("CARD")}
                className="flex-1 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-white text-[#172B25] font-bold py-1.5 text-xs transition flex items-center justify-center gap-1"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Customisation Modal */}
      <POSCustomiseModal
        open={Boolean(customiseItem)}
        onClose={() => setCustomiseItem(null)}
        product={customiseItem?.product || null}
        editingCartItemId={customiseItem?.editingCartItemId}
        initialQuantity={customiseItem?.initialQuantity}
        initialSelections={customiseItem?.initialSelections}
        initialNotes={customiseItem?.initialNotes}
        onConfirm={handleConfirmCustomise}
      />

      {/* Hold Orders Modal */}
      <POSHoldOrdersModal
        open={showHoldOrdersModal}
        onClose={() => setShowHoldOrdersModal(false)}
        heldOrders={heldOrders}
        onResumeOrder={handleResumeOrder}
        onDeleteOrder={handleDeleteHeldOrder}
      />

      {/* Split Payment Modal */}
      <POSSplitPaymentModal
        open={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        totalPaise={grandTotalPaise}
        onConfirmSplit={(res) => {
          setSplitResult(res);
          handleCheckout("SPLIT");
        }}
      />

      {/* Recent Orders Drawer */}
      <POSRecentOrdersDrawer
        open={showRecentOrdersDrawer}
        onClose={() => setShowRecentOrdersDrawer(false)}
        orders={recentOrders}
        onReprintBill={handleReprintBill}
        onReprintKOT={handleReprintKOT}
      />

      {/* Shortcuts Help Modal */}
      <POSShortcutsHelpModal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmationDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Current Bill?"
        description="Are you sure you want to remove all items from this cart? This action cannot be undone."
        confirmLabel="Clear Cart"
        variant="destructive"
        onConfirm={() => {
          setCart([]);
          setAppliedCoupon(null);
          setShowClearConfirm(false);
        }}
      />

      {/* Printable Receipt Modal */}
      {showReceipt && activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-[#E5EBE7] shadow-2xl">
            <div className="text-center pb-2 border-b border-[#E5EBE7]">
              <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] flex items-center justify-center mx-auto mb-2">
                <Check className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-[#172B25]">{activeReceipt.orderNumber}</h3>
              <p className="text-xs text-[#718078]">{activeReceipt.outletName}</p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#718078]">
                <span>Total Amount:</span>
                <span className="font-black text-[#16845B] text-sm">
                  {formatINR(activeReceipt.totalPaise)}
                </span>
              </div>
              <div className="flex justify-between text-[#718078]">
                <span>Payment Method:</span>
                <span className="font-bold text-[#172B25]">{activeReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleManualPrintBill}
                disabled={isPrinting}
                className="w-full rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{isPrinting ? "Sending to Printer..." : "Print Bill (Thermal / Browser)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-white text-[#172B25] py-2 text-xs font-bold transition"
              >
                Start New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Thermal Receipt for Native Browser/OS & ESC/POS Printing */}
      {activeReceipt && (
        <div
          id="thermal-receipt-printable"
          data-paper={activeReceipt.paperWidth || "58mm"}
          className="hidden print:block text-black bg-white"
        >
          {/* Outlet Header */}
          <div className="text-center pb-2 border-b border-dashed border-black">
            <div className="font-bold text-sm tracking-wide uppercase">
              {activeReceipt.outletName || "WAFFLE PLUM HOUSE"}
            </div>
            <div className="text-[10px] mt-0.5">TAX INVOICE / CASH BILL</div>
            <div className="text-[10px] mt-0.5">GSTIN: 33AAACW1234F1Z5 • FSSAI: 12423008000123</div>
          </div>

          {/* Metadata */}
          <div className="py-1.5 border-b border-dashed border-black text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>Order: <strong>{activeReceipt.orderNumber}</strong></span>
              <span>Inv: {activeReceipt.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Date: {activeReceipt.date}</span>
              <span>Type: {activeReceipt.orderType}</span>
            </div>
            {activeReceipt.tableName && (
              <div className="font-bold">Table: {activeReceipt.tableName}</div>
            )}
            {activeReceipt.customerName && (
              <div className="text-[10px]">
                Customer: {activeReceipt.customerName} {activeReceipt.customerPhone ? `(${activeReceipt.customerPhone})` : ""}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-2 border-b border-dashed border-black text-[11px]">
            <div className="flex justify-between font-bold border-b border-dashed border-black pb-1 mb-1 text-[10px]">
              <span className="w-1/2">ITEM</span>
              <span className="w-1/6 text-center">QTY</span>
              <span className="w-1/3 text-right">AMOUNT</span>
            </div>
            {activeReceipt.items.map((it, idx) => (
              <div key={idx} className="mb-1">
                <div className="flex justify-between items-start">
                  <span className="w-1/2 font-medium break-words leading-tight">{it.name}</span>
                  <span className="w-1/6 text-center">{it.quantity}</span>
                  <span className="w-1/3 text-right font-medium">
                    {formatINR(it.quantity * it.unitPricePaise)}
                  </span>
                </div>
                {it.modifiers && it.modifiers.length > 0 && (
                  <div className="text-[9px] text-gray-700 pl-2">
                    {it.modifiers.map((m, mIdx) => (
                      <div key={mIdx} className="flex justify-between">
                        <span>+ {m.name}</span>
                        {m.pricePaise > 0 && <span>{formatINR(m.pricePaise)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-1.5 border-b border-dashed border-black text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatINR(activeReceipt.subtotalPaise)}</span>
            </div>
            {activeReceipt.discountPaise > 0 && (
              <div className="flex justify-between text-black">
                <span>Discount</span>
                <span>-{formatINR(activeReceipt.discountPaise)}</span>
              </div>
            )}
            {activeReceipt.cgstPaise > 0 && (
              <div className="flex justify-between text-[10px]">
                <span>CGST (2.5%)</span>
                <span>{formatINR(activeReceipt.cgstPaise)}</span>
              </div>
            )}
            {activeReceipt.sgstPaise > 0 && (
              <div className="flex justify-between text-[10px]">
                <span>SGST (2.5%)</span>
                <span>{formatINR(activeReceipt.sgstPaise)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-black">
              <span>NET PAYABLE</span>
              <span>{formatINR(activeReceipt.totalPaise)}</span>
            </div>
          </div>

          {/* Payment & Footer */}
          <div className="pt-2 text-center text-[10px] space-y-1">
            <div className="font-semibold">
              Paid via: {activeReceipt.paymentMethod}
            </div>
            {activeReceipt.invoicePdfUrl && (
              <div className="my-1 flex justify-center">
                <QRCodeSVG value={activeReceipt.invoicePdfUrl} size={72} />
              </div>
            )}
            <div className="font-medium text-[9px] mt-1">Thank you for dining with us!</div>
            <div className="text-[8px] text-gray-600">RestroNex Restaurant OS • Powered by Waffle Plum House</div>
          </div>
        </div>
      )}
    </div>
  );
}
