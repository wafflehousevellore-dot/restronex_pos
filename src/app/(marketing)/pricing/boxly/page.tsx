import BoxlyPricingRestroNex from "@/components/ui/boxly-pricing-restronex";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Boxly Integration Demo | RestroNex",
  description: "Boxly pricing integrated and RestroNex-themed variant — verification of light theme design system.",
};

export default function BoxlyPricingDemoPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25]">
      <div className="sticky top-0 z-50 border-b border-[#E5EBE7] bg-white/90 backdrop-blur px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="text-xs font-semibold text-[#718078] hover:text-[#172B25] border border-[#E5EBE7] bg-white rounded-full px-3.5 py-1.5 transition"
          >
            ← Back to Pricing
          </Link>
          <span className="text-xs text-[#718078]">Boxly Layout Demo</span>
        </div>
        <span className="hidden sm:inline text-xs text-[#16845B] border border-[#16845B]/20 bg-[#E8F5EE] rounded-full px-3.5 py-1 font-medium">
          Verified: Light Theme · shadcn · Tailwind 4 · TS · Button
        </span>
      </div>

      {/* RestroNex Light Theme Boxly layout */}
      <div className="py-8">
        <div className="mx-auto max-w-6xl px-4 pb-6">
          <p className="text-xs font-bold tracking-widest text-[#16845B] uppercase">RESTRONEX ADAPTED (BOXLY COMPONENT + LIGHT THEME)</p>
          <p className="text-xs text-[#718078] mt-1">
            src/components/ui/boxly-pricing-restronex.tsx — wired to pricingPlans + formatINR + RestroNex emerald #16845B
          </p>
        </div>
        <BoxlyPricingRestroNex />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 text-xs leading-6 text-[#718078] border-t border-[#E5EBE7]">
        <p className="font-bold text-[#172B25] text-sm">Design & Integration Notes</p>
        <ul className="mt-3 list-disc pl-4 space-y-1.5">
          <li>Standardized on global design tokens: <code>#F8FAF9</code> (background), <code>#FFFFFF</code> (cards), <code>#16845B</code> (primary accent), <code>#E8F5EE</code> (light accent), and <code>#172B25</code> (high-contrast text).</li>
          <li>Dependencies: <code>lucide-react</code>, <code>src/components/ui/button.tsx</code>.</li>
          <li>Responsive: 3-column desktop grid with stacked mobile view; highlighted popular card elevated with border and subtle tint.</li>
          <li>Links directly to unified checkout and registration flows.</li>
        </ul>
      </div>
    </div>
  );
}
