"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Store,
  Users,
  Receipt,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Printer,
  ChefHat,
  Clock,
  TrendingUp,
} from "lucide-react";

export interface EcosystemProduct {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  exploreHref: string;
  features: string[];
  mockup: {
    title: string;
    status: string;
    metricLabel: string;
    metricValue: string;
    details: { label: string; value: string; highlight?: boolean }[];
  };
}

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  {
    id: "pos",
    name: "RestroNex POS",
    badge: "RESTAURANT OS CORE",
    tagline: "Restaurant POS software made simple!",
    description:
      "Manage all front-of-house and back-of-house restaurant operations efficiently. Accelerate table turns, fire instant kitchen orders, and grow your brand like a real boss.",
    exploreHref: "/poss",
    features: [
      "3-Click Fast Counter & Dine-in Billing",
      "Interactive Table Layout & Floor Plan Management",
      "Real-time Digital KOT Routing to Kitchen Stations",
      "Native ESC/POS Thermal Printing (58mm & 80mm)",
    ],
    mockup: {
      title: "Terminal 01 • Main Dining Floor",
      status: "LIVE SERVICE",
      metricLabel: "Active Dining Orders",
      metricValue: "18 Tables Occupied",
      details: [
        { label: "Table 04", value: "Bill Generated • ₹1,450", highlight: true },
        { label: "Table 08", value: "KOT Fired • 3 Items Pending" },
        { label: "Table 12", value: "Dining • 28 mins in service" },
        { label: "Counter QSR", value: "Paid via UPI • Inv #1042" },
      ],
    },
  },
  {
    id: "shiftpro",
    name: "Staff & ShiftPro",
    badge: "WORKFORCE AUTOMATION",
    tagline: "Make your staff and shift problems disappear.",
    description:
      "Effortless biometric and PIN attendance, shift rosters, role-based access permissions, waiter order assignment, and real-time cashier drawer reconciliation.",
    exploreHref: "/features/staff-management",
    features: [
      "Cashier Drawer Opening & Closing Day-End Balances",
      "Outlet-Scoped Staff Role & Permission Controls",
      "Real-Time Waiter & Kitchen Attendance Tracking",
      "Shift Activity Logs & Audit Trail Verification",
    ],
    mockup: {
      title: "Shift Overview • Morning Shift Roster",
      status: "ALL SHIFTS ACTIVE",
      metricLabel: "Staff On Duty",
      metricValue: "12 / 12 Checked In",
      details: [
        { label: "Cashier Shift", value: "Drawer Balanced • 100% Match", highlight: true },
        { label: "Head Chef", value: "KDS Station Assigned" },
        { label: "Floor Captain", value: "Tables 01-10 Allocated" },
        { label: "Delivery Lead", value: "Aggregator Dispatch Ready" },
      ],
    },
  },
  {
    id: "invoice",
    name: "GST & Inventory OS",
    badge: "FINANCIAL & RAW STOCK",
    tagline: "GST billing & inventory software for modern food businesses.",
    description:
      "Enjoy lightning-fast billing, automatic recipe-level raw ingredient auto-deduction, low-stock threshold alerts, and compliant B2B tax invoices.",
    exploreHref: "/features/inventory",
    features: [
      "Recipe Bill of Materials (BOM) Auto-Depletion",
      "Minor-Unit Integer Paise GST & Tax Compliance",
      "Automated WhatsApp e-Bill & Direct PDF Invoicing",
      "Purchase Order Ingestion & Vendor Ledger Tracking",
    ],
    mockup: {
      title: "Inventory Ledger • Central Store",
      status: "AUTO-SYNC ACTIVE",
      metricLabel: "Ingredients Tracked",
      metricValue: "248 Items Monitored",
      details: [
        { label: "Paneer Stock", value: "14.2 kg • Normal Threshold" },
        { label: "Dairy Cream", value: "2.1 L • Low Stock Alert!", highlight: true },
        { label: "Espresso Beans", value: "8.5 kg • Reorder Scheduled" },
        { label: "Day-End P&L", value: "Gross Margin: 68.4%" },
      ],
    },
  },
  {
    id: "opstrack",
    name: "Kitchen & Task Ops",
    badge: "KITCHEN & STANDARDS",
    tagline: "Automate your day-to-day restaurant kitchen tasks.",
    description:
      "Interactive multi-station KDS displays, digital recipe cards, food prep timers, shift handover checklists, and opening/closing verification protocols from a single screen.",
    exploreHref: "/features/kitchen-display",
    features: [
      "Multi-Station KDS Routing (Hot Kitchen, Pantry, Bar)",
      "Color-Coded Prep Timers & Ticket Aging Alerts",
      "Digital Opening & Closing Shift Quality Checklists",
      "One-Tap 'Food Ready' Chime & Waiter Notification",
    ],
    mockup: {
      title: "KDS Station 1 • Main Hot Kitchen",
      status: "STREAMING ORDERS",
      metricLabel: "Average Prep Time",
      metricValue: "8 mins 42 secs",
      details: [
        { label: "Ticket #204", value: "Butter Naan x4 • Ready in 2m" },
        { label: "Ticket #205", value: "Dal Makhani • Cooked & Plated", highlight: true },
        { label: "Ticket #206", value: "Paneer Tikka • In Tandoor" },
        { label: "Food Chime", value: "Audio Chime Sent to Captain" },
      ],
    },
  },
];

