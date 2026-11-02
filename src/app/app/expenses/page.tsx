"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";

export default function Expenses() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ outletId: "", category: "Rent", amount: "", note: "" });
  const [outlets, setOutlets] = useState<any[]>([]);

  async function load() {
    const j = await apiFetch("/api/expenses").then((r) => r.json()).catch(() => []);
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

  async function add() {
    await apiFetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amountPaise: Math.round(parseFloat(form.amount || "0") * 100),
      }),
    });
    setForm({ ...form, amount: "", note: "" });
    load();
  }

  const total = list.reduce((s: any, l: any) => s + l.amountPaise, 0);

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Expenses & P&L</h1>
        <p className="text-xs text-[#718078] mt-1">Track operating expenditures, rent, staff costs, and daily cash outflow.</p>
      </div>

      <DarkCard>
        <DarkCardHeader>
          <DarkCardTitle className="text-base font-bold text-[#172B25]">Add Expense</DarkCardTitle>
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
            <Label className="text-xs font-semibold text-[#718078]">Category</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 text-sm text-[#172B25] focus:outline-none focus:border-[#16845B]"
            >
              <option>Rent</option>
              <option>Staff</option>
              <option>Utilities</option>
              <option>Marketing</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#718078]">Amount ₹</Label>
            <Input
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="5000"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25]"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#718078]">Note</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Monthly rent"
              className="mt-1 bg-white border-[#E5EBE7] text-[#172B25]"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={add}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] py-2.5 text-sm font-bold text-white transition shadow-xs"
            >
              Add
            </button>
          </div>
        </DarkCardContent>
      </DarkCard>

      <div className="grid sm:grid-cols-3 gap-4">
        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-sm font-bold text-[#718078]">Total Expense</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <div className="text-2xl font-black text-[#172B25]">{formatINR(total)}</div>
            <div className="text-xs text-[#718078] mt-1">Day-end P&L = sales - COGS - expense</div>
          </DarkCardContent>
        </DarkCard>
        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-sm font-bold text-[#718078]">Entries</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <div className="text-2xl font-black text-[#172B25]">{list.length}</div>
            <div className="text-xs text-[#718078] mt-1">Recorded expense line items</div>
          </DarkCardContent>
        </DarkCard>
        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-sm font-bold text-[#718078]">Night Audit</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <a href="/app/reports" className="text-sm font-bold text-[#16845B] hover:underline">
              View Night Audit Reports →
            </a>
          </DarkCardContent>
        </DarkCard>
      </div>

      <DarkCard>
        <DarkCardHeader>
          <DarkCardTitle className="text-base font-bold text-[#172B25]">Recent Entries</DarkCardTitle>
        </DarkCardHeader>
        <DarkCardContent className="space-y-2">
          {list.map((e) => (
            <div
              key={e.id}
              className="flex justify-between items-center rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-4 py-3"
            >
              <div>
                <div className="text-sm font-bold text-[#172B25]">
                  {e.category} • <span className="text-[#16845B]">{formatINR(e.amountPaise)}</span>
                </div>
                <div className="text-xs text-[#718078] mt-0.5">
                  {e.note || "—"} • {new Date(e.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className="text-xs text-[#718078] font-medium bg-white border border-[#E5EBE7] px-3 py-1 rounded-full">
                {e.outlet?.name || e.outletId.slice(0, 8)}
              </span>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-sm text-[#718078] text-center py-8 border border-dashed border-[#E5EBE7] rounded-xl">
              No expenses recorded yet.
            </div>
          )}
        </DarkCardContent>
      </DarkCard>
    </div>
  );
}
