"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Clock,
  ChefHat,
  Volume2,
  VolumeX,
  Printer,
  X,
  Maximize2,
  Minimize2,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Play,
  Bike,
} from "lucide-react";

// Web Audio API Dual-Tone Chime and Alarm Engine
class KitchenAudioEngine {
  private ctx: AudioContext | null = null;
  public isUnlocked = false;
  public volume = 0.9;

  init() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  }

  async unlock(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;
    try {
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      this.isUnlocked = this.ctx.state === "running";
      if (this.isUnlocked) {
        this.playConfirmationTone();
      }
      return this.isUnlocked;
    } catch {
      return false;
    }
  }

  playConfirmationTone() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, this.ctx.currentTime + 0.12); // C6
    gain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Loud repeating urgent chime for new incoming kitchen orders
  playNewOrderChime() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;

    // Dual-harmonic chime (A5 880Hz + C#6 1108Hz + E6 1318Hz)
    const freqs = [880, 1108.73, 1318.51];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(this.volume * 0.4, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  }

  // Urgent descending warning alarm for cancelled orders
  playCancellationAlarm() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;

    [440, 330, 220].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(this.volume * 0.45, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.32);
    });
  }
}

const audioEngine = new KitchenAudioEngine();

function getElapsed(createdAt: string): { label: string; isUrgent: boolean; isWarning: boolean; mins: number } {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  return {
    mins,
    label: mins === 0 ? "Just now" : `${mins}m ago`,
    isWarning: mins >= 10 && mins < 15,
    isUrgent: mins >= 15,
  };
}

