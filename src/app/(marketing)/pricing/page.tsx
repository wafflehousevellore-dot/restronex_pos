import { PageShell } from "@/components/marketing/PageShell";
import PricingSelector from "@/components/marketing/PricingSelector";
import { pricingComparison, marketplaceServices } from "@/lib/brand";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function Pricing() {
  return (
    <PageShell
      title="Transparent SaaS Pricing for Modern Restaurants"
      subtitle="Complete restaurant operating system — Cloud POS, recipe inventory, KOT/KDS, multi-outlet central management, and live reporting. Three straightforward plans."
      badge="Honest SaaS Pricing • INR • GST Compliant"
    >
      {/* Dynamic 3-Plan Selector */}
      <PricingSelector />

      {/* Feature Comparison Matrix */}
      <div className="mt-12 rounded-2xl border border-[#E5EBE7] bg-white overflow-hidden shadow-sm">
        <div className="bg-[#16845B] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-white">Full Feature & Entitlements Comparison</h2>
            <p className="text-xs text-white/90">Compare Starter (₹200) vs Growth (₹300) vs Business (₹500)</p>
          </div>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs transition"
          >
            <span>Get Started</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#16845B]" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7]">
              <tr>
                <th className="text-left px-6 py-3.5 text-[#718078] font-bold text-xs uppercase tracking-wider">Feature</th>
                {pricingComparison.headers.slice(1).map((h) => (
                  <th key={h} className="px-6 py-3.5 text-[#172B25] font-black text-center text-sm">
                    {h}
                    {h === "Growth" && (
                      <span className="ml-2 rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] px-2 py-0.5 text-[10px] font-bold">
                        Most Popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {pricingComparison.rows.map((r) => (
                <tr key={r.feature} className="hover:bg-[#F8FAF9] transition">
                  <td className="px-6 py-3.5 text-[#172B25] font-medium text-xs sm:text-sm">{r.feature}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-6 py-3.5 text-center">
                      {v === true ? (
                        <span className="inline-flex h-5 w-5 rounded-full bg-[#E8F5EE] text-[#16845B] place-items-center justify-center text-xs font-bold mx-auto">
                          ✓
                        </span>
                      ) : v === false ? (
                        <span className="inline-flex h-5 w-5 rounded-full bg-slate-100 text-[#718078] place-items-center justify-center text-xs font-bold mx-auto">
                          —
                        </span>
                      ) : (
                        <span className="text-[#172B25] font-semibold text-xs">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#F8FAF9] border-t border-[#E5EBE7] px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
          <div className="text-[#718078] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#16845B]" />
            <span>Server-side entitlement enforcement • Instant plan upgrade/downgrade • No hidden fees</span>
          </div>
          <Link href="/get-started" className="rounded-full bg-[#16845B] px-5 py-2 font-bold text-white hover:bg-[#116B49] transition shadow-xs">
            Choose Your Plan & Get Started →
          </Link>
        </div>
      </div>

      {/* Module Overview */}
      <div className="mt-12">
        <div className="text-center mb-6">
          <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">Modular Architecture</span>
          <h3 className="text-xl font-bold text-[#172B25] mt-1">Included Platform Capabilities</h3>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {Object.entries(marketplaceServices).map(([k, services]) => (
            <div key={k} className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs">
              <div className="text-xs font-bold tracking-wider text-[#16845B] uppercase">{k}</div>
              <ul className="mt-3 space-y-2 text-xs text-[#718078]">
                {services.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16845B]" />
                    <span className="text-[#172B25]">{s}</span>
                  </li>
                ))}
              </ul>
              <Link href="/features" className="mt-4 inline-block text-xs font-semibold text-[#16845B] hover:underline transition">
                Explore {k} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Card */}
      <div className="mt-12 flex flex-col items-center">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-8 text-center max-w-3xl w-full space-y-4 shadow-sm">
          <h3 className="text-2xl font-black text-[#172B25]">Ready to streamline your restaurant operations?</h3>
          <p className="text-sm text-[#718078] max-w-xl mx-auto">
            Choose a plan tailored to your business scale. Complete billing, menu management, KDS, and inventory ready in 5 minutes.
          </p>
          <div className="pt-2 flex flex-wrap gap-3 justify-center items-center">
            <Link href="/get-started" className="rounded-full bg-[#16845B] px-8 py-3 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
              Choose Plan & Get Started →
            </Link>
            <Link href="/sign-in" className="rounded-full border border-[#E5EBE7] bg-white px-6 py-3 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