export default function ProductEcosystemSlider() {
  const [activeTab, setActiveTab] = useState<string>("pos");
  const activeProduct = ECOSYSTEM_PRODUCTS.find((p) => p.id === activeTab) || ECOSYSTEM_PRODUCTS[0];

  return (
    <section className="py-16 sm:py-20 bg-white border-b border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>UNIFIED RESTAURANT ECOSYSTEM</span>
          </div>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-[#172B25]">
            All-in-One Software Powering Restaurant Growth At Every Step
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#718078] leading-relaxed">
            Stay ahead of rush hours with solutions designed for high volume, zero downtime, and seamless coordination from counter to kitchen.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          {ECOSYSTEM_PRODUCTS.map((prod) => {
            const isActive = prod.id === activeTab;
            return (
              <button
                key={prod.id}
                onClick={() => setActiveTab(prod.id)}
                className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs ${
                  isActive
                    ? "bg-[#16845B] text-white shadow-md scale-[1.02]"
                    : "bg-[#F8FAF9] text-[#718078] hover:text-[#172B25] hover:bg-[#E8F5EE]/60 border border-[#E5EBE7]"
                }`}
              >
                {prod.id === "pos" && <Store className="h-4 w-4" />}
                {prod.id === "shiftpro" && <Users className="h-4 w-4" />}
                {prod.id === "invoice" && <Receipt className="h-4 w-4" />}
                {prod.id === "opstrack" && <ClipboardCheck className="h-4 w-4" />}
                <span>{prod.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Product Panel */}
        <div className="mt-8 rounded-3xl border border-[#E5EBE7] bg-[#F8FAF9] p-6 sm:p-10 shadow-xs">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#16845B]">
                  {activeProduct.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#172B25] leading-tight">
                  {activeProduct.tagline}
                </h3>
                <p className="text-sm leading-relaxed text-[#718078]">
                  {activeProduct.description}
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {activeProduct.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-[#172B25]">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Link href={activeProduct.exploreHref}>
                  <button className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 py-3 text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer">
                    <span>Explore {activeProduct.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link href="/book-demo">
                  <button className="rounded-full border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] text-[#172B25] px-5 py-3 text-xs sm:text-sm font-semibold transition shadow-2xs cursor-pointer">
                    Book a Free Demo
                  </button>
                </Link>
              </div>
            </div>

            {/* Right Mockup Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 sm:p-6 shadow-xl space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7]">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-[#172B25]">
                      {activeProduct.mockup.title}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B] text-[10px] font-bold px-2.5 py-0.5">
                    {activeProduct.mockup.status}
                  </span>
                </div>

                {/* Key Metric Banner */}
                <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-[#718078]">
                      {activeProduct.mockup.metricLabel}
                    </div>
                    <div className="text-lg font-black text-[#172B25]">
                      {activeProduct.mockup.metricValue}
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white border border-[#E5EBE7] text-[#16845B] grid place-items-center shadow-2xs">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>

                {/* Live Activity Stream */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                    Live Operational Activity
                  </div>
                  <div className="space-y-2">
                    {activeProduct.mockup.details.map((item, dIdx) => (
                      <div
                        key={dIdx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          item.highlight
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold"
                            : "bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25]"
                        }`}
                      >
                        <span className="font-semibold">{item.label}</span>
                        <span className={item.highlight ? "text-[#16845B]" : "text-[#718078]"}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Status */}
                <div className="pt-2 border-t border-[#E5EBE7] flex items-center justify-between text-[11px] text-[#718078]">
                  <span>RestroNex Cloud Core Sync</span>
                  <span className="text-[#16845B] font-bold">● Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
