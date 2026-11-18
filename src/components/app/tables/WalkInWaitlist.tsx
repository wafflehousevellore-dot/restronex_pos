"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Users, 
  Phone, 
  Plus, 
  Check, 
  X, 
  Utensils, 
  Sparkles,
  AlertCircle 
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WalkInWaitlistProps {
  outlets: any[];
  selectedOutlet: string;
  allTables: any[];
  onRefreshTables: () => void;
}

export function WalkInWaitlist({
  outlets,
  selectedOutlet,
  allTables,
  onRefreshTables,
}: WalkInWaitlistProps) {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [seatingToken, setSeatingToken] = useState<any | null>(null);
  const [selectedSeatTableId, setSelectedSeatTableId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New token form
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    partySize: "2",
  });

  const loadTokens = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedOutlet) q.set("outletId", selectedOutlet);

      const res = await apiFetch(`/api/tokens?${q.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTokens(data);
      }
    } catch {
      setMsg({ type: "error", text: "Failed to load waitlist queue" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [selectedOutlet]);

  const handleIssueToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutlet || outlets[0]?.id,
          customerName: form.customerName || undefined,
          phone: form.phone || undefined,
          partySize: parseInt(form.partySize, 10) || 2,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to issue token" });
      } else {
        setMsg({ type: "success", text: `Token #${j.token?.tokenNo} issued successfully` });
        setShowIssueModal(false);
        setForm({ customerName: "", phone: "", partySize: "2" });
        loadTokens();
      }
    } catch {
      setMsg({ type: "error", text: "Error issuing token" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeatToken = async () => {
    if (!seatingToken || !selectedSeatTableId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/tokens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEAT_TOKEN",
          tokenId: seatingToken.id,
          tableId: selectedSeatTableId,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to seat walk-in guest" });
      } else {
        setMsg({ type: "success", text: `Guest seated at Table ${j.seatedTable}` });
        setSeatingToken(null);
        setSelectedSeatTableId("");
        loadTokens();
        onRefreshTables();
      }
    } catch {
      setMsg({ type: "error", text: "Error seating guest" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (tokenId: string, status: string) => {
    try {
      await apiFetch("/api/tokens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, status }),
      });
      loadTokens();
    } catch {
      setMsg({ type: "error", text: "Failed to update queue token" });
    }
  };

  const getWaitingDuration = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return `${mins}m wait`;
  };

  const waitingTokens = tokens.filter((t) => t.status === "WAITING");
  const availableTables = allTables.filter((t) => t.status === "AVAILABLE");

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {msg && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Waitlist Header Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5EBE7] shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-[#172B25]">Live Walk-in Waitlist</h3>
          <p className="text-xs text-[#718078]">
            {waitingTokens.length} parties currently waiting for table seating
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-1.5 bg-[#16845B] hover:bg-[#126b49] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Issue Token / Add Walk-in</span>
        </button>
      </div>

      {/* Waiting Queue Cards */}
      {loading ? (
        <div className="text-center py-12 text-xs text-[#718078]">Loading waitlist queue...</div>
      ) : tokens.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <Clock className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Guests in Queue</h3>
          <p className="text-xs text-[#718078] mt-1">
            Waitlist is clear. Issue a token when walk-in guests arrive during peak hours.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tokens.map((token) => {
            const isWaiting = token.status === "WAITING";

            return (
              <div
                key={token.id}
                className={`bg-white rounded-2xl p-4 border shadow-xs transition ${
                  isWaiting ? "border-amber-200 bg-amber-50/10" : "border-[#E5EBE7] opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-[#172B25]">
                      #{token.tokenNo}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isWaiting ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {token.status}
                    </span>
                  </div>

                  {isWaiting && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{getWaitingDuration(token.createdAt)}</span>
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-[#718078]">
                  <div className="flex items-center justify-between">
                    <span>Queue Position:</span>
                    <span className="font-bold text-[#172B25]">#{token.queuePos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time Registered:</span>
                    <span>
                      {new Date(token.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {isWaiting && (
                  <div className="mt-4 pt-3 border-t border-[#E5EBE7] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSeatingToken(token);
                        setSelectedSeatTableId("");
                      }}
                      className="flex-1 py-1.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Utensils className="h-3.5 w-3.5" />
                      <span>Seat at Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(token.id, "CANCELLED")}
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                      title="Cancel Token"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Seat Token Dialog */}
      {seatingToken && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-[#E5EBE7] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#172B25]">
                Seat Walk-in Token #{seatingToken.tokenNo}
              </h3>
              <button
                type="button"
                onClick={() => setSeatingToken(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-[#718078] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#172B25]">
                Select Available Dining Table
              </label>
              {availableTables.length === 0 ? (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  No available tables currently on the floor.
                </div>
              ) : (
                <select
                  value={selectedSeatTableId}
                  onChange={(e) => setSelectedSeatTableId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                >
                  <option value="">-- Choose Table --</option>
                  {availableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.number} ({t.area || "Main Hall"} • {t.capacity} seats)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSeatingToken(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSeatToken}
                disabled={actionLoading || !selectedSeatTableId}
                className="flex-1 py-2 bg-[#16845B] hover:bg-[#126b49] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                {actionLoading ? "Seating..." : "Confirm Seating"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Token Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden">
            <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#172B25]">Issue Queue Token</h3>
                  <p className="text-xs text-[#718078]">Add guest party to waiting queue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded-full hover:bg-gray-200 text-[#718078] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIssueToken} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B25]">Customer / Party Name (Optional)</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="e.g. Ananya, VIP Group"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Party Size</label>
                  <select
                    value={form.partySize}
                    onChange={(e) => setForm({ ...form, partySize: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <option key={num} value={num}>
                        {num} Guests
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  {actionLoading ? "Issuing..." : "Issue Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