export default function KitchenPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stationFilter, setStationFilter] = useState("ALL");
  const [outlets, setOutlets] = useState<any[]>([]);
  const [activeOutletId, setActiveOutletId] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoPrintKot, setAutoPrintKot] = useState(false);
  const [kotModalTicket, setKotModalTicket] = useState<any | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simMsg, setSimMsg] = useState<string | null>(null);

  // Set of known ticket IDs to detect new orders and cancellations
  const knownTicketIds = useRef<Set<string>>(new Set());
  const unacknowledgedTicketIds = useRef<Set<string>>(new Set());
  const repeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Outlets list
  useEffect(() => {
    apiFetch("/api/outlets")
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setOutlets(list);
          setActiveOutletId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Request Screen Wake Lock so kitchen tablet does not sleep
  useEffect(() => {
    let wakeLock: any = null;
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock
        .request("screen")
        .then((lock: any) => {
          wakeLock = lock;
        })
        .catch(() => {});
    }
    return () => {
      wakeLock?.release().catch(() => {});
    };
  }, []);

  // Unlock AudioContext on first user interaction
  const handleUnlockAudio = async () => {
    const ok = await audioEngine.unlock();
    setAudioUnlocked(ok);
  };

  const handleVolumeChange = (newVol: number) => {
    setSoundVolume(newVol);
    audioEngine.volume = newVol;
  };

  const lastEtag = useRef<string | null>(null);

  // Main Ticket Loader with ETag 304 conditional evaluation
  const loadTickets = useCallback(async () => {
    try {
      const qs = activeOutletId ? `?outletId=${encodeURIComponent(activeOutletId)}` : "";
      const headers: Record<string, string> = {};
      if (lastEtag.current) {
        headers["If-None-Match"] = lastEtag.current;
      }
      const res = await apiFetch(`/api/kds${qs}`, { headers });
      if (res.status === 304) {
        // Tickets unchanged: zero re-render, zero bandwidth overhead
        return;
      }
      const etagHeader = res.headers.get("etag");
      if (etagHeader) {
        lastEtag.current = etagHeader;
      }
      const list = await res.json();
      if (!Array.isArray(list)) return;

      // Detect newly arrived orders & cancellations
      if (knownTicketIds.current.size > 0 && soundEnabled) {
        const newUnacknowledged = list.filter(
          (t: any) =>
            !knownTicketIds.current.has(t.id) &&
            t.status !== "CANCELLED" &&
            t.status !== "COMPLETED" &&
            !t.acknowledgedAt
        );

        const newlyCancelled = list.filter(
          (t: any) =>
            knownTicketIds.current.has(t.id) &&
            t.status === "CANCELLED" &&
            !unacknowledgedTicketIds.current.has(`canc_${t.id}`)
        );

        if (newlyCancelled.length > 0) {
          newlyCancelled.forEach((t) => unacknowledgedTicketIds.current.add(`canc_${t.id}`));
          audioEngine.playCancellationAlarm();
        } else if (newUnacknowledged.length > 0) {
          audioEngine.playNewOrderChime();
        }
      }

      // Update unacknowledged set (tickets in RECEIVED status without acknowledgedAt)
      const unack = new Set<string>();
      list.forEach((t: any) => {
        if (t.status === "RECEIVED" && !t.acknowledgedAt) {
          unack.add(t.id);
        }
      });
      unacknowledgedTicketIds.current = unack;

      knownTicketIds.current = new Set(list.map((t: any) => t.id));
      setTickets(list);
    } catch {
      // silent fallback
    }
  }, [activeOutletId, soundEnabled]);

  // Polling interval with Visibility Change Backoff + SSE listener
  useEffect(() => {
    loadTickets();
    let intervalId = setInterval(loadTickets, 3000);

    const handleVisibility = () => {
      clearInterval(intervalId);
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        intervalId = setInterval(loadTickets, 15000); // 15s backoff when minimized/backgrounded
      } else {
        loadTickets();
        intervalId = setInterval(loadTickets, 3000);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    // Setup Server-Sent Events (SSE) stream for zero-latency instant updates
    let evtSource: EventSource | null = null;
    try {
      const streamUrl = `/api/kds/stream${activeOutletId ? `?outletId=${encodeURIComponent(activeOutletId)}` : ""}`;
      evtSource = new EventSource(streamUrl);
      evtSource.addEventListener("kds_event", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "NEW_ORDER") {
            if (soundEnabled) audioEngine.playNewOrderChime();
          } else if (data.type === "ORDER_CANCELLED") {
            if (soundEnabled) audioEngine.playCancellationAlarm();
          }
          loadTickets();
        } catch {}
      });
    } catch {}

    return () => {
      clearInterval(intervalId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      evtSource?.close();
    };
  }, [loadTickets, activeOutletId, soundEnabled]);

  // Repeating Sound Loop: repeats chime every 3.5 seconds while there are unacknowledged orders!
  useEffect(() => {
    if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);

    if (soundEnabled && audioUnlocked) {
      repeatTimerRef.current = setInterval(() => {
        // If there's any active unacknowledged ticket, trigger the repeating chime
        if (unacknowledgedTicketIds.current.size > 0) {
          audioEngine.playNewOrderChime();
        }
      }, 3500);
    }

    return () => {
      if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);
    };
  }, [soundEnabled, audioUnlocked]);

  // Acknowledge ticket: stops repeating sound for this ticket
  async function handleAcknowledge(ticketId: string) {
    unacknowledgedTicketIds.current.delete(ticketId);
    try {
      await apiFetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, action: "ACKNOWLEDGE" }),
      });
      await loadTickets();
    } catch {}
  }

  // Update Ticket Status
  async function handleUpdateStatus(ticketId: string, status: string) {
    setLoading(true);
    try {
      await apiFetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      await loadTickets();
    } finally {
      setLoading(false);
    }
  }

  // Reprint KOT Ticket
  async function handleReprintKot(ticketId: string) {
    try {
      await apiFetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, action: "REPRINT_KOT" }),
      });
      await loadTickets();
    } catch {}
  }

  // Toggle Fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Run Order Simulator
  async function runSimulation(source: string, action = "SIMULATE_ORDER") {
    setSimulating(true);
    setSimMsg(null);
    try {
      const res = await apiFetch("/api/kds/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          action,
          outletId: activeOutletId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSimMsg(`❌ ${data.error || "Simulation failed"}`);
      } else {
        setSimMsg(`✓ ${data.message}`);
        await loadTickets();
      }
    } catch {
      setSimMsg("❌ Simulation network error");
    } finally {
      setSimulating(false);
    }
  }

  // Multi-dimensional filtering
  const filtered = tickets.filter((t) => {
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesStation = stationFilter === "ALL" || (t.station || "MAIN").toUpperCase() === stationFilter;
    return matchesStatus && matchesStation;
  });

  // Categorize order lanes
  const lanes: Record<string, any[]> = {
    "NEW ORDERS": [],
    ACCEPTED: [],
    PREPARING: [],
    READY: [],
    COMPLETED: [],
  };

  filtered.forEach((t) => {
    if (t.status === "RECEIVED" && !t.acknowledgedAt) {
      lanes["NEW ORDERS"].push(t);
    } else if (t.status === "ACCEPTED" || (t.status === "RECEIVED" && t.acknowledgedAt)) {
      lanes.ACCEPTED.push(t);
    } else if (t.status === "PREPARING") {
      lanes.PREPARING.push(t);
    } else if (t.status === "READY") {
      lanes.READY.push(t);
    } else if (t.status === "COMPLETED") {
      lanes.COMPLETED.push(t);
    }
  });

  const unacknowledgedCount = useMemo(() => {
    return tickets.filter((t) => t.status === "RECEIVED" && !t.acknowledgedAt).length;
  }, [tickets]);

  return (
    <div className="space-y-4 text-[#172B25] pb-8">
      {/* Audio Unlock Banner (Required for browser autoplay compliance) */}
      {!audioUnlocked && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 shadow-md flex flex-wrap items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-600 text-white grid place-items-center shrink-0">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-red-950">
                Loud Kitchen Audio Alerts are Paused by Browser
              </div>
              <p className="text-xs text-red-800">
                Web browsers block audio until you click once. Click below so incoming POS, QR, and online orders ring out loudly in the kitchen!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUnlockAudio}
            className="rounded-full bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Bell className="h-4 w-4" /> 🔊 Enable Kitchen Sound Alerts
          </button>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5EBE7] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#16845B] text-white grid place-items-center shrink-0 shadow-xs">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#172B25] tracking-tight">Kitchen Display System (KDS)</h1>
              {unacknowledgedCount > 0 && (
                <span className="rounded-full bg-red-600 text-white px-2.5 py-0.5 text-xs font-black animate-bounce">
                  {unacknowledgedCount} NEW UNACKNOWLEDGED
                </span>
              )}
            </div>
            <p className="text-xs text-[#718078]">
              Automated live order reception • POS, QR &amp; Online auto-sync • Loud chime alert
            </p>
          </div>
        </div>

        {/* Outlet Switcher & Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {outlets.length > 1 && (
            <select
              value={activeOutletId}
              onChange={(e) => setActiveOutletId(e.target.value)}
              className="rounded-full border border-[#E5EBE7] bg-[#F8FAF9] px-3.5 py-1.5 text-xs font-bold text-[#172B25]"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  Outlet: {o.name}
                </option>
              ))}
            </select>
          )}

          {/* Sound Controls */}
          <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1 rounded-full text-xs">
            <button
              type="button"
              onClick={() => {
                if (!audioUnlocked) handleUnlockAudio();
                setSoundEnabled(!soundEnabled);
              }}
              className="flex items-center gap-1 font-bold text-[#172B25] cursor-pointer"
              title="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#16845B]" /> : <VolumeX className="h-3.5 w-3.5 text-red-600" />}
              <span>{soundEnabled ? "Sound ON" : "Muted"}</span>
            </button>

            <span className="text-gray-300">|</span>

            {/* Volume Slider */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#718078] font-bold">Vol:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={soundVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 h-1.5 accent-[#16845B] cursor-pointer"
                title={`Volume: ${Math.round(soundVolume * 100)}%`}
              />
            </div>

            <span className="text-gray-300">|</span>

            {/* Test Chime Button */}
            <button
              type="button"
              onClick={() => {
                audioEngine.unlock();
                audioEngine.playNewOrderChime();
              }}
              className="text-[11px] text-[#16845B] hover:underline font-bold cursor-pointer"
              title="Test new order alert sound"
            >
              Test Chime
            </button>

            <span className="text-gray-300">|</span>

            {/* Test Alarm Button */}
            <button
              type="button"
              onClick={() => {
                audioEngine.unlock();
                audioEngine.playCancellationAlarm();
              }}
              className="text-[11px] text-red-600 hover:underline font-bold cursor-pointer"
              title="Test cancellation warning alarm"
            >
              Test Cancel Alarm
            </button>
          </div>

          {/* Order Simulator Button */}
          <button
            type="button"
            onClick={() => setSimulatorOpen(true)}
            className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" /> ⚡ Order Simulator
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] text-[#718078] hover:text-[#172B25] cursor-pointer"
            title="Toggle Fullscreen KDS"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Filter Tabs: Status & Station */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-[#E5EBE7] p-1 rounded-full text-xs font-bold shadow-2xs">
            <span className="text-[10px] text-[#718078] uppercase px-2">Status:</span>
            {["ALL", "RECEIVED", "ACCEPTED", "PREPARING", "READY"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  statusFilter === st ? "bg-[#16845B] text-white" : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#E5EBE7] p-1 rounded-full text-xs font-bold shadow-2xs">
            <span className="text-[10px] text-[#718078] uppercase px-2">Station:</span>
            {["ALL", "MAIN", "BEVERAGE", "DESSERT", "BAR"].map((st) => (
              <button
                key={st}
                onClick={() => setStationFilter(st)}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  stationFilter === st ? "bg-[#172B25] text-white" : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#718078] cursor-pointer">
            <input
              type="checkbox"
              checked={autoPrintKot}
              onChange={(e) => setAutoPrintKot(e.target.checked)}
              className="rounded text-[#16845B]"
            />
            <span>Auto-Print KOT on Arrival</span>
          </label>
        </div>
      </div>

      {/* Kanban Board Order Lanes */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 min-h-[75vh]">
        {Object.entries(lanes).map(([laneTitle, list]) => {
          const isNewLane = laneTitle === "NEW ORDERS";
          const count = list.length;

          return (
            <div
              key={laneTitle}
              className={`rounded-2xl border p-3 flex flex-col transition ${
                isNewLane && count > 0
                  ? "bg-red-50/60 border-red-300 shadow-sm"
                  : "bg-white border-[#E5EBE7] shadow-xs"
              }`}
            >
              {/* Lane Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5EBE7]">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isNewLane
                        ? "bg-red-600 animate-ping"
                        : laneTitle === "ACCEPTED"
                        ? "bg-blue-600"
                        : laneTitle === "PREPARING"
                        ? "bg-amber-500"
                        : laneTitle === "READY"
                        ? "bg-emerald-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="text-xs font-black tracking-wider uppercase text-[#172B25]">
                    {laneTitle}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-black ${
                    isNewLane && count > 0
                      ? "bg-red-600 text-white"
                      : "bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]"
                  }`}
                >
                  {count}
                </span>
              </div>

              {/* Order Cards Container */}
              <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-[75vh]">
                {list.map((t) => {
                  const order = t.order;
                  const elapsed = getElapsed(t.createdAt);
                  const isUnacknowledged = !t.acknowledgedAt && t.status === "RECEIVED";
                  const isCancelled = t.status === "CANCELLED" || order?.status === "CANCELLED";
                  const source = order?.type || "POS";

                  // Aggregator Badge Styling
                  const sourceBadge =
                    source === "SWIGGY"
                      ? "bg-[#FC8019] text-white"
                      : source === "ZOMATO"
                      ? "bg-[#CB202D] text-white"
                      : source === "WEBSITE"
                      ? "bg-indigo-600 text-white"
                      : source === "TABLE_QR"
                      ? "bg-teal-600 text-white"
                      : "bg-[#16845B] text-white";

                  return (
                    <div
                      key={t.id}
                      className={`rounded-2xl border p-3.5 transition space-y-2.5 ${
                        isCancelled
                          ? "bg-red-50 border-red-400 opacity-90 ring-2 ring-red-400"
                          : isUnacknowledged
                          ? "bg-white border-red-500 ring-4 ring-red-500/25 animate-pulse shadow-md"
                          : t.status === "PREPARING"
                          ? "bg-amber-50/50 border-amber-300"
                          : t.status === "READY"
                          ? "bg-emerald-50/50 border-emerald-300"
                          : "bg-white border-[#E5EBE7]"
                      }`}
                    >
                      {/* Flashing Unacknowledged Alert Banner */}
                      {isUnacknowledged && (
                        <div className="rounded-xl bg-red-600 text-white p-2 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-xs">
                          <Bell className="h-4 w-4 animate-bounce" /> 🚨 NEW ORDER — PLEASE ACKNOWLEDGE
                        </div>
                      )}

                      {/* Cancellation Banner */}
                      {isCancelled && (
                        <div className="rounded-xl bg-red-700 text-white p-2 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-xs">
                          <AlertTriangle className="h-4 w-4" /> ⚠️ ORDER CANCELLED — STOP PREPARATION
                        </div>
                      )}

                      {/* Order Card Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${sourceBadge}`}>
                              {source}
                            </span>
                            <span className="text-sm font-black text-[#172B25]">
                              {order?.orderNumber || t.orderId.slice(0, 8)}
                            </span>
                          </div>

                          <div className="text-xs text-[#718078] mt-1 font-medium">
                            {order?.table?.number ? (
                              <b className="text-[#172B25]">Table {order.table.number}</b>
                            ) : (
                              <span>{order?.serviceMode || "DELIVERY"}</span>
                            )}
                            {order?.customerName && <span> • {order.customerName}</span>}
                          </div>
                        </div>

                        {/* Elapsed Timer */}
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              elapsed.isUrgent
                                ? "bg-red-600 text-white animate-pulse"
                                : elapsed.isWarning
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {elapsed.label}
                          </span>
                          <div className="text-[10px] text-[#718078] mt-0.5 font-bold">
                            Station: {t.station || "MAIN"}
                          </div>
                        </div>
                      </div>

                      {/* Special Cooking Instructions & Notes */}
                      {order?.notes && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-950 font-medium">
                          ⚠️ <b>Note:</b> {order.notes}
                        </div>
                      )}

                      {/* Items List with Large Bold Quantities & Add-ons */}
                      <div className="border-t border-[#E5EBE7] pt-2 space-y-2">
                        {order?.items?.map((it: any) => {
                          let parsedModifiers: any[] = [];
                          if (Array.isArray(it.addons) && it.addons.length > 0) {
                            parsedModifiers = it.addons.map((a: any) => ({
                              name: a.optionNameSnapshot || a.name,
                              group: a.groupNameSnapshot || a.groupName,
                            }));
                          } else if (it.modifiersJson) {
                            try {
                              const parsed = JSON.parse(it.modifiersJson);
                              if (Array.isArray(parsed)) parsedModifiers = parsed;
                            } catch {}
                          }

                          return (
                            <div key={it.id} className="text-xs text-[#172B25] flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="font-bold flex items-center gap-1.5">
                                  <span className="h-5 w-5 rounded bg-[#172B25] text-white text-[11px] font-black grid place-items-center shrink-0">
                                    {it.quantity}
                                  </span>
                                  <span className="font-bold text-sm leading-snug">{it.name}</span>
                                </div>
                                {it.variantName && (
                                  <div className="text-[11px] text-[#718078] ml-6 font-semibold">
                                    ↳ {it.variantName}
                                  </div>
                                )}
                                {parsedModifiers.length > 0 && (
                                  <div className="ml-6 space-y-0.5 mt-1">
                                    {parsedModifiers.map((mod: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 rounded-md px-1.5 py-0.5 mr-1 mb-0.5"
                                      >
                                        <span>+ {mod.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {it.notes && (
                                  <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 ml-6 mt-1 font-medium inline-block">
                                    ↳ Note: {it.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Payment Status & KOT Print */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E5EBE7]/60">
                        <span className="font-bold text-[#172B25]">
                          {order?.isPaid ? "✓ PAID" : "⚠️ COLLECT CASH"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setKotModalTicket(t)}
                            className="text-[#16845B] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            title="Print KOT Ticket"
                          >
                            <Printer className="h-3 w-3" /> KOT
                          </button>
                          {t.reprintCount > 0 && (
                            <span className="text-[10px] text-gray-500">
                              (Reprinted {t.reprintCount}×)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Bump Buttons */}
                      <div className="pt-1 space-y-1.5">
                        {/* 1. Primary Acknowledge Button for New Orders (Stops Repeating Sound) */}
                        {isUnacknowledged && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(t.id)}
                            className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white py-2.5 text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" /> ACKNOWLEDGE ORDER ✓
                          </button>
                        )}

                        {/* 2. Lane Progression Buttons */}
                        {t.status === "RECEIVED" && !isUnacknowledged && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(t.id, "PREPARING")}
                            disabled={loading}
                            className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2 text-xs font-black transition cursor-pointer"
                          >
                            Start Preparing →
                          </button>
                        )}

                        {t.status === "ACCEPTED" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(t.id, "PREPARING")}
                            disabled={loading}
                            className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2 text-xs font-black transition cursor-pointer"
                          >
                            Start Preparing →
                          </button>
                        )}

                        {t.status === "PREPARING" && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateStatus(t.id, "READY");
                              audioEngine.playConfirmationTone();
                            }}
                            disabled={loading}
                            className="w-full rounded-full bg-amber-600 hover:bg-amber-700 text-white py-2 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Bell className="h-3.5 w-3.5" /> Mark Ready (Bell Waiter) 🔔
                          </button>
                        )}

                        {t.status === "READY" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(t.id, "COMPLETED")}
                            disabled={loading}
                            className="w-full rounded-full bg-[#172B25] hover:bg-black text-white py-2 text-xs font-black transition cursor-pointer"
                          >
                            Served / Picked Up ✓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {list.length === 0 && (
                  <div className="py-12 text-center text-xs text-[#718078] font-medium">
                    No orders in this lane.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Thermal KOT Modal */}
      {kotModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25] flex items-center gap-2">
                <Printer className="h-4 w-4 text-[#16845B]" />
                Kitchen Order Ticket (KOT)
              </h3>
              <button
                type="button"
                onClick={() => setKotModalTicket(null)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center hover:text-[#172B25] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Printable KOT Thermal Paper Format */}
            <div
              id="kot-printable"
              className="p-4 bg-[#F8FAF9] rounded-2xl border border-[#E5EBE7] font-mono text-xs space-y-2 text-black"
            >
              <div className="text-center border-b border-dashed border-gray-400 pb-2">
                <div className="font-black text-sm uppercase">KITCHEN ORDER TICKET (KOT)</div>
                <div className="text-[11px] text-gray-600">Station: {kotModalTicket.station || "MAIN"}</div>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span>
                  <b>Order:</b> {kotModalTicket.order?.orderNumber}
                </span>
                <span>
                  <b>Source:</b> {kotModalTicket.order?.type}
                </span>
              </div>
              <div className="text-[10px] text-gray-500">
                Time: {new Date(kotModalTicket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>

              {kotModalTicket.order?.notes && (
                <div className="p-1.5 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 font-sans">
                  <b>Special Note:</b> {kotModalTicket.order.notes}
                </div>
              )}

              <div className="border-t border-b border-dashed border-gray-400 py-2 space-y-1 my-2">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>ITEM</span>
                  <span>QTY</span>
                </div>
                {kotModalTicket.order?.items?.map((it: any) => {
                  let parsedModifiers: any[] = [];
                  if (Array.isArray(it.addons) && it.addons.length > 0) {
                    parsedModifiers = it.addons.map((a: any) => ({
                      name: a.optionNameSnapshot || a.name,
                    }));
                  } else if (it.modifiersJson) {
                    try {
                      const parsed = JSON.parse(it.modifiersJson);
                      if (Array.isArray(parsed)) parsedModifiers = parsed;
                    } catch {}
                  }

                  return (
                    <div key={it.id} className="text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span className="font-semibold">{it.name}</span>
                        <span className="font-bold">×{it.quantity}</span>
                      </div>
                      {parsedModifiers.length > 0 && (
                        <div className="text-[10px] text-gray-700 pl-2">
                          {parsedModifiers.map((m: any, idx: number) => (
                            <div key={idx}>+ {m.name}</div>
                          ))}
                        </div>
                      )}
                      {it.notes && (
                        <div className="text-[10px] text-gray-600 italic pl-2">
                          ↳ Note: {it.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-[10px] text-gray-500 pt-1">
                Ticket ID: {kotModalTicket.id.slice(-10)}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKotModalTicket(null)}
                className="flex-1 rounded-full border border-[#E5EBE7] bg-white py-2.5 text-xs font-bold text-[#718078] hover:bg-[#F8FAF9] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleReprintKot(kotModalTicket.id);
                  window.print();
                }}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2.5 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print KOT (80mm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Simulator Modal */}
      {simulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-black text-base text-[#172B25] flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Real-Time Order &amp; Sound Alert Simulator
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSimulatorOpen(false);
                  setSimMsg(null);
                }}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center hover:text-[#172B25] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#718078]">
              Test incoming kitchen orders and loud audio alarms immediately without live aggregator credentials:
            </p>

            {simMsg && (
              <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs font-bold">
                {simMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* QR Table Simulation */}
              <button
                type="button"
                disabled={simulating}
                onClick={() => runSimulation("TABLE_QR")}
                className="p-3 rounded-2xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Play className="h-4 w-4 shrink-0" />
                <span>Simulate Table QR Order</span>
              </button>

              {/* Online Delivery Simulation */}
              <button
                type="button"
                disabled={simulating}
                onClick={() => runSimulation("WEBSITE")}
                className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Bike className="h-4 w-4 shrink-0" />
                <span>Simulate Online Delivery</span>
              </button>

              {/* POS Walk-In Simulation */}
              <button
                type="button"
                disabled={simulating}
                onClick={() => runSimulation("POS")}
                className="p-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Play className="h-4 w-4 shrink-0" />
                <span>Simulate POS Counter Order</span>
              </button>

              {/* Online Pickup Simulation */}
              <button
                type="button"
                disabled={simulating}
                onClick={() => runSimulation("WEBSITE")}
                className="p-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Play className="h-4 w-4 shrink-0" />
                <span>Simulate Takeaway Order</span>
              </button>
            </div>

            {/* Cancellation Simulation */}
            <div className="pt-2 border-t border-[#E5EBE7]">
              <button
                type="button"
                disabled={simulating}
                onClick={() => runSimulation("WEBSITE", "CANCEL_LATEST")}
                className="w-full p-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4" /> Simulate Order Cancellation Alarm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
