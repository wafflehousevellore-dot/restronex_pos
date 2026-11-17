import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminate paper KOTs and run fast tableside order punching directly to your kitchen.",
  description: "Eliminate paper KOTs and run fast tableside order punching directly to your kitchen. Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/waiter-ordering",
  },
  openGraph: {
    title: "Eliminate paper KOTs and run fast tableside order punching directly to your kitchen. | RestroNex",
    description: "Eliminate paper KOTs and run fast tableside order punching directly to your kitchen. Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/features/waiter-ordering",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { Smartphone, Check, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function WaiterOrderingPage() {
  const capabilities = [
    { title: "Mobile & Tablet Tableside Punching", desc: "Equip floor captains and stewards with handheld smartphones or 8-inch tablets to take orders directly at the guest's table." },
    { title: "Direct Kitchen Routing (KOT)", desc: "Items fire immediately to respective prep stations (Main Kitchen, Bar, Bakery) the instant the waiter confirms the table order." },
    { title: "Instant Table Assignment & Transfers", desc: "Assign stewards to dedicated floor zones (AC Hall, Terrace, Outdoor). Seamlessly shift orders or merge tables when guests relocate." },
    { title: "Modifiers & Special Cooking Notes", desc: "Record spice levels, gluten-free tags, dressing choices, and custom chef instructions with one tap to avoid verbal miscommunications." },
    { title: "Real-Time Dish Availability & 86ing", desc: "Kitchen staff marking an ingredient out of stock instantly grays out the dish on every captain's device in real-time." },
    { title: "Running Table Total & Bill Estimate", desc: "Stewards can review active course statuses, total bill amount in paise, and print draft bills directly from tableside." },
  ];

  const workflow = [
    "Captain approaches Table → selects table number on handheld interface",
    "Browse categorized menu or rapid-search by item code / name",
    "Select variants & specific modifiers (extra cheese, no onion)",
    "Tap 'Send to Kitchen' → Instant digital KOT dispatched to KDS & thermal printers",
    "Repeat additions as guests order desserts or beverages throughout the meal",
  ];

  return (
    <PageShell
      title="Waiter & Captain Handheld Ordering"
      subtitle="Eliminate paper KOTs and run fast tableside order punching directly to your kitchen."
      badge="Handheld Operations • RestroNex"
    >
      <div className="space-y-10">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-[#16845B] font-bold text-sm mb-3">
              <Smartphone className="h-5 w-5" />
              <span>Tableside Speed & Accuracy</span>
            </div>
            <h2 className="text-xl font-bold text-[#172B25]">Empower Your Stewards On The Floor</h2>
            <p className="mt-2 text-sm text-[#718078] leading-relaxed">
              RestroNex Captain App works on standard Android smartphones, iPhones, and tablets. It eliminates round-trips to the billing terminal, drastically speeding up table turnaround times.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {capabilities.map((c) => (
                <div key={c.title} className="p-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#172B25]">
                    <Check className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>{c.title}</span>
                  </div>
                  <p className="text-xs text-[#718078] leading-relaxed pl-6">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#16845B] font-bold text-xs uppercase tracking-wider mb-2">
                <Zap className="h-4 w-4" /> Operational Flow
              </div>
              <h3 className="text-lg font-bold text-[#172B25]">Tableside to Kitchen in Under 5 Seconds</h3>
              <ol className="mt-5 space-y-3 pl-2">
                {workflow.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-[#718078]">
                    <span className="h-6 w-6 rounded-full bg-[#E8F5EE] text-[#16845B] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E5EBE7] space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#16845B] font-semibold">
                <ShieldCheck className="h-4 w-4" /> Role-Based Access Enforced Server-Side
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs inline-flex items-center gap-1.5"
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
