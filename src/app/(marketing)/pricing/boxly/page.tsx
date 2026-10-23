import BoxlyPricingRestroNex from "@/components/ui/boxly-pricing-restronex";
import PricingSection from "@/components/ui/boxly-pricing-1";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Boxly Integration Demo | RestroNex",
  description: "Boxly pricing 1 integrated as-is and as RestroNex-themed variant — verification of shadcn + Tailwind 4 + TS setup.",
};

export default function BoxlyPricingDemoPage() {
  return (
    <div className="min-h-screen bg-[#070B07]">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#070B07]/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-xs font-semibold text-white/60 hover:text-white border border-white/15 rounded-full px-3 py-1.5">← Back to Pricing</Link>
          <span className="text-xs text-white/30">Boxly integration demo</span>
        </div>
        <span className="hidden sm:inline text-xs text-[#3D954F] border border-[#3D954F]/20 bg-[#3D954F]/10 rounded-full px-3 py-1">Verified: shadcn · Tailwind 4 · TS · Button · lucide-react</span>
      </div>

      {/* Variant A: Original Boxly pristine (copy-paste verification) */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <p className="text-xs font-bold tracking-widest text-white/40">VARIANT A — PRISTINE BOXLY (UNMODIFIED)</p>
          <p className="text-xs text-white/30 mt-1">src/components/ui/boxly-pricing-1.tsx — exact copy-paste, FREE/PRO/ENTERPRISE tiers, $0/$299/Contact us</p>
        </div>
        <PricingSection />
      </div>

      {/* Variant B: RestroNex data + brand */}
      <div>
        <div className="mx-auto max-w-6xl px-4 pt-10">
          <p className="text-xs font-bold tracking-widest text-[#3D954F]">VARIANT B — RESTRONEX ADAPTED (BOXLY LAYOUT + REAL DATA)</p>
          <p className="text-xs text-white/40 mt-1">src/components/ui/boxly-pricing-restronex.tsx — same corners/featured-border language, wired to pricingPlans + formatINR + RestroNex green #3D954F</p>
        </div>
        <BoxlyPricingRestroNex />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 text-xs leading-6 text-white/40 border-t border-white/10">
        <p className="font-bold text-white/80">Integration notes</p>
        <ul className="mt-2 list-disc pl-4 space-y-1">
          <li>Default paths: <code className="bg-white/10 px-1.5 py-0.5 rounded">src/components/ui</code> for shadcn and <code className="bg-white/10 px-1.5 py-0.5 rounded">src/app/globals.css</code> for styles (Next App Router). Creating <code>components/ui</code> outside <code>src/</code> would break <code>@/components/ui/*</code> alias — always keep UI primitives under <code>src/</code> when <code>paths: @/* → ./src/*</code>.</li>
          <li>Dependencies: <code>lucide-react</code> (already), <code>tw-animate-css</code> installed for Tailwind 4 <code>@import &quot;tw-animate-css&quot;</code>. Button is project&apos;s CVA-based <code>src/components/ui/button.tsx</code>.</li>
          <li>No extra context/hooks required — pure presentational. For real checkout pass <code>pricingPlans</code> as prop or fetch from <code>/api/subscription-plans</code>, manage selected tier in local state.</li>
          <li>Responsive: Boxly uses <code>grid md:grid-cols-3</code> with stacked mobile; corner brackets hidden on featured card — preserved.</li>
          <li>Best place: <code>/(marketing)/pricing</code> as primary, plus standalone <code>/pricing/boxly</code> demo for QA.</li>
        </ul>
      </div>
    </div>
  );
}
