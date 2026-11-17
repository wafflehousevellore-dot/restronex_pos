import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { ArrowRight, Coffee, UtensilsCrossed, Zap, Cake, Pizza, IceCream, Store, Cloud } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant POS Solutions — Cafes, Fine Dining, QSR & Cloud Kitchens",
  description:
    "Tailored restaurant software for every format: QSR rapid billing, cafe barista KDS, fine-dining table management, bakery batch tracking, and cloud kitchen multi-brand routing.",
  alternates: {
    canonical: "https://www.restronexpos.com/solutions",
  },
  openGraph: {
    title: "Restaurant POS Solutions by Format | RestroNex",
    description: "Industry-specific restaurant workflows for cafes, QSRs, fine dining, pizzerias, and cloud kitchens.",
    url: "https://www.restronexpos.com/solutions",
  },
};

const solutions = [
  { slug: "cafes", title: "Cafe & Coffee Shop", desc: "Quick drink modifiers, loyalty cards, barista KOT screen.", icon: Coffee },
  { slug: "fine-dine", title: "Fine Dining & Bistros", desc: "Captain tableside ordering, course firing, seat split billing.", icon: UtensilsCrossed },
  { slug: "qsr", title: "QSR & Fast Food", desc: "3-second rapid billing, combos, token calling, bump KDS.", icon: Zap },
  { slug: "bakeries", title: "Bakery & Confectionery", desc: "Custom cake bookings, digital scale integration, batch expiry.", icon: Cake },
  { slug: "pizzerias", title: "Pizzerias & Italian", desc: "Half-and-half toppings matrix, crust upsells, oven dispatch.", icon: Pizza },
  { slug: "dessert-shops", title: "Dessert & Ice Cream", desc: "Scoops & toppings modifiers, waffle customizer, late rush UI.", icon: IceCream },
  { slug: "food-courts", title: "Food Courts & Hubs", desc: "Central billing counter, multi-stall split KOT, revenue audits.", icon: Store },
  { slug: "cloud-kitchens", title: "Cloud & Ghost Kitchens", desc: "Multi-brand single KDS, shared raw BOM, auto 86 item sold-out.", icon: Cloud },
];

export default function Solutions() {
  return (
    <PageShell
      title="Solutions for every restaurant format"
      subtitle="Tailored workflows while sharing one reliable menu, inventory, and billing core."
      badge="Solutions • 8 Formats"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {solutions.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.slug}
              href={`/solutions/${s.slug}`}
              className="rounded-2xl border border-[#E5EBE7] bg-white p-5 hover:border-[#16845B] hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#E5EBE7] grid place-items-center text-[#16845B] group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-bold text-[#172B25] group-hover:text-[#16845B] transition-colors">{s.title}</div>
                <div className="mt-1.5 text-xs leading-5 text-[#718078]">{s.desc}</div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#16845B] group-hover:translate-x-1 transition-transform">
                <span>Explore Workflow</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-8 rounded-2xl border border-[#E5EBE7] bg-white p-5 text-sm text-[#718078] shadow-xs">
        All solutions use the same authoritative menu & order model — no disconnected duplicate systems. Multi-outlet chains can mix different formats across outlets under one subscription.
      </div>
    </PageShell>
  );
}
