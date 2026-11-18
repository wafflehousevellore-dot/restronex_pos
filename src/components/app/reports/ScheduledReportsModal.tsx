"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  X,
  Mail,
  Calendar,
  Building2,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { ScheduledReportItem } from "@/app/api/reports/schedules/route";

interface ScheduledReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlets?: Array<{ id: string; name: string }>;
}

export function ScheduledReportsModal({ isOpen, onClose, outlets = [] }: ScheduledReportsModalProps) {
  const [schedules, setSchedules] = useState<ScheduledReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    reportType: "DAILY_SALES" as any,
    frequency: "DAILY" as any,
    deliveryTime: "23:00",
    recipientEmail: "",
    outletScope: "ALL",
  });

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/reports/schedules").then((r) => r.json());
      if (Array.isArray(res)) setSchedules(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSchedules();
      setShowAddForm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (id: string) => {
    await apiFetch("/api/reports/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TOGGLE", scheduleId: id }),
    });
    await loadSchedules();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this scheduled report automation?")) {
      await apiFetch("/api/reports/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE", scheduleId: id }),
      });
      await loadSchedules();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.recipientEmail) return;

    await apiFetch("/api/reports/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SAVE",
        schedule: {
          ...form,
          channel: "IN_APP",
          enabled: true,
        },
      }),
    });

    setShowAddForm(false);
    setForm({
      title: "",
      reportType: "DAILY_SALES",
      frequency: "DAILY",
      deliveryTime: "23:00",
      recipientEmail: "",
      outletScope: "ALL",
    });
    await loadSchedules();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-[#E5EBE7] shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172B25]">
                Automated Report Scheduling & Digest Dispatches
              </h3>
              <p className="text-xs text-[#718078]">
                Durable backend automated reports delivered to leadership and accountant inboxes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#718078] hover:bg-[#E5EBE7] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#172B25]">
              Active Schedules ({schedules.length})
            </span>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-8 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {showAddForm ? "Cancel Add" : "New Schedule"}
            </Button>
          </div>

          {/* Add Schedule Form */}
          {showAddForm && (
            <form onSubmit={handleSave} className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
              <h4 className="text-xs font-black text-purple-950">Add Scheduled Automation</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold text-[#172B25]">Schedule Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. End of Day Closing Summary"
                    className="mt-1 bg-white border-[#E5EBE7] text-xs h-8 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-[#172B25]">Report Type</Label>
                  <select
                    value={form.reportType}
                    onChange={(e) => setForm({ ...form, reportType: e.target.value as any })}
                    className="mt-1 w-full bg-white border border-[#E5EBE7] text-xs h-8 rounded-lg px-2 font-bold"
                  >
                    <option value="DAILY_SALES">Daily Sales & Z-Report</option>
                    <option value="LOW_STOCK">Morning Low Stock Alert</option>
                    <option value="WEEKLY_BUSINESS">Weekly Financial Summary</option>
                    <option value="DAY_END">Day-End Closing Digest</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] font-bold text-[#172B25]">Frequency</Label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                    className="mt-1 w-full bg-white border border-[#E5EBE7] text-xs h-8 rounded-lg px-2 font-bold"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-[#172B25]">Delivery Time</Label>
                  <Input
                    type="time"
                    value={form.deliveryTime}
                    onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                    className="mt-1 bg-white border-[#E5EBE7] text-xs h-8 rounded-lg font-bold"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-[#172B25]">Recipient Email</Label>
                  <Input
                    type="email"
                    value={form.recipientEmail}
                    onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                    placeholder="manager@restaurant.com"
                    className="mt-1 bg-white border-[#E5EBE7] text-xs h-8 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold gap-1"
                >
                  <Save className="h-3.5 w-3.5" /> Save Automation
                </Button>
              </div>
            </form>
          )}

          {/* Schedules List */}
          <div className="divide-y divide-[#E5EBE7] rounded-2xl border border-[#E5EBE7] bg-white overflow-hidden">
            {schedules.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#F8FAF9] transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#172B25]">{s.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        s.enabled ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {s.enabled ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#718078] flex items-center gap-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3" /> {s.frequency} at {s.deliveryTime}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Mail className="h-3 w-3" /> {s.recipientEmail}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggle(s.id)}
                    className="p-1.5 rounded-lg text-[#718078] hover:bg-[#E5EBE7] cursor-pointer"
                    title={s.enabled ? "Pause Schedule" : "Activate Schedule"}
                  >
                    {s.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="Delete Schedule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3 text-[11px] text-[#718078]">
            Automated reports are rendered and archived safely within RestroNex and dispatched via configured delivery channels.
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5EBE7] px-6 py-3 bg-[#F8FAF9] flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl border-[#E5EBE7] text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
