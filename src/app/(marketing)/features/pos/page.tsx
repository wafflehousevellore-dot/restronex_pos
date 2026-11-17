import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fast, accurate billing for every service mode",
  description: "Fast, accurate billing for every service mode Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/pos",
  },
  openGraph: {
    title: "Fast, accurate billing for every service mode | RestroNex",
    description: "Fast, accurate billing for every service mode Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/features/pos",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";

export default function Page() {
  const bullets = [
    "Dine-in with table selection & status",
    "Takeaway & delivery orders",
    "QR ordering",
    "Table merge / bill split",
    "CGST/SGST/VAT with paise math",
    "Item & bill discounts (permissioned)",
    "Split payments: cash/card/UPI",
    "Cashier shift open/close & reconciliation",
    "Printable receipts & KOT",
    "Refund & cancellation audit trail",
  ] as const;
  const flows = [
    "Create order → add items → apply tax/discount → KOT → bill → pay → receipt",
  ] as const;

  return (
    <PageShell title="POS & Billing" subtitle="Fast, accurate billing for every service mode" badge="Feature • RestroNex">
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
        Original content and visuals. POS & Billing is built on normalized DB, tenant-isolated, audit-logged, and permission-checked.
      </div>
    </PageShell>
  );
}
