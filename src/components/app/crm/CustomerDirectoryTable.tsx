"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  UserPlus,
  RefreshCw,
  Phone,
  Mail,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  Award,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomerDirectoryTableProps {
  customers: any[];
  loading: boolean;
  onRefresh: () => void;
  onSelectCustomer: (id: string) => void;
  onEditCustomer: (customer: any) => void;
  onAddCustomer: () => void;
  outlets?: { id: string; name: string }[];
}

const SEGMENTS = [
  { key: "ALL", label: "All Diners" },
  { key: "VIP", label: "VIP Guests" },
  { key: "REGULAR", label: "Regulars" },
  { key: "NEW", label: "New Diners" },
  { key: "AT_RISK", label: "At Risk" },
  { key: "CHURNED", label: "Churned" },
];

export function CustomerDirectoryTable({
  customers,
  loading,
  onRefresh,
  onSelectCustomer,
  onEditCustomer,
  onAddCustomer,
  outlets = [],
}: CustomerDirectoryTableProps) {
  const [search, setSearch] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("ALL");
  const [selectedOutlet, setSelectedOutlet] = useState("");

  const filtered = customers.filter((c) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchTags = Array.isArray(c.tags) && c.tags.some((t: string) => t.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchEmail && !matchTags) return false;
    }

    // Segment filter
    if (selectedSegment !== "ALL" && c.segment !== selectedSegment) {
      return false;
    }

    // Outlet filter
    if (selectedOutlet && c.preferredOutletId !== selectedOutlet) {
      return false;
    }

    return true;
  });

  const handleExportCsv = () => {
    const url = `/api/customers?export=csv${selectedSegment !== "ALL" ? `&segment=${selectedSegment}` : ""}${
      selectedOutlet ? `&outletId=${selectedOutlet}` : ""
    }${search.trim() ? `&q=${encodeURIComponent(search.trim())}` : ""}`;
    window.open(url, "_blank");
  };

  const getSegmentBadgeColor = (segment: string) => {
    switch (segment) {
      case "VIP":
        return "bg-purple-100 text-purple-900 border-purple-300";
      case "REGULAR":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "NEW":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "AT_RISK":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "CHURNED":
        return "bg-rose-100 text-rose-900 border-rose-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, tags..."
            className="pl-9 bg-white border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25] shadow-2xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Outlet filter */}
          {outlets.length > 0 && (
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="bg-white border border-[#E5EBE7] text-xs h-9 rounded-xl px-3 text-[#172B25] shadow-2xs focus:outline-hidden"
            >
              <option value="">All Outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 rounded-xl border-[#E5EBE7] bg-white text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs cursor-pointer gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-[#16845B]" /> Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 w-9 p-0 rounded-xl border-[#E5EBE7] bg-white text-xs font-bold hover:bg-[#F8FAF9] shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 text-[#718078] ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            size="sm"
            onClick={onAddCustomer}
            className="h-9 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-4 shadow-xs cursor-pointer gap-1.5"
          >
            <UserPlus className="h-4 w-4" /> Add Diner
          </Button>
        </div>
      </div>

      {/* Segment Pill Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSelectedSegment(seg.key)}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer border ${
              selectedSegment === seg.key
                ? "bg-[#172B25] text-white border-[#172B25]"
                : "bg-white text-[#718078] border-[#E5EBE7] hover:border-[#718078]/40"
            }`}
          >
            {seg.label}
          </button>
        ))}
        <span className="text-xs text-[#718078] font-medium ml-auto pl-2 whitespace-nowrap">
          Showing <b>{filtered.length}</b> of <b>{customers.length}</b> diners
        </span>
      </div>

      {/* Diners Table Card */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Diner Name & Contact</th>
                <th className="py-3 px-3">Tier & Segment</th>
                <th className="py-3 px-3">Visits & Spend</th>
                <th className="py-3 px-3">Loyalty Balance</th>
                <th className="py-3 px-3">WhatsApp Consents</th>
                <th className="py-3 px-3">Tags & Preferences</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-[#718078] animate-pulse">
                    Loading customer directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-[#718078]">
                    No diners match the selected search and segment filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#F8FAF9]/70 transition-colors group cursor-pointer"
                    onClick={() => onSelectCustomer(c.id)}
                  >
                    {/* Name & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EE] text-[#16845B] font-black text-xs">
                          {c.name ? c.name.charAt(0).toUpperCase() : "G"}
                        </div>
                        <div>
                          <div className="font-bold text-[#172B25] group-hover:text-[#16845B] transition">
                            {c.name || "Guest Customer"}
                          </div>
                          <div className="text-[11px] text-[#718078] font-medium flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-3 w-3" /> {c.phone}
                            </span>
                            {c.email && (
                              <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                                <Mail className="h-3 w-3" /> {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tier & Segment */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        {c.tier && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${c.tier.color}`}
                          >
                            {c.tier.badge}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${getSegmentBadgeColor(
                            c.segment
                          )}`}
                        >
                          {c.segment}
                        </span>
                      </div>
                    </td>

                    {/* Visits & Spend */}
                    <td className="py-3.5 px-3">
                      <div className="font-black text-[#172B25]">
                        ₹{Math.round((c.totalSpentPaise || 0) / 100).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-[#718078] font-medium">
                        {c.visitCount || 0} visits
                      </div>
                    </td>

                    {/* Loyalty Points */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 font-black text-amber-900">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                        <span>{c.loyaltyPoints || 0} pts</span>
                      </div>
                      <div className="text-[10px] text-[#718078]">
                        Worth ₹{c.loyaltyPoints || 0}
                      </div>
                    </td>

                    {/* WhatsApp Consents */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            c.whatsappOptIn === false ? "text-red-700" : "text-[#16845B]"
                          }`}
                        >
                          {c.whatsappOptIn === false ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Bills {c.whatsappOptIn === false ? "Opt-Out" : "Enabled"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            c.marketingOptIn ? "text-emerald-700" : "text-[#718078]"
                          }`}
                        >
                          {c.marketingOptIn ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          Marketing {c.marketingOptIn ? "Opt-In" : "Disabled"}
                        </span>
                      </div>
                    </td>

                    {/* Tags */}
                    <td className="py-3.5 px-3">
                      {c.tags && c.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {c.tags.slice(0, 2).map((t: string) => (
                            <span
                              key={t}
                              className="rounded-full bg-[#F8FAF9] border border-[#E5EBE7] px-2 py-0.5 text-[10px] font-bold text-[#172B25]"
                            >
                              #{t}
                            </span>
                          ))}
                          {c.tags.length > 2 && (
                            <span className="text-[10px] text-[#718078] font-bold">
                              +{c.tags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#718078] italic">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCustomer(c.id)}
                          className="h-8 w-8 p-0 text-[#718078] hover:text-[#16845B] hover:bg-[#E8F5EE] rounded-lg cursor-pointer"
                          title="View Dossier"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditCustomer(c)}
                          className="h-8 w-8 p-0 text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] rounded-lg cursor-pointer"
                          title="Edit Profile"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
