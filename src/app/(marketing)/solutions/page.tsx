import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { ArrowRight, Coffee, UtensilsCrossed, Zap, Cake, Pizza, IceCream, Store, Cloud } from "lucide-react";

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
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur hover:bg-white/10 hover:border-[#3D954F]/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#3D954F]/15 border border-[#3D954F]/30 grid place-items-center text-[#3D954F] group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-bold text-white group-hover:text-emerald-300 transition-colors">{s.title}</div>
                <div className="mt-1.5 text-xs leading-5 text-white/60">{s.desc}</div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#3D954F] group-hover:translate-x-1 transition-transform">
                <span>Explore Workflow</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
        All solutions use the same authoritative menu & order model — no disconnected duplicate systems. Multi-outlet chains can mix different formats across outlets under one subscription.
      </div>
    </PageShell>
  );
}
