"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, BarChart3, QrCode, ChefHat, CheckCircle2, ArrowRight } from "lucide-react";

export default function MarketplaceAddonsSection() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const modules = [
    {
      id: "crm",
      tabTitle: "CRM & Loyalty",
      icon: Users,
      badge: "Customer Retention",
      title: "Intelligent Guest CRM & Automated Loyalty Engine",
      description:
        "Every bill settlement automatically profiles the guest by mobile number. Trigger automated WhatsApp welcome discounts, cashback loyalty points, birthday specials, and targeted win-back campaigns without manual effort.",
      metric: "+34% Repeat Diner Retention",
      features: [
        "Automated phone-number capture at cashier checkout",
        "Configurable cashback points per ₹100 spent",
        "Direct WhatsApp campaign broadcast with opt-in compliance",
        "VIP customer spending analytics & visit frequency tags",
      ],
      previewHeadline: "Loyalty Tier Automation",
      previewItems: [
        { label: "Rahul Verma (Gold Tier)", detail: "14 Visits • ₹18,420 spent", points: "420 Pts" },
        { label: "Pooja Hegde (Silver Tier)", detail: "6 Visits • ₹7,850 spent", points: "150 Pts" },
        { label: "Arjun Nair (Platinum Tier)", detail: "28 Visits • ₹42,100 spent", points: "980 Pts" },
      ],
      ctaLink: "/features/crm",
      ctaText: "Explore CRM & Loyalty",
    },
    {
      id: "analytics",
      tabTitle: "80+ Reports",
      icon: BarChart3,
      badge: "Enterprise Insights",
      title: "Real-Time Restaurant Analytics & Financial P&L",
      description:
        "Replace messy spreadsheets with 80+ granular, audit-ready reports. Track hour-by-hour sales velocity, raw material food cost variance, day-end cash drawer balances, and staff sales performance in real time.",
      metric: "<5 Min Day-End Settlement",
      features: [
        "Hourly rush patterns with peak-hour labor recommendations",
        "Food cost % variance against theoretical Bill-of-Materials recipes",
        "Audited day-end cash vs card vs UPI reconciliation ledgers",
        "Exportable Excel, CSV, and PDF summaries ready for your CA",
      ],
      previewHeadline: "Today's Gross Sales & Margin",
      previewItems: [
        { label: "Net Dining Sales", detail: "412 orders processed", points: "₹1,48,250" },
        { label: "Food Cost % (Actual)", detail: "Theoretical BOM: 27.2%", points: "28.4%" },
        { label: "Average Table Ticket", detail: "Turnover time: 42 mins", points: "₹890" },
      ],
      ctaLink: "/features/analytics",
      ctaText: "Explore 80+ Reports",
    },
    {
      id: "qr",
      tabTitle: "Table QR & Service",
      icon: QrCode,
      badge: "Tableside Speed",
      title: "Contactless QR Ordering & Digital Waiter Calling",
      description:
        "Empower dine-in guests to scan a dynamic table QR code, browse photo-rich menus, customize spice levels and dietary modifiers, and place orders directly to the kitchen without waiting for a waiter.",
      metric: "40% Faster Table Turnaround",
      features: [
        "High-resolution table-specific QR codes with instant print templates",
        "Zero-app browser menu with live veg/non-veg dietary filters",
        "Digital 'Call Waiter' & 'Request Water' buttons wired to POS",
        "Seamless UPI scan-and-pay at table to eliminate bill wait time",
      ],
      previewHeadline: "Live Table Session — Table 08",
      previewItems: [
        { label: "Guest Scanned QR", detail: "Mobile session active", points: "12:42 PM" },
        { label: "Items Added to Cart", detail: "Paneer Tikka, Garlic Naan (2)", points: "₹598" },
        { label: "Order Fired to Kitchen", detail: "KOT #149 auto-routed", points: "12:45 PM" },
      ],
      ctaLink: "/features/qr-ordering",
      ctaText: "Explore QR Ordering",
    },
    {
      id: "kitchen",
      tabTitle: "Kitchen Display (KDS)",
      icon: ChefHat,
      badge: "Kitchen Automation",
      title: "Multi-Station Kitchen Display Screens & Station Routing",
      description:
        "Route appetizers to the grill station, beverages to the bar counter, and desserts to the bakery display. Eliminate lost paper tickets with color-coded preparation timers and real-time status alerts.",
      metric: "0% Kitchen Ticket Loss",
      features: [
        "Station-specific screen routing (Tandoor, Curry, Chinese, Bar)",
        "Preparation timers with green-yellow-red warning thresholds",
        "Course firing support (Hold Main Course until Appetizers served)",
        "Chef bump-bar or touchscreen order completion updates to captains",
      ],
      previewHeadline: "Active Kitchen Station Tickets",
      previewItems: [
        { label: "Ticket #142 (Table 04)", detail: "Dal Makhani, Butter Naan", points: "04:12 mins" },
        { label: "Ticket #143 (Parcel / QSR)", detail: "Chicken Biryani Box x2", points: "08:30 mins" },
        { label: "Ticket #144 (Table 12)", detail: "Paneer Lababdar, Jeera Rice", points: "01:45 mins" },
      ],
      ctaLink: "/features/kitchen-display",
      ctaText: "Explore KDS Operations",
    },
  ];

  const activeModule = modules[activeTab];

  return (
    <section className="py-20 bg-[#F8FAF9] border-b border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
            APP MARKETPLACE & ADD-ONS
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#172B25] tracking-tight">
            Add-ons to Supercharge Your Restaurant POS
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#718078] leading-relaxed">
            Plug in specialized modules that elevate customer experience, streamline back-of-house operations, and maximize revenue.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            const isSelected = activeTab === idx;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(idx)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                  isSelected
                    ? "bg-[#16845B] text-white shadow-md shadow-[#16845B]/20 scale-[1.02]"
                    : "bg-white text-[#718078] border border-[#E5EBE7] hover:border-[#16845B]/40 hover:text-[#172B25]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-[#16845B]"}`} />
                <span>{mod.tabTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Active Content Showcase */}
        <div className="mt-10 rounded-3xl bg-white border border-[#E5EBE7] p-6 sm:p-10 shadow-xs">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#16845B] mb-4">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{activeModule.badge}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#172B25] leading-snug">
                {activeModule.title}
              </h3>
              <p className="mt-4 text-sm text-[#718078] leading-relaxed">
                {activeModule.description}
              </p>

              <div className="mt-6 space-y-2.5">
                {activeModule.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2.5 text-xs font-medium text-[#172B25]">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={activeModule.ctaLink}
                  className="rounded-full bg-[#16845B] px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs flex items-center gap-2"
                >
                  <span>{activeModule.ctaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] px-3.5 py-2 rounded-full border border-[#16845B]/20">
                  ⚡ Impact: {activeModule.metric}
                </div>
              </div>
            </div>

            {/* Interactive Preview Panel */}
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 sm:p-6 shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7]">
                <div className="text-xs font-bold text-[#172B25] flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16845B] animate-pulse" />
                  <span>{activeModule.previewHeadline}</span>
                </div>
                <span className="text-[11px] font-mono text-[#718078]">Live System Preview</span>
              </div>

              <div className="mt-4 space-y-3">
                {activeModule.previewItems.map((item, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] flex items-center justify-between hover:border-[#16845B]/40 transition-colors shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#172B25]">{item.label}</div>
                      <div className="text-[11px] text-[#718078] mt-0.5">{item.detail}</div>
                    </div>
                    <span className="text-xs font-extrabold text-[#16845B] bg-[#E8F5EE] px-3 py-1 rounded-full">
                      {item.points}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-xl bg-[#E8F5EE]/60 border border-[#16845B]/20 text-[11px] text-[#172B25] flex items-center justify-between">
                <span>Enterprise grade module with instant activation</span>
                <span className="font-bold text-[#16845B]">Plug & Play</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
