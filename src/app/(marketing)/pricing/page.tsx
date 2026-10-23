import { PageShell } from "@/components/marketing/PageShell";
import BoxlyPricingRestroNex from "@/components/ui/boxly-pricing-restronex";
import PricingSelector from "@/components/marketing/PricingSelector";
import { pricingPlans, pricingComparison, posEditions, marketplaceServices } from "@/lib/brand";
import Link from "next/link";
import { formatINR } from "@/lib/money";

const buildTabs = [
  { id: "core", label: "Core", price: "₹12,000", note: "Cloud POS • 90+ Reports • Offline ready" },
  { id: "growth", label: "Growth", price: "₹20,000", note: "Core + any 5 add-ons • 1 Visit/Year" },
  { id: "scale", label: "Scale", price: "₹33,300", note: "All services • 2 Visits + E-invoice credits" },
  { id: "lite", label: "Lite / Android", price: "₹6,000–9,000", note: "Billing-only • Limited inventory" },
];

export default function Pricing() {
  return (
    <PageShell
      title="POS Pricing That Scales With Your Restaurant"
      subtitle="One POS platform for every outlet — billing, inventory, KOT/KDS, and 94 reports. Yearly per outlet + GST. Start small, scale without re-platforming."
      badge="Pricing • Annually • +18% GST • Transparent • INR"
    >
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1">
          <span className="rounded-full bg-[#3D954F] px-5 py-2 text-xs font-black text-white">Annually — billed yearly</span>
          <span className="rounded-full px-5 py-2 text-xs font-semibold text-white/60">Monthly — billed monthly</span>
        </div>
      </div>
      <div className="text-center text-xs text-white/40 mt-2">Monthly price shown for comparison • Yearly billing saves 16% • Localized rates on request</div>

      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {posEditions.map((b) => (
          <div key={b.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="text-xs font-bold tracking-widest text-white/40 uppercase">{b.name}</div>
            <div className="text-xs text-white/60">{b.subtitle}</div>
            <div className="mt-2 text-xs text-white/30">{b.inventory} • {b.reports} • {b.purchaseManager ? "Purchase ✓" : "No purchase"}</div>
            <div className="mt-2 text-xs text-[#3D954F]">{b.ideal}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-4 gap-3 text-xs">
        {buildTabs.map((t) => (
          <div key={t.id} className={`rounded-2xl border p-4 ${t.id === "scale" ? "bg-[#3D954F] border-[#3D954F] text-white" : "bg-white/5 border-white/10 text-white/70"}`}>
            <div className="font-black">{t.label}</div>
            <div className={`text-lg font-black ${t.id === "scale" ? "text-white" : "text-white"}`}>
              {t.price}
              <span className="text-xs font-normal">/yr/outlet +GST</span>
            </div>
            <div className="text-xs opacity-70 mt-1">{t.note}</div>
          </div>
        ))}
      </div>

      <BoxlyPricingRestroNex />
      <PricingSelector />

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 flex flex-wrap gap-3">
        <span>
          Yearly per outlet: <b className="text-white">{pricingPlans.map((p) => `${p.name} ₹${p.priceYearlyPerOutlet.toLocaleString("en-IN")}`).join(" • ")}</b> +18% GST
        </span>
        <span>Monthly equiv: {pricingPlans.map((p) => `${formatINR(p.priceMonthly * 100)}/mo`).join(" • ")} • Save 16% yearly</span>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-[#3D954F] px-4 py-3 text-sm font-black text-white">POS Features — Starter vs Growth vs Scale • 94 reports catalogue</div>
        <div className="px-4 py-2 text-xs text-slate-500">Starter = essential POS billing • Growth = advanced inventory + any 5 services • Scale = everything + E-invoice credits & head-office controls</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-slate-600 font-semibold">Feature</th>
                {pricingComparison.headers.slice(1).map((h) => (
                  <th key={h} className="px-4 py-2 text-slate-900 font-black text-center">
                    {h}
                    {h === "Growth" && <span className="ml-2 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs">🔥 Popular</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricingComparison.rows.map((r) => (
                <tr key={r.feature} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-800">{r.feature}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-4 py-2 text-center">
                      {v === true ? <span className="inline-flex h-6 w-6 rounded-full bg-[#3D954F] text-white grid place-items-center text-xs">✓</span> : v === false ? <span className="inline-flex h-6 w-6 rounded-full bg-slate-200 text-slate-500 grid place-items-center text-xs">×</span> : <span className="text-slate-700 font-semibold text-xs">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-4 py-3 flex flex-wrap gap-2 text-xs justify-between items-center">
          <span className="text-slate-600">Support: On-call/On-chat • Dedicated POC on Growth • 2 Visits/Year + POC on Scale</span>
          <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-4 py-2 font-bold text-white">Book A Demo →</Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#07110a] overflow-hidden">
        <div className="px-4 py-3 text-sm font-black text-white">Add-ons — KDS, Captain, Loyalty, Token, Feedback, QR / Dynamic reports</div>
        <div className="grid lg:grid-cols-4 gap-0 text-xs divide-x divide-white/10">
          <div className="p-4 text-white/60">Add-ons on Starter = paid add-on. On Growth = any 5 free. On Scale = all included + E-invoice credits. Choose what your outlets need.</div>
          <div className="p-4">
            <div className="font-black text-white">Starter</div>
            <ul className="mt-2 space-y-1 text-white/60"><li>• KDS — Add-on</li><li>• Captain — Add-on</li><li>• Website — Add-on</li><li>• Loyalty — Add-on</li></ul>
          </div>
          <div className="p-4 bg-white/5">
            <div className="font-black text-white">Growth — Any 5 🔥</div>
            <ul className="mt-2 space-y-1 text-white/60"><li>• Any 5 services free</li><li>• Extra at cost • 1 Visit/Year</li><li>• 5 dynamic reports</li></ul>
          </div>
          <div className="p-4 bg-[#3D954F] text-white">
            <div className="font-black">Scale — All</div>
            <ul className="mt-2 space-y-1 text-white/90"><li>• Every service included</li><li>• E-invoice credits • 2 Visits/Year</li><li>• Head-office controls</li></ul>
          </div>
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-4 gap-4">
        {Object.entries(marketplaceServices).map(([k, services]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-bold tracking-widest text-[#3D954F] uppercase">{k}</div>
            <ul className="mt-2 space-y-1 text-xs text-white/60">{services.map((s) => <li key={s}>• {s}</li>)}</ul>
            <Link href="/poss" className="mt-3 inline-block text-xs text-[#3D954F] hover:text-white">Explore {k} →</Link>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-white/30 text-center">120+ POS services • 70+ integrations • 94 reports — complete restaurant POS toolkit</div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center text-sm text-white/60 max-w-3xl">
          Entitlements enforced server-side. Razorpay webhooks signature-verified + idempotent. Growth = any 5 marketplace services, Scale = all + E-invoice credits + 2 visits. Outlet & user limits gated. Start with Day-End Summary — close in &lt;5 min.
        </div>
        <div className="flex flex-wrap gap-3 text-xs justify-center">
          <Link href="/app/marketplace" className="text-[#3D954F] hover:text-white">Marketplace (120) →</Link>
          <span className="text-white/20">•</span>
          <Link href="/book-demo" className="text-[#3D954F] hover:text-white">Book demo →</Link>
          <span className="text-white/20">•</span>
          <Link href="/integrations" className="text-[#3D954F] hover:text-white">Integrations →</Link>
        </div>
      </div>
    </PageShell>
  );
}
