import { PageShell } from "@/components/marketing/PageShell";
import PricingSelector from "@/components/marketing/PricingSelector";
import { pricingPlans, pricingComparison, marketplaceServices } from "@/lib/brand";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { ShieldCheck, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

export default function Pricing() {
  return (
    <PageShell
      title="Transparent SaaS Pricing for Modern Restaurants"
      subtitle="Complete restaurant operating system — Cloud POS, recipe inventory, KOT/KDS, multi-outlet central management, and live reporting. Three straightforward plans."
      badge="Honest SaaS Pricing • INR • GST Compliant"
    >
      {/* Dynamic 3-Plan Selector (Starter ₹200, Growth ₹300, Business ₹500) */}
      <PricingSelector />

      {/* Feature Comparison Matrix */}
      <div className="mt-12 rounded-2xl border border-white/10 bg-[#0A120A] overflow-hidden shadow-2xl">
        <div className="bg-[#3D954F] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-white">Full Feature & Entitlements Comparison</h2>
            <p className="text-xs text-white/80">Compare Starter (₹200) vs Growth (₹300) vs Business (₹500)</p>
          </div>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition"
          >
            <span>Get Started</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left px-6 py-3.5 text-white/70 font-semibold text-xs uppercase tracking-wider">Feature</th>
                {pricingComparison.headers.slice(1).map((h) => (
                  <th key={h} className="px-6 py-3.5 text-white font-black text-center text-sm">
                    {h}
                    {h === "Growth" && (
                      <span className="ml-2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold">
                        Most Popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pricingComparison.rows.map((r) => (
                <tr key={r.feature} className="hover:bg-white/[0.02] transition">
                  <td className="px-6 py-3 text-white/90 font-medium text-xs sm:text-sm">{r.feature}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-6 py-3 text-center">
                      {v === true ? (
                        <span className="inline-flex h-5 w-5 rounded-full bg-[#3D954F] text-white place-items-center justify-center text-xs font-bold mx-auto">
                          ✓
                        </span>
                      ) : v === false ? (
                        <span className="inline-flex h-5 w-5 rounded-full bg-white/10 text-white/40 place-items-center justify-center text-xs font-bold mx-auto">
                          —
                        </span>
                      ) : (
                        <span className="text-white/80 font-semibold text-xs">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white/[0.02] border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
          <div className="text-white/60 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Server-side entitlement enforcement • Instant plan upgrade/downgrade • No hidden fees</span>
          </div>
          <Link href="/get-started" className="rounded-full bg-[#3D954F] px-5 py-2 font-bold text-white hover:bg-[#338a44] transition">
            Choose Your Plan & Get Started →
          </Link>
        </div>
      </div>

      {/* Module Overview */}
      <div className="mt-12">
        <div className="text-center mb-6">
          <span className="text-xs font-bold tracking-widest text-[#3D954F] uppercase">Modular Architecture</span>
          <h3 className="text-xl font-bold text-white mt-1">Included Platform Capabilities</h3>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {Object.entries(marketplaceServices).map(([k, services]) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-bold tracking-wider text-[#3D954F] uppercase">{k}</div>
              <ul className="mt-3 space-y-1.5 text-xs text-white/70">
                {services.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-[#3D954F]" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <Link href="/features" className="mt-4 inline-block text-xs font-semibold text-[#3D954F] hover:text-white transition">
                Explore {k} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Card */}
      <div className="mt-12 flex flex-col items-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center max-w-3xl w-full space-y-4">
          <h3 className="text-2xl font-black text-white">Ready to streamline your restaurant operations?</h3>
          <p className="text-sm text-white/60 max-w-xl mx-auto">
            Get started with our 14-day free trial on any plan. Complete billing, menu management, KDS, and inventory ready in 5 minutes.
          </p>
          <div className="pt-2 flex flex-wrap gap-3 justify-center items-center">
            <Link href="/get-started" className="rounded-full bg-[#3D954F] px-8 py-3 text-sm font-bold text-white hover:bg-[#338a44] transition shadow-lg">
              Start 14-Day Free Trial →
            </Link>
            <Link href="/sign-in" className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
