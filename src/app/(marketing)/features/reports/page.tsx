import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Turn daily restaurant data into actionable profit insights",
  description: "Turn daily restaurant data into actionable profit insights Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/reports",
  },
  openGraph: {
    title: "Turn daily restaurant data into actionable profit insights | RestroNex",
    description: "Turn daily restaurant data into actionable profit insights Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/features/reports",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";

export default function Page() {
  const bullets = [
    "Sales by hour, daypart, payment method, and outlet",
    "Product mix (P-Mix) & menu engineering profitability analysis",
    "Food Cost Percentage & Cost of Goods Sold (COGS)",
    "Staff sales productivity & cashier discount audit reports",
    "GSTR-1, CGST/SGST itemized tax reports ready for CA filing",
    "Automated daily end-of-day summary email and WhatsApp alerts",
  ] as const;
  const flows = [
    "Real-time transactional streaming → aggregation engine → visual dashboards → automated scheduled exports (Excel/PDF)",
  ] as const;

  return (
    <PageShell title="Reports & Analytics" subtitle="Turn daily restaurant data into actionable profit insights" badge="Feature • RestroNex">
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
        Export raw accounting journals, ledger mappings, and GST reports in standard formats compatible with Tally and SAP.
      </div>
    </PageShell>
  );
}
