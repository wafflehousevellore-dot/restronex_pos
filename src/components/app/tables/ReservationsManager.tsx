"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Phone, 
  Plus, 
  Search, 
  Check, 
  X, 
  AlertCircle, 
  Utensils, 
  Sparkles,
  ChevronRight
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ReservationsManagerProps {
  outlets: any[];
  selectedOutlet: string;
  allTables: any[];
  onRefreshTables: () => void;
}

export function ReservationsManager({
  outlets,
  selectedOutlet,
  allTables,
  onRefreshTables,
}: ReservationsManagerProps) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [seatingReservation, setSeatingReservation] = useState<any | null>(null);
  const [selectedSeatTableId, setSelectedSeatTableId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New reservation form state
  const [newForm, setNewForm] = useState({
    name: "",
    phone: "",
    partySize: "2",
    date: new Date().toISOString().split("T")[0],
    time: "19:30",
    outletId: selectedOutlet || outlets[0]?.id || "",
    notes: "",
  });

  const loadReservations = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedOutlet) q.set("outletId", selectedOutlet);
      if (selectedDate) q.set("date", selectedDate);
      if (statusFilter !== "ALL") q.set("status", statusFilter);

      const res = await apiFetch(`/api/reservations?${q.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReservations(data);
      }
    } catch {
      setMsg({ type: "error", text: "Failed to load reservations" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [selectedOutlet, selectedDate, statusFilter]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.phone.trim()) {
      setMsg({ type: "error", text: "Guest name and phone number are required." });
      return;
    }

    setActionLoading(true);
    try {
      // Combine date and time
      const dateTime = new Date(`${newForm.date}T${newForm.time}:00`);

      const res = await apiFetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: newForm.outletId || selectedOutlet || outlets[0]?.id,
          name: newForm.name,
          phone: newForm.phone,
          partySize: parseInt(newForm.partySize, 10) || 2,
          date: dateTime.toISOString(),
          notes: newForm.notes,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to create reservation" });
      } else {
        setMsg({ type: "success", text: `Reservation confirmed for ${newForm.name}` });
        setShowNewModal(false);
        setNewForm({
          name: "",
          phone: "",
          partySize: "2",
          date: selectedDate,
          time: "19:30",
          outletId: selectedOutlet || outlets[0]?.id || "",
          notes: "",
        });
        loadReservations();
      }
    } catch {
      setMsg({ type: "error", text: "Error booking reservation" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeatGuest = async () => {
    if (!seatingReservation || !selectedSeatTableId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEAT_RESERVATION",
          reservationId: seatingReservation.id,
          tableId: selectedSeatTableId,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to seat guest" });
      } else {
        setMsg({ type: "success", text: `Guest seated at Table ${j.seatedTable}` });
        setSeatingReservation(null);
        setSelectedSeatTableId("");
        loadReservations();
        onRefreshTables();
      }
    } catch {
      setMsg({ type: "error", text: "Error seating guest" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (reservationId: string, status: string) => {
    try {
      await apiFetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, status }),
      });
      loadReservations();
    } catch {
      setMsg({ type: "error", text: "Failed to update reservation status" });
    }
  };

  // Filter reservations by search
  const filteredReservations = reservations.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery);
    return matchSearch;
  });

  // Metrics
  const totalBookings = reservations.length;
  const bookedCount = reservations.filter((r) => r.status === "BOOKED").length;
  const seatedCount = reservations.filter((r) => r.status === "SEATED").length;
  const totalExpectedGuests = reservations.reduce((s, r) => s + (r.partySize || 2), 0);

  // Available tables suitable for seating
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

      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5EBE7] shadow-xs">
          <div className="text-xs font-semibold text-[#718078] flex items-center justify-between">
            <span>Today's Bookings</span>
            <CalendarIcon className="h-4 w-4 text-[#16845B]" />
          </div>
          <div className="text-2xl font-black text-[#172B25] mt-1">{totalBookings}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs bg-blue-50/20">
          <div className="text-xs font-semibold text-blue-800 flex items-center justify-between">
            <span>Awaiting Seating</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">{bookedCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs bg-emerald-50/20">
          <div className="text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>Currently Seated</span>
            <Utensils className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{seatedCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#E5EBE7] shadow-xs">
          <div className="text-xs font-semibold text-[#718078] flex items-center justify-between">
            <span>Expected Guests</span>
            <Users className="h-4 w-4 text-[#16845B]" />
          </div>
          <div className="text-2xl font-black text-[#172B25] mt-1">{totalExpectedGuests}</div>
        </div>
      </div>

      {/* Control Bar: Date Selector, Status Filter, Search, New Reservation */}
      <div className="bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedDate === new Date().toISOString().split("T")[0]
                ? "bg-[#172B25] text-white"
                : "bg-gray-100 text-[#718078] hover:text-[#172B25]"
            }`}
          >
            Today
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25] focus:outline-none focus:border-[#16845B]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          {["ALL", "BOOKED", "SEATED", "COMPLETED", "CANCELLED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                statusFilter === st
                  ? "bg-[#16845B] text-white font-bold"
                  : "bg-gray-100 text-[#718078] hover:text-[#172B25]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search & New Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest or phone..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B25] focus:outline-none focus:border-[#16845B]"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 bg-[#16845B] hover:bg-[#126b49] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Book Table</span>
          </button>
        </div>
      </div>

      {/* Reservations List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-[#718078]">Loading reservations...</div>
      ) : filteredReservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-md mx-auto">
          <CalendarIcon className="h-10 w-10 text-[#718078] opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#172B25]">No Reservations Found</h3>
          <p className="text-xs text-[#718078] mt-1">
            No reservations scheduled for {new Date(selectedDate).toLocaleDateString()}. Click "Book Table" above to schedule a guest.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Time & Date</th>
                  <th className="py-3 px-4">Guest Details</th>
                  <th className="py-3 px-4">Party Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {filteredReservations.map((r) => {
                  const rDate = new Date(r.date);
                  const isBooked = r.status === "BOOKED";
                  const isSeated = r.status === "SEATED";

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-[#172B25]">
                          {rDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[11px] text-[#718078]">
                          {rDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-[#172B25]">{r.name}</div>
                        <div className="text-[11px] text-[#718078] flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{r.phone || "No phone"}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-extrabold text-[#172B25] bg-gray-100 px-2 py-0.5 rounded-lg">
                          <Users className="h-3 w-3 text-[#16845B]" />
                          <span>{r.partySize} Guests</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isBooked
                              ? "bg-blue-100 text-blue-800"
                              : isSeated
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "CANCELLED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isBooked && (
                            <button
                              type="button"
                              onClick={() => {
                                setSeatingReservation(r);
                                setSelectedSeatTableId("");
                              }}
                              className="px-3 py-1 bg-[#16845B] hover:bg-[#126b49] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Utensils className="h-3 w-3" />
                              <span>Seat Guest</span>
                            </button>
                          )}

                          {isSeated && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(r.id, "COMPLETED")}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Complete
                            </button>
                          )}

                          {isBooked && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(r.id, "CANCELLED")}
                              className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition cursor-pointer"
                              title="Cancel Reservation"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seat Guest Dialog */}
      {seatingReservation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-[#E5EBE7] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#172B25]">
                Seat Guest: {seatingReservation.name}
              </h3>
              <button
                type="button"
                onClick={() => setSeatingReservation(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-[#718078] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-[#F4F6F5] p-3 rounded-2xl text-xs space-y-1">
              <div>Party Size: <strong>{seatingReservation.partySize} Guests</strong></div>
              <div>Phone: {seatingReservation.phone}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#172B25]">
                Select Available Dining Table
              </label>
              {availableTables.length === 0 ? (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  No available tables currently on the floor. Please free up a table first.
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
                onClick={() => setSeatingReservation(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSeatGuest}
                disabled={actionLoading || !selectedSeatTableId}
                className="flex-1 py-2 bg-[#16845B] hover:bg-[#126b49] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                {actionLoading ? "Seating..." : "Confirm Seating"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Reservation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden">
            <div className="p-4 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#16845B]/10 text-[#16845B]">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#172B25]">New Table Reservation</h3>
                  <p className="text-xs text-[#718078]">Book guest table slot in advance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-full hover:bg-gray-200 text-[#718078] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B25]">
                  Guest Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-bold text-[#172B25]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Party Size</label>
                  <select
                    value={newForm.partySize}
                    onChange={(e) => setNewForm({ ...newForm, partySize: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((num) => (
                      <option key={num} value={num}>
                        {num} Guests
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Date</label>
                  <input
                    type="date"
                    value={newForm.date}
                    onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#172B25]">Time</label>
                  <input
                    type="time"
                    value={newForm.time}
                    onChange={(e) => setNewForm({ ...newForm, time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B25]">Special Requests / Notes</label>
                <input
                  type="text"
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  placeholder="e.g. Birthday anniversary, high chair needed"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5EBE7] rounded-xl text-xs font-semibold text-[#172B25]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E5EBE7]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#172B25] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
