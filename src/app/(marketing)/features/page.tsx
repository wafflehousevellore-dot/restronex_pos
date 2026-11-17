import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import SoftwareShowcaseSection from "@/components/marketing/SoftwareShowcaseSection";
import Link from "next/link";
import { Store, ChefHat, BarChart3, Truck, Layers, ShieldCheck, LayoutGrid, Users, QrCode, Globe, Building2, Plug, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant POS Features — Billing, KOT/KDS, Inventory & Multi-Outlet",
  description:
    "Explore complete RestroNex features: fast counter POS, live kitchen display system, table QR ordering, recipe inventory depletion, thermal printing, and WhatsApp invoices.",
  alternates: {
    canonical: "https://www.restronexpos.com/features",
  },
  openGraph: {
    title: "All Restaurant Management Features | RestroNex",
    description: "Discover all-in-one restaurant operational tooling designed for Indian food businesses.",
    url: "https://www.restronexpos.com/features",
  },
};

const features = [
  { title: "POS & Billing", href: "/features/pos", desc: "Fast 3-click billing, GST paise calculations, split pay, shifts, printable receipts.", icon: Store },
  { title: "Universal Menu Management", href: "/features/menu-management", desc: "Categories, variants, modifiers, combos, outlet pricing, channel availability.", icon: ChefHat },
  { title: "Table & Floor Plan", href: "/features/table-management", desc: "Area layouts, table states, captain mobile ordering, transfers and merges.", icon: LayoutGrid },
  { title: "Kitchen Display (KDS)", href: "/features/kitchen-display", desc: "Station queues, preparation timers, bump bar actions, real-time ticket sync.", icon: Layers },
  { title: "Inventory & Recipes", href: "/features/inventory", desc: "Raw materials, recipe BOM consumption, PO, GRN, wastage, weighted valuation.", icon: Truck },
  { title: "Reports & Analytics", href: "/features/reports", desc: "Daily sales, net/gross, AOV, voids, payment mix, inventory audit, outlet compare.", icon: BarChart3 },
  { title: "CRM & Loyalty", href: "/features/crm-loyalty", desc: "Guest profiles, phone-unique CRM, points-per-rupee rewards, VIP segmentation.", icon: Users },
  { title: "QR Contactless Order", href: "/features/qr-ordering", desc: "Scan table QR codes, visual menus with modifiers, direct UPI pay at table.", icon: QrCode },
  { title: "Direct Online Store", href: "/features/online-ordering", desc: "0% commission direct website ordering, custom domain, rider logistics dispatch.", icon: Globe },
  { title: "Multi-Outlet Management", href: "/features/multi-outlet", desc: "Centralized outlet management, role-based access, unified subscriptions.", icon: ShieldCheck },
  { title: "Head Office Hub", href: "/features/head-office", desc: "1-click menu distribution, chain sales benchmarks, central kitchen transfers.", icon: Building2 },
  { title: "70+ Connectors & Integrations", href: "/features/integrations", desc: "Swiggy, Zomato, Razorpay, DotPe, Tally/SAP, Dunzo/Shadowfax connectors.", icon: Plug },
];

export default function FeaturesIndex() {
  return (
    <PageShell
      title="Features — One Platform, Every Restaurant Workflow"
      subtitle="Comprehensive coverage benchmarked against leading restaurant tech. Original design, pure performance."
      badge="Platform • 12 Core Suites"
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-2xl border border-[#E5EBE7] bg-white p-5 hover:border-[#16845B] hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#E5EBE7] grid place-items-center text-[#16845B] group-hover:bg-[#16845B] group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-bold text-[#172B25] group-hover:text-[#16845B] transition-colors">{f.title}</div>
                <p className="mt-1.5 text-xs leading-5 text-[#718078]">{f.desc}</p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#16845B] group-hover:translate-x-1 transition-transform">
                <span>Explore Suite</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-8 rounded-2xl border border-[#E5EBE7] bg-white p-5 text-sm text-[#718078] shadow-xs">
        All suites share one authoritative menu, inventory, and order data model — no disconnected duplicate systems. Multi-tenant, outlet-aware, and audit-logged from day one.
      </div>
      <SoftwareShowcaseSection embedded />
    </PageShell>
  );
}
