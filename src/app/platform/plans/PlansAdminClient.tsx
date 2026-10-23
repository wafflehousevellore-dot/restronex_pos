"use client";

import { useState } from "react";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import { Edit2, Save, X, Check, ShieldCheck } from "lucide-react";

export default function PlansAdminClient({ initialPlans }: { initialPlans: any[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function startEdit(plan: any) {
    setEditingId(plan.id);
    setEditForm({
      priceMonthlyRupees: Math.round(plan.priceMonthlyPaise / 100),
      priceAnnualRupees: Math.round(plan.priceAnnualPaise / 100),
      maxOutlets: plan.maxOutlets,
      maxUsers: plan.maxUsers,
    });
    setMsg(null);
  }

  async function handleSave(planId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/subscription-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: planId,
          priceMonthlyPaise: editForm.priceMonthlyRupees * 100,
          priceAnnualPaise: editForm.priceAnnualRupees * 100,
          maxOutlets: editForm.maxOutlets,
          maxUsers: editForm.maxUsers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan");

      setPlans(plans.map((p) => (p.id === planId ? data.plan : p)));
      setEditingId(null);
      setMsg("Plan updated successfully ✓");
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-white">Subscription Plans Management</h1>
          <p className="text-xs text-white/50">Configure pricing, outlet allowances, and staff account limits across the platform.</p>
        </div>
        {msg && <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">{msg}</span>}
      </div>

      <div className="grid gap-4">
        {plans.map((p) => {
          const isEditing = editingId === p.id;

          return (
            <DarkCard key={p.id}>
              <DarkCardContent className="pt-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{p.name}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">
                        {p.slug}
                      </span>
                    </div>

                    {!isEditing ? (
                      <div className="text-xs text-white/60 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Monthly: <b className="text-white">{formatINR(p.priceMonthlyPaise)}</b>
                        </span>
                        <span>
                          Annual: <b className="text-white">{formatINR(p.priceAnnualPaise)}</b>
                        </span>
                        <span>
                          Max Outlets: <b className="text-white">{p.maxOutlets}</b>
                        </span>
                        <span>
                          Max Staff: <b className="text-white">{p.maxUsers}</b>
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="block text-white/50 text-[10px] mb-1">Monthly (₹)</label>
                          <input
                            type="number"
                            value={editForm.priceMonthlyRupees}
                            onChange={(e) => setEditForm({ ...editForm, priceMonthlyRupees: Number(e.target.value) })}
                            className="w-full bg-white/10 border border-white/20 rounded px-2.5 py-1 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 text-[10px] mb-1">Annual (₹)</label>
                          <input
                            type="number"
                            value={editForm.priceAnnualRupees}
                            onChange={(e) => setEditForm({ ...editForm, priceAnnualRupees: Number(e.target.value) })}
                            className="w-full bg-white/10 border border-white/20 rounded px-2.5 py-1 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 text-[10px] mb-1">Max Outlets</label>
                          <input
                            type="number"
                            value={editForm.maxOutlets}
                            onChange={(e) => setEditForm({ ...editForm, maxOutlets: Number(e.target.value) })}
                            className="w-full bg-white/10 border border-white/20 rounded px-2.5 py-1 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 text-[10px] mb-1">Max Users</label>
                          <input
                            type="number"
                            value={editForm.maxUsers}
                            onChange={(e) => setEditForm({ ...editForm, maxUsers: Number(e.target.value) })}
                            className="w-full bg-white/10 border border-white/20 rounded px-2.5 py-1 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="rounded-full bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Plan</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleSave(p.id)}
                          className="rounded-full bg-[#3D954F] hover:bg-[#338a44] text-white px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Save className="h-3 w-3" />
                          <span>{saving ? "Saving..." : "Save"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-full bg-white/10 hover:bg-white/20 text-white/70 px-2.5 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </DarkCardContent>
            </DarkCard>
          );
        })}
      </div>
    </div>
  );
}
