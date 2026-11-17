import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ditch paper paper tickets for zero-error kitchen execution",
  description: "Ditch paper paper tickets for zero-error kitchen execution Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/kitchen-display",
  },
  openGraph: {
    title: "Ditch paper paper tickets for zero-error kitchen execution | RestroNex",
    description: "Ditch paper paper tickets for zero-error kitchen execution Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/features/kitchen-display",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";

export default function Page() {
  const bullets = [
    "Real-time ticket routing by kitchen station",
    "Color-coded prep timer status (Received, Preparing, Ready)",
    "Bump bar and touchscreen action support",
    "Audio alerts for new rush orders",
    "Order item-level notes & allergy highlighting",
    "Average preparation time telemetry",
  ] as const;
  const flows = [
    "Order fired at POS/QR → instant display on KDS → chef bumps to Preparing → bump to Ready → server pickup notification",
  ] as const;

  return (
    <PageShell title="Kitchen Display System (KDS)" subtitle="Ditch paper paper tickets for zero-error kitchen execution" badge="Feature • RestroNex">
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
        Connect multiple KDS screens for bar, grill, fryer, and dessert stations with synchronized status.
      </div>
    </PageShell>
  );
}
