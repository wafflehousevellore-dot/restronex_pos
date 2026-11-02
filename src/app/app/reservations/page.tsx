"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function Reservations() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ outletId: "", date: "", partySize: "2", name: "", phone: "" });
  const [outlets, setOutlets] = useState<any[]>([]);

  async function load() {
    const j = await apiFetch("/api/reservations").then((r) => r.json()).catch(() => []);
    if (Array.isArray(j)) setList(j);
  }

  async function loadOutlets() {
    const o = await apiFetch("/api/outlets").then((r) => r.json()).catch(() => []);
    if (Array.isArray(o)) setOutlets(o);
  }

  useEffect(() => {
    load();
    loadOutlets();
  }, []);

  async function create() {
    await apiFetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        partySize: parseInt(form.partySize || "2"),
        date: form.date || new Date().toISOString(),
      }),
    });
    load();
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Reservations — Table Reservation Manager</h1>
        <p className="text-xs text-[#718078] mt-1">Manage guest party bookings, table allocations, and SMS confirmation.</p>
      </div>

      <DarkCard>
        <DarkCardHeader>
          <DarkCardTitle className="text-base font-bold text-[#172B25]">New Reservation</DarkCardTitle>
        </DarkCardHeader>
        <DarkCardContent className="grid sm:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs font-semibold text-[#718078]">Outlet</Label>
            <select
              value={form.outletId}
              onChange={(e) => setForm({ ...form, outletId: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-sm text-[#172B25] focus:outline-none focus:border-[#16845B]"
            >
              <option value="">Select</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#718078]">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Amit"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25]"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#718078]">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25]"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#718078]">Party</Label>
            <Input
              value={form.partySize}
              onChange={(e) => setForm({ ...form, partySize: e.target.value })}
              type="number"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25]"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={create}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] py-2.5 text-sm font-bold text-white transition shadow-xs"
            >
              Book
            </button>
          </div>
        </DarkCardContent>
      </DarkCard>

      <DarkCard>
        <DarkCardHeader>
          <DarkCardTitle className="text-base font-bold text-[#172B25]">Upcoming — {list.length}</DarkCardTitle>
        </DarkCardHeader>
        <DarkCardContent className="space-y-2">
          {list.map((r) => (
            <div
              key={r.id}
              className="flex justify-between items-center rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-4 py-3"
            >
              <div>
                <div className="text-sm font-bold text-[#172B25]">
                  {r.name} • {r.partySize} pax •{" "}
                  <span className="text-[#16845B] font-semibold">{r.status}</span>
                </div>
                <div className="text-xs text-[#718078] mt-0.5">
                  {r.phone} • {new Date(r.date).toLocaleString()}
                </div>
              </div>
              <span className="text-xs rounded-full bg-white border border-[#E5EBE7] px-3 py-1 font-medium text-[#718078]">
                {r.outlet?.name || r.outletId.slice(0, 8)}
              </span>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-sm text-[#718078] text-center py-8 border border-dashed border-[#E5EBE7] rounded-xl">
              No reservations found. Book an entry above.
            </div>
          )}
        </DarkCardContent>
      </DarkCard>
    </div>
  );
}
