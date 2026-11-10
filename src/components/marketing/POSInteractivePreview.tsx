"use client";

import React, { useState } from "react";
import {
  Store,
  QrCode,
  ChefHat,
  MessageSquare,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function POSInteractivePreview() {
  const [activeTab, setActiveTab] = useState<"billing" | "tables" | "kds" | "whatsapp">("billing");

  return (
    <div className="relative">
      {/* Interactive Mode Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-white border border-[#E5EBE7] rounded-2xl shadow-xs mb-3">
        <button
          onClick={() => setActiveTab("billing")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "billing"
              ? "bg-[#16845B] text-white shadow-2xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
          }`}
        >
          <Store className="h-3.5 w-3.5" />
          <span>POS Billing</span>
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "tables"
              ? "bg-[#16845B] text-white shadow-2xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>Tables & QR</span>
        </button>
        <button
          onClick={() => setActiveTab("kds")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "kds"
              ? "bg-[#16845B] text-white shadow-2xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
          }`}
        >
          <ChefHat className="h-3.5 w-3.5" />
          <span>KOT / KDS</span>
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "whatsapp"
              ? "bg-[#16845B] text-white shadow-2xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>WhatsApp Bill</span>
        </button>
      </div>

      {/* Preview Window Card */}
      <div className="rounded-[28px] border border-[#E5EBE7] bg-white p-4 sm:p-5 shadow-xl">
        {/* Window Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7] mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="ml-2 text-xs font-bold text-[#172B25]">RestroNex Live Console</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#16845B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16845B] animate-pulse" />
            Tenant Live Sync
          </span>
        </div>

        {/* TAB 1: POS BILLING */}
        {activeTab === "billing" && (
          <div className="grid grid-cols-[1.1fr_1.1fr] gap-3">
            <div className="space-y-2 bg-[#F8FAF9] p-3 rounded-2xl border border-[#E5EBE7]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Menu Catalog</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Paneer Tikka", price: "₹280", tag: "VEG" },
                  { name: "Butter Chicken", price: "₹360", tag: "NON-VEG" },
                  { name: "Dal Makhani", price: "₹240", tag: "VEG" },
                  { name: "Garlic Naan", price: "₹65", tag: "VEG" },
                ].map((item) => (
                  <div key={item.name} className="p-2 rounded-xl bg-white border border-[#E5EBE7] shadow-2xs">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        item.tag === "VEG" ? "bg-[#E8F5EE] text-[#16845B]" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {item.tag}
                    </span>
                    <div className="text-xs font-bold text-[#172B25] mt-1 truncate">{item.name}</div>
                    <div className="text-[11px] font-extrabold text-[#16845B] mt-0.5">{item.price}</div>
                  </div>
                ))}
              </div>
              <div className="p-2 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 text-[11px] font-bold text-[#16845B] text-center">
                + Tap to add to current order
              </div>
            </div>

            <div className="space-y-2 bg-white p-3 rounded-2xl border border-[#E5EBE7]">
              <div className="flex justify-between items-center text-xs font-bold text-[#172B25] border-b border-[#E5EBE7] pb-1.5">
                <span>Table T-04 (Order #1084)</span>
                <span className="text-[#16845B]">Dine-In</span>
              </div>
              <div className="space-y-1 text-xs text-[#718078]">
                <div className="flex justify-between">
                  <span>1x Butter Chicken</span>
                  <span className="font-semibold text-[#172B25]">₹360.00</span>
                </div>
                <div className="flex justify-between">
                  <span>2x Garlic Naan</span>
                  <span className="font-semibold text-[#172B25]">₹130.00</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E5EBE7] space-y-1 text-[11px] text-[#718078]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#172B25]">₹490.00</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (9% CGST + 9% SGST)</span>
                  <span className="font-semibold text-[#172B25]">₹88.20</span>
                </div>
                <div className="flex justify-between text-xs font-black text-[#172B25] pt-1 border-t border-dashed border-[#E5EBE7]">
                  <span>Total Payable</span>
                  <span className="text-[#16845B]">₹578.20</span>
                </div>
              </div>
              <button className="w-full py-2 rounded-xl bg-[#16845B] text-white text-xs font-bold shadow-2xs hover:bg-[#116B49] transition">
                Settle Bill & WhatsApp Receipt →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TABLES & QR */}
        {activeTab === "tables" && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { t: "T-01", status: "Available", color: "bg-white text-[#718078]" },
                { t: "T-02", status: "Occupied", color: "bg-[#16845B] text-white" },
                { t: "T-03", status: "KOT Fired", color: "bg-amber-100 text-amber-900 border-amber-300" },
                { t: "T-04", status: "Bill Ready", color: "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/30" },
              ].map((table) => (
                <div key={table.t} className={`p-2.5 rounded-xl border text-center font-bold text-xs ${table.color}`}>
                  <div>{table.t}</div>
                  <div className="text-[10px] font-medium mt-0.5">{table.status}</div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] flex items-center gap-3">
              <div className="h-14 w-14 bg-white rounded-xl border border-[#E5EBE7] p-1.5 grid place-items-center shadow-2xs">
                <QrCode className="h-10 w-10 text-[#172B25]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#172B25]">Contactless Table QR Token</div>
                <div className="text-[11px] text-[#718078]">
                  Guests scan from camera. No app download required. Real-time menu browsing with direct KOT submission.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KOT / KDS */}
        {activeTab === "kds" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-[#F8FAF9] border-2 border-[#16845B] space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-[#16845B]">
                <span>KOT #402 • Table 02</span>
                <span className="px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[10px]">PREPARING</span>
              </div>
              <div className="text-[11px] space-y-1 font-mono text-[#172B25]">
                <div>• 2x Paneer Butter Masala (Spicy)</div>
                <div>• 4x Butter Naan</div>
                <div>• 1x Jeera Rice</div>
              </div>
              <div className="pt-2 border-t border-[#E5EBE7] flex justify-between items-center text-[10px] text-[#718078]">
                <span className="flex items-center gap-1 font-bold text-amber-700">
                  <Clock className="h-3 w-3" /> 07:42 mins
                </span>
                <span className="font-bold text-[#16845B]">Main Kitchen Station</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#E5EBE7] space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-[#172B25]">
                <span>KOT #403 • Table 05</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]">BAR STATION</span>
              </div>
              <div className="text-[11px] space-y-1 font-mono text-[#172B25]">
                <div>• 2x Fresh Lime Soda (Sweet)</div>
                <div>• 1x Cold Brew Coffee</div>
              </div>
              <div className="pt-2 border-t border-[#E5EBE7] flex justify-between items-center text-[10px] text-[#718078]">
                <span className="flex items-center gap-1 font-bold text-emerald-700">
                  <Clock className="h-3 w-3" /> 02:15 mins
                </span>
                <span className="font-bold text-[#16845B]">Beverages</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WHATSAPP BILL */}
        {activeTab === "whatsapp" && (
          <div className="p-3 rounded-2xl bg-[#E8F5EE]/40 border border-[#16845B]/20 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#16845B]">
              <MessageSquare className="h-4 w-4" />
              <span>Official Meta WhatsApp Cloud API Delivery</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#E5EBE7] space-y-1 text-xs shadow-2xs font-sans">
              <div className="font-bold text-[#172B25]">RestroNex Dining • Vellore</div>
              <div className="text-[#718078] text-[11px]">
                Hi Rahul, thank you for dining with us! Here is your itemized digital tax invoice for Order #1084.
              </div>
              <div className="pt-1.5 flex items-center justify-between text-[11px] font-bold text-[#16845B]">
                <span>Invoice: INV-2026-0042 (₹578.20)</span>
                <span className="underline cursor-pointer">Download PDF</span>
              </div>
            </div>
            <div className="text-[10px] text-[#718078] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
              <span>Instant delivery with zero paper consumption and customer consent tracking.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
