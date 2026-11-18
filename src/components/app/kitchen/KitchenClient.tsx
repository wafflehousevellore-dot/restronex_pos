"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { orderAudio } from "@/lib/audio-engine";
import { dispatchClientPrintJob } from "@/lib/client-print";
import { KDSHeader } from "./KDSHeader";
import { KDSMetricsSummary, KdsMetrics } from "./KDSMetricsSummary";
import { KDSTicketCard, KitchenTicketRecord } from "./KDSTicketCard";
import { KDSCompletedDrawer } from "./KDSCompletedDrawer";
import { KDSBumpBarShortcutsModal } from "./KDSBumpBarShortcutsModal";
import { ChefHat, AlertCircle, Utensils } from "lucide-react";

interface KitchenClientProps {
  initialTickets?: KitchenTicketRecord[];
  initialOutlets?: Array<{ id: string; name: string }>;
}

export function KitchenClient({
  initialTickets = [],
  initialOutlets = [],
}: KitchenClientProps) {
  const [tickets, setTickets] = useState<KitchenTicketRecord[]>(initialTickets);
  const [completedTickets, setCompletedTickets] = useState<KitchenTicketRecord[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>(initialOutlets);

  // Filters & State
  const [selectedStation, setSelectedStation] = useState<string>("ALL");
  const [selectedOutletId, setSelectedOutletId] = useState<string>("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // System & Connection State
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [clockTime, setClockTime] = useState<string>("");

  // Modals & Drawers
  const [isCompletedDrawerOpen, setIsCompletedDrawerOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Live second ticker for real-time running timers
  const [, setSecondsTicker] = useState(0);

  // Initialize Audio & Clock
  useEffect(() => {
    setSoundEnabled(orderAudio.isSoundEnabled());

    const updateClock = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setSecondsTicker((s) => s + 1);
    };

    updateClock();
    const timerInterval = setInterval(updateClock, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Unlock Audio
  const handleUnlockAudio = async () => {
    const ok = await orderAudio.unlock();
    setAudioUnlocked(ok);
    if (ok) {
      orderAudio.playActionTone();
    }
  };

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

  // Load Kitchen Tickets
  const loadTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (selectedOutletId !== "ALL") params.set("outletId", selectedOutletId);
      if (selectedStation !== "ALL") params.set("station", selectedStation);

      const res = await apiFetch(`/api/kds?${params.toString()}`);
      if (res.ok) {
        const data: KitchenTicketRecord[] = await res.json();
        if (Array.isArray(data)) {
          // Separate active vs completed
          const active = data.filter((t) => t.status !== "COMPLETED");
          const completed = data.filter((t) => t.status === "COMPLETED");
          setTickets(active);
          setCompletedTickets(completed);
        }
      }
    } catch (err) {
      console.warn("[KitchenClient] Load error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedOutletId, selectedStation]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Real-time Order Stream via SSE (/api/kds/stream)
  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: any = null;

    const connectSSE = () => {
      try {
        const url = `/api/kds/stream${
          selectedOutletId !== "ALL" ? `?outletId=${selectedOutletId}` : ""
        }`;
        evtSource = new EventSource(url);

        evtSource.onopen = () => {
          setIsConnected(true);
        };

        evtSource.addEventListener("kds_event", (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev.type === "NEW_ORDER") {
              orderAudio.playNewOrderChime(ev.orderId);
              loadTickets(true);
            } else if (
              ev.type === "TICKET_STATUS_UPDATED" ||
              ev.type === "TICKET_ACKNOWLEDGED" ||
              ev.type === "ORDER_CANCELLED"
            ) {
              loadTickets(true);
            }
          } catch (pErr) {
            console.warn("[KDS SSE Parse]", pErr);
          }
        });

        evtSource.onerror = () => {
          setIsConnected(false);
          evtSource?.close();
          retryTimeout = setTimeout(connectSSE, 6000);
        };
      } catch {
        setIsConnected(false);
      }
    };

    connectSSE();

    // Fallback polling every 20s
    const pollInterval = setInterval(() => {
      loadTickets(true);
    }, 20000);

    return () => {
      evtSource?.close();
      clearTimeout(retryTimeout);
      clearInterval(pollInterval);
    };
  }, [selectedOutletId, loadTickets]);

  // Fullscreen Controller
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Update Ticket Status
  const handleUpdateStatus = async (ticketId: string, nextStatus: string) => {
    try {
      const res = await apiFetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: nextStatus }),
      });

      if (res.ok) {
        orderAudio.playActionTone();
        // Optimistic state update
        if (nextStatus === "COMPLETED") {
          const bumped = tickets.find((t) => t.id === ticketId);
          if (bumped) {
            setTickets((prev) => prev.filter((t) => t.id !== ticketId));
            setCompletedTickets((prev) => [{ ...bumped, status: "COMPLETED" }, ...prev]);
          }
        } else {
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus as any } : t))
          );
        }
      }
    } catch {
      alert("Error updating ticket status.");
    }
  };

  // Recall / Undo Bumped Ticket
  const handleRecallTicket = async (ticketId: string) => {
    try {
      const res = await apiFetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: "PREPARING" }),
      });

      if (res.ok) {
        orderAudio.playActionTone();
        const recalled = completedTickets.find((t) => t.id === ticketId);
        if (recalled) {
          setCompletedTickets((prev) => prev.filter((t) => t.id !== ticketId));
          setTickets((prev) => [...prev, { ...recalled, status: "PREPARING" }]);
        }
      }
    } catch {
      alert("Error recalling ticket.");
    }
  };

  // Reprint KOT Thermal Ticket
  const handleReprintKot = async (ticket: KitchenTicketRecord) => {
    try {
      const res = await apiFetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, action: "REPRINT_KOT" }),
      });

      if (res.ok) {
        // Also trigger client-side printer dialog or ESC/POS slip
        const kotLines = [
          "================================",
          "      ** KOT DUPLICATE **       ",
          `Order: ${ticket.order.orderNumber}`,
          `Table: ${ticket.order.table?.number || ticket.order.type}`,
          `Station: ${ticket.station}`,
          `Reprint #: ${ticket.reprintCount + 1}`,
          `Time: ${new Date().toLocaleTimeString("en-IN")}`,
          "--------------------------------",
          ...ticket.order.items.map((it) => `${it.quantity}x ${it.name}`),
          "================================",
        ];

        await dispatchClientPrintJob({
          jobId: `kot-reprint-${ticket.id}`,
          printerType: "OS_PRINT_SERVICE",
          paperWidth: "80mm",
          textLines: kotLines,
        });

        orderAudio.playActionTone();
        alert(`KOT reprint dispatched for #${ticket.order.orderNumber}`);
      }
    } catch {
      alert("Failed to trigger KOT reprint.");
    }
  };

  // Toggle Rush Priority
  const handleTogglePriority = async (ticket: KitchenTicketRecord) => {
    const nextPriority = ticket.priority > 0 ? 0 : 1;
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, priority: nextPriority } : t))
    );
    orderAudio.playActionTone();
  };

  // Compute Metrics
  const metrics: KdsMetrics = useMemo(() => {
    let newCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let delayedCount = 0;
    let totalPrepMins = 0;

    const now = Date.now();
    tickets.forEach((t) => {
      const elapsed = Math.max(0, Math.floor((now - new Date(t.createdAt).getTime()) / 60000));
      totalPrepMins += elapsed;

      if (elapsed >= 15) delayedCount++;

      if (t.status === "RECEIVED") newCount++;
      else if (t.status === "ACCEPTED" || t.status === "PREPARING") preparingCount++;
      else if (t.status === "READY") readyCount++;
    });

    const avgPrepMinutes =
      tickets.length > 0 ? Math.round(totalPrepMins / tickets.length) : 0;

    return {
      totalActive: tickets.length,
      newCount,
      preparingCount,
      readyCount,
      delayedCount,
      completedCount: completedTickets.length,
      avgPrepMinutes,
    };
  }, [tickets, completedTickets]);

  // Filter Tickets for display
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Station filter
      if (selectedStation !== "ALL" && t.station !== selectedStation) return false;

      // Status bucket filter
      if (activeStatusFilter === "RECEIVED" && t.status !== "RECEIVED") return false;
      if (
        activeStatusFilter === "PREPARING" &&
        t.status !== "ACCEPTED" &&
        t.status !== "PREPARING"
      )
        return false;
      if (activeStatusFilter === "READY" && t.status !== "READY") return false;
      if (activeStatusFilter === "DELAYED") {
        const elapsed = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000);
        if (elapsed < 15) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrder = t.order.orderNumber.toLowerCase().includes(q);
        const matchTable = t.order.table?.number.toLowerCase().includes(q);
        const matchCustomer = t.order.customerName?.toLowerCase().includes(q);
        if (!matchOrder && !matchTable && !matchCustomer) return false;
      }

      return true;
    });
  }, [tickets, selectedStation, activeStatusFilter, searchQuery]);

  // Bump Bar Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in search input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // 'F' -> Toggle Fullscreen
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleToggleFullscreen();
        return;
      }

      // 'M' -> Toggle Sound
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        const next = !soundEnabled;
        setSoundEnabled(next);
        orderAudio.setSoundEnabled(next);
        return;
      }

      // 'R' -> Refresh
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        loadTickets(false);
        return;
      }

      // 'Space' or 'Enter' -> Bump first ticket
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (filteredTickets.length > 0) {
          const first = filteredTickets[0];
          let nextSt = "ACCEPTED";
          if (first.status === "RECEIVED") nextSt = "ACCEPTED";
          else if (first.status === "ACCEPTED") nextSt = "PREPARING";
          else if (first.status === "PREPARING") nextSt = "READY";
          else if (first.status === "READY") nextSt = "COMPLETED";
          handleUpdateStatus(first.id, nextSt);
        }
        return;
      }

      // Numeric keys '1' - '9' -> Bump corresponding ticket
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        const target = filteredTickets[num - 1];
        if (target) {
          e.preventDefault();
          let nextSt = "ACCEPTED";
          if (target.status === "RECEIVED") nextSt = "ACCEPTED";
          else if (target.status === "ACCEPTED") nextSt = "PREPARING";
          else if (target.status === "PREPARING") nextSt = "READY";
          else if (target.status === "READY") nextSt = "COMPLETED";
          handleUpdateStatus(target.id, nextSt);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredTickets, soundEnabled, loadTickets]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. KDS Top Bar with Stations & Clock */}
      <KDSHeader
        clockTime={clockTime}
        selectedStation={selectedStation}
        onSelectStation={(st) => setSelectedStation(st)}
        selectedOutletId={selectedOutletId}
        onSelectOutlet={(oid) => setSelectedOutletId(oid)}
        outlets={outlets}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          orderAudio.setSoundEnabled(next);
        }}
        audioUnlocked={audioUnlocked}
        onUnlockAudio={handleUnlockAudio}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        isConnected={isConnected}
        onRefresh={() => loadTickets(false)}
        isRefreshing={isRefreshing}
      />

      {/* 2. Operational Metrics Summary */}
      <div className="px-4 py-2 shrink-0">
        <KDSMetricsSummary
          metrics={metrics}
          activeStatusFilter={activeStatusFilter}
          onSelectStatusFilter={(st) => setActiveStatusFilter(st)}
          onOpenCompletedDrawer={() => setIsCompletedDrawerOpen(true)}
        />
      </div>

      {/* 3. Main Ticket Cards Grid */}
      <main className="flex-1 overflow-y-auto p-4">
        {filteredTickets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40">
            <ChefHat className="w-16 h-16 text-slate-700 mb-3 animate-pulse" />
            <h3 className="text-lg font-black text-slate-300">
              Kitchen Queue is All Clear!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              New orders placed via POS, Dine-In Tables, QR Ordering, or Aggregators will appear
              here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 items-start">
            {filteredTickets.map((ticket, idx) => (
              <KDSTicketCard
                key={ticket.id}
                ticket={ticket}
                cardIndex={idx + 1}
                onUpdateStatus={handleUpdateStatus}
                onReprintKot={handleReprintKot}
                onTogglePriority={handleTogglePriority}
              />
            ))}
          </div>
        )}
      </main>

      {/* 4. Slide-over Completed Tickets Drawer */}
      <KDSCompletedDrawer
        isOpen={isCompletedDrawerOpen}
        onClose={() => setIsCompletedDrawerOpen(false)}
        completedTickets={completedTickets}
        onRecallTicket={handleRecallTicket}
        onReprintKot={handleReprintKot}
      />

      {/* 5. Bump Bar Shortcuts Help Modal */}
      <KDSBumpBarShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
