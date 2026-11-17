import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stop food waste, shrinkage, and theft with precision stock tracking",
  description: "Stop food waste, shrinkage, and theft with precision stock tracking Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/inventory",
  },
  openGraph: {
    title: "Stop food waste, shrinkage, and theft with precision stock tracking | RestroNex",
    description: "Stop food waste, shrinkage, and theft with precision stock tracking Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/features/inventory",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";

export default function Page() {
  const bullets = [
    "Real-time raw material consumption on bill settlement",
    "Recipe Bill of Materials (BOM) with sub-recipes",
    "Vendor purchase orders and Goods Received Notes (GRN)",
    "Low stock threshold alerts and auto-indent generation",
    "Physical stock audit reconciliation and wastage logging",
    "Batch tracking with expiry warnings to enforce FIFO",
  ] as const;
  const flows = [
    "Define ingredients → build menu item recipes → receive purchase orders → auto-deplete on sales → audit variance",
  ] as const;

  return (
    <PageShell title="Inventory & Stock Control" subtitle="Stop food waste, shrinkage, and theft with precision stock tracking" badge="Feature • RestroNex">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="text-base font-bold text-[#172B25]">What&apos;s included</div>
          <ul className="mt-4 space-y-3 text-sm text-[#718078]">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="text-[#16845B] font-bold">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-base font-bold text-[#172B25]">How it works</div>
            <ol className="mt-4 list-decimal pl-5 space-y-2 text-sm text-[#718078]">
              {flows.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs"
            >
              Get started
            </Link>
            <Link
              href="/book-demo"
              className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
            >
              Book demo
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-[#E5EBE7] bg-white p-5 text-sm text-[#718078] shadow-xs">
        Track stock movements with complete ledger history. Never see unexplained inventory discrepancies again.
      </div>
    </PageShell>
  );
}
