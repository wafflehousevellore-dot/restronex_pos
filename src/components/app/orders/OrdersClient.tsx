"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { orderAudio } from "@/lib/audio-engine";
import { dispatchClientPrintJob } from "@/lib/client-print";
import { OrderMetricsCards, OrderMetrics } from "./OrderMetricsCards";
import { OrderTabsNav } from "./OrderTabsNav";
import { OrderFilterBar, OrderFilterState } from "./OrderFilterBar";
import { OrderTable, OrderRecord } from "./OrderTable";
import { OrderDetailsDrawer } from "./OrderDetailsDrawer";
import { OrderCancelModal } from "./OrderCancelModal";
import { ShoppingBag, AlertCircle, CheckCircle } from "lucide-react";

interface OrdersClientProps {
  initialOrders?: OrderRecord[];
  initialOutlets?: Array<{ id: string; name: string }>;
}

export function OrdersClient({
  initialOrders = [],
  initialOutlets = [],
}: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>(initialOutlets);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab & Filters State
  const [activeTab, setActiveTab] = useState("ALL");
  const [filters, setFilters] = useState<OrderFilterState>({
    search: "",
    outletId: "ALL",
    source: "ALL",
    dateRange: "TODAY",
    paymentStatus: "ALL",
  });

  // Modal / Drawer State
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderRecord | null>(null);

  // Audio & Notification State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [heldOrdersCount, setHeldOrdersCount] = useState(0);

  // Initialize sound settings and held orders count
  useEffect(() => {
    setSoundEnabled(orderAudio.isSoundEnabled());
    try {
      const held = localStorage.getItem("restronex_pos_held_orders");
      if (held) {
        const parsed = JSON.parse(held);
        if (Array.isArray(parsed)) {
          setHeldOrdersCount(parsed.length);
        }
      }
    } catch {}
  }, []);

  // Fetch Outlets if not provided
  useEffect(() => {
    if (outlets.length === 0) {
      apiFetch("/api/outlets")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setOutlets(data.map((o: any) => ({ id: o.id, name: o.name })));
          }
        })
        .catch(() => {});
    }
  }, [outlets.length]);

  // Load Orders with current filters
  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (filters.outletId !== "ALL") params.set("outletId", filters.outletId);
      if (filters.source !== "ALL") params.set("channel", filters.source);
      if (filters.search) params.set("search", filters.search);
      if (filters.paymentStatus === "PAID") params.set("isPaid", "true");
      if (filters.paymentStatus === "UNPAID") params.set("isPaid", "false");

      // Compute date boundaries
      const now = new Date();
      if (filters.dateRange === "TODAY") {
        const todayStr = now.toISOString().slice(0, 10);
        params.set("startDate", todayStr);
      } else if (filters.dateRange === "YESTERDAY") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().slice(0, 10);
        params.set("startDate", yStr);
        params.set("endDate", yStr);
      } else if (filters.dateRange === "LAST_7_DAYS") {
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 7);
        params.set("startDate", d7.toISOString().slice(0, 10));
      } else if (filters.dateRange === "THIS_MONTH") {
        const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
        params.set("startDate", mStart.toISOString().slice(0, 10));
      }

      params.set("limit", "150");

      const res = await apiFetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
          // If details drawer is open, keep selected order synchronized
          if (selectedOrder) {
            const updatedSelected = data.find((o) => o.id === selectedOrder.id);
            if (updatedSelected) {
              setSelectedOrder(updatedSelected);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[OrdersClient] Error fetching orders:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, selectedOrder]);

  // Initial load & filter change reload
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Real-time Order Stream via SSE (/api/kds/stream)
  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: any = null;

    const connectSSE = () => {
      try {
        const sseUrl = `/api/kds/stream${filters.outletId !== "ALL" ? `?outletId=${filters.outletId}` : ""}`;
        evtSource = new EventSource(sseUrl);

        evtSource.addEventListener("kds_event", (e) => {
          try {
            const eventData = JSON.parse(e.data);
            if (eventData.type === "NEW_ORDER") {
              orderAudio.playNewOrderChime(eventData.orderId);
              loadOrders(true);
            } else if (
              eventData.type === "TICKET_STATUS_UPDATED" ||
              eventData.type === "ORDER_CANCELLED"
            ) {
              loadOrders(true);
            }
          } catch (parseErr) {
            console.warn("[Orders SSE] Error parsing event:", parseErr);
          }
        });

        evtSource.onerror = () => {
          evtSource?.close();
          // Auto-reconnect after 8 seconds
          retryTimeout = setTimeout(connectSSE, 8000);
        };
      } catch (err) {
        console.warn("[Orders SSE] Connection error:", err);
      }
    };

    connectSSE();

    // Fallback polling every 30 seconds
    const pollInterval = setInterval(() => {
      loadOrders(true);
    }, 30000);

    return () => {
      evtSource?.close();
      clearTimeout(retryTimeout);
      clearInterval(pollInterval);
    };
  }, [filters.outletId, loadOrders]);

  // Toggle Sound Notifications
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    orderAudio.setSoundEnabled(next);
    if (next) {
      orderAudio.unlock();
      orderAudio.playActionTone();
    }
  };

  // Filter Updates
  const handleFilterChange = (updates: Partial<OrderFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      outletId: "ALL",
      source: "ALL",
      dateRange: "TODAY",
      paymentStatus: "ALL",
    });
  };

  // Calculate Metrics
  const metrics: OrderMetrics = useMemo(() => {
    let total = 0;
    let newCount = 0;
    let accepted = 0;
    let preparing = 0;
    let ready = 0;
    let completed = 0;
    let cancelled = 0;
    let totalValuePaise = 0;

    for (const o of orders) {
      total++;
      const st = o.status;
      if (st === "OPEN" || st === "PLACED" || st === "PENDING") {
        newCount++;
      } else if (st === "ACCEPTED") {
        accepted++;
      } else if (st === "PREPARING") {
        preparing++;
      } else if (st === "READY" || st === "SERVED") {
        ready++;
      } else if (st === "BILLED" || st === "PAID" || st === "CLOSED" || st === "COMPLETED") {
        completed++;
      } else if (st === "CANCELLED" || st === "REJECTED") {
        cancelled++;
      }

      if (st !== "CANCELLED" && st !== "REJECTED") {
        totalValuePaise += o.totalPaise || 0;
      }
    }

    return {
      total,
      new: newCount,
      accepted,
      preparing,
      ready,
      completed,
      cancelled,
      totalValuePaise,
    };
  }, [orders]);

  // Tab Filtering
  const filteredOrders = useMemo(() => {
    if (activeTab === "ALL") return orders;
    if (activeTab === "NEW") {
      return orders.filter((o) => o.status === "OPEN" || o.status === "PLACED" || o.status === "PENDING");
    }
    if (activeTab === "ACCEPTED") {
      return orders.filter((o) => o.status === "ACCEPTED");
    }
    if (activeTab === "PREPARING") {
      return orders.filter((o) => o.status === "PREPARING");
    }
    if (activeTab === "READY") {
      return orders.filter((o) => o.status === "READY" || o.status === "SERVED");
    }
    if (activeTab === "COMPLETED") {
      return orders.filter((o) => o.status === "BILLED" || o.status === "PAID" || o.status === "CLOSED" || o.status === "COMPLETED");
    }
    if (activeTab === "CANCELLED") {
      return orders.filter((o) => o.status === "CANCELLED" || o.status === "REJECTED");
    }
    if (activeTab === "HELD") {
      // Return orders matching HELD or tagged
      return orders.filter((o) => o.status === "HELD");
    }
    return orders;
  }, [orders, activeTab]);

  // Quick Status Transition Handler
  const handleUpdateStatus = async (orderId: string, nextStatus: string, cancelReason?: string) => {
    try {
      const res = await apiFetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: nextStatus,
          cancelReason,
        }),
      });

      if (res.ok) {
        orderAudio.playActionTone();
        // Optimistically update local order state
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: nextStatus,
                  cancelReason: cancelReason || o.cancelReason,
                  isPaid: nextStatus === "PAID" || nextStatus === "BILLED" ? true : o.isPaid,
                }
              : o
          )
        );

        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: nextStatus,
                  cancelReason: cancelReason || prev.cancelReason,
                  isPaid: nextStatus === "PAID" || nextStatus === "BILLED" ? true : prev.isPaid,
                }
              : null
          );
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to update order status.");
      }
    } catch {
      alert("Network error updating order status.");
    }
  };

  // Reprint Bill
  const handleReprintBill = async (order: OrderRecord) => {
    try {
      const res = await apiFetch("/api/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          jobType: "BILL",
        }),
      });

      const data = await res.json();
      if (data.ok || data.status === "PRINTED" || data.status === "QUEUED") {
        if (data.requiresClientDispatch) {
          await dispatchClientPrintJob({
            jobId: data.jobId,
            printerType: data.printerType,
            paperWidth: data.paperWidth,
            escPosBase64: data.escPosBase64,
            textLines: data.textLines,
          });
        }
        orderAudio.playActionTone();
        alert(`Bill reprinted successfully for Order #${order.orderNumber}`);
      } else {
        alert(data.error || "Printer is offline or not configured.");
      }
    } catch {
      alert("Error triggering bill reprint.");
    }
  };

  // Print KOT
  const handlePrintKot = async (order: OrderRecord) => {
    try {
      // Build KOT lines for client thermal printer
      const lines = [
        "================================",
        "          KITCHEN ORDER TICKET   ",
        `Order: ${order.orderNumber}`,
        `Type: ${order.type} ${order.table?.number ? `• Table ${order.table.number}` : ""}`,
        `Time: ${new Date(order.createdAt).toLocaleTimeString("en-IN")}`,
        "--------------------------------",
      ];
      order.items?.forEach((it) => {
        lines.push(`${it.quantity}x ${it.name} ${it.variantName ? `(${it.variantName})` : ""}`);
        it.addons?.forEach((a) => {
          lines.push(`   + ${a.optionNameSnapshot}`);
        });
        if (it.notes) {
          lines.push(`   * Note: ${it.notes}`);
        }
      });
      lines.push("--------------------------------");
      if (order.notes) {
        lines.push(`Special: ${order.notes}`);
      }
      lines.push("================================");

      await dispatchClientPrintJob({
        jobId: `kot-${order.id}-${Date.now()}`,
        printerType: "OS_PRINT_SERVICE",
        paperWidth: "80mm",
        textLines: lines,
      });

      orderAudio.playActionTone();
    } catch {
      alert("Error printing KOT.");
    }
  };

  // Send WhatsApp Invoice
  const handleSendWhatsApp = async (order: OrderRecord) => {
    if (!order.customerPhone) {
      alert("No customer phone number recorded for this order.");
      return;
    }

    try {
      const res = await apiFetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          phone: order.customerPhone,
        }),
      });

      if (res.ok) {
        orderAudio.playActionTone();
        alert(`WhatsApp bill dispatched to ${order.customerPhone}`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "WhatsApp delivery notice: Ensure WhatsApp credentials are configured.");
      }
    } catch {
      alert("Network error dispatching WhatsApp bill.");
    }
  };

  // Export Filtered Orders to CSV
  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      alert("No orders available to export.");
      return;
    }

    const headers = [
      "Order Number",
      "Source/Channel",
      "Service Mode",
      "Customer Name",
      "Customer Phone",
      "Table",
      "Outlet",
      "Placed At",
      "Items Count",
      "Subtotal (INR)",
      "Tax (INR)",
      "Discount (INR)",
      "Total Amount (INR)",
      "Payment Status",
      "Payment Method",
      "Order Status",
    ];

    const rows = filteredOrders.map((o) => {
      const totalItems = o.items?.reduce((s, it) => s + it.quantity, 0) || 0;
      return [
        `"${o.orderNumber}"`,
        `"${o.channel || o.type}"`,
        `"${o.serviceMode || o.type}"`,
        `"${o.customerName || "Walk-in"}"`,
        `"${o.customerPhone || ""}"`,
        `"${o.table?.number || ""}"`,
        `"${o.outlet?.name || ""}"`,
        `"${new Date(o.createdAt).toLocaleString("en-IN")}"`,
        totalItems,
        (o.subtotalPaise / 100).toFixed(2),
        (o.taxPaise / 100).toFixed(2),
        (o.discountPaise / 100).toFixed(2),
        (o.totalPaise / 100).toFixed(2),
        `"${o.isPaid ? "PAID" : "UNPAID"}"`,
        `"${o.payments?.[0]?.method || "CASH"}"`,
        `"${o.status}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `restronex_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* 1. Header with Title & Live Order Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#16845B]" />
            Order Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Petpooja-inspired unified order control terminal across POS, Dine-In, QR, and Online Aggregators.
          </p>
        </div>

        {/* Real-time Heartbeat Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live SSE Connected
          </span>
        </div>
      </div>

      {/* 2. Operational Metrics Cards (Section 2) */}
      <OrderMetricsCards
        metrics={metrics}
        activeStatusFilter={activeTab}
        onSelectStatus={(st) => setActiveTab(st)}
      />

      {/* 3. Status Tabs (Section 3) */}
      <OrderTabsNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        metrics={metrics}
        heldOrdersCount={heldOrdersCount}
      />

      {/* 4. Filter Toolbar (Section 4 & 10) */}
      <OrderFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        outlets={outlets}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onRefresh={() => loadOrders(false)}
        isRefreshing={isRefreshing}
        onExportCsv={handleExportCsv}
        totalFilteredCount={filteredOrders.length}
      />

      {/* 5. Main Order Table (Section 4) */}
      <OrderTable
        orders={filteredOrders}
        onSelectOrder={(ord) => setSelectedOrder(ord)}
        onQuickStatusChange={(orderId, next) => handleUpdateStatus(orderId, next)}
        onQuickPrint={(ord) => handleReprintBill(ord)}
        isLoading={isLoading}
      />

      {/* 6. Order Details Drawer (Section 5 & 8) */}
      <OrderDetailsDrawer
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
        onRequestCancel={(ord) => setCancelModalOrder(ord)}
        onReprintBill={handleReprintBill}
        onPrintKot={handlePrintKot}
        onSendWhatsApp={handleSendWhatsApp}
      />

      {/* 7. Cancellation Confirmation Modal (Section 6) */}
      <OrderCancelModal
        order={cancelModalOrder}
        isOpen={Boolean(cancelModalOrder)}
        onClose={() => setCancelModalOrder(null)}
        onConfirmCancel={async (orderId, reason) => {
          await handleUpdateStatus(orderId, "CANCELLED", reason);
        }}
      />
    </div>
  );
}
