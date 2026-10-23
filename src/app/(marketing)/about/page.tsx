import { PageShell } from "@/components/marketing/PageShell";

export default function About(){
  return (
    <PageShell title="About RestroNex" subtitle="Restaurant technology crafted for India's scale — secure, fast, and operator-obsessed." badge="Our Story • Since 2020">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="space-y-3 text-sm leading-7 text-white/70">
            <p><strong className="text-white">RestroNex</strong> is an original restaurant POS SaaS — multi-tenant, outlet-aware, and tenant-isolated by design. We benchmark feature coverage against leading platforms but ship original branding, UI, and content.</p>
            <p>We prioritize billing accuracy (paise integer math), inventory integrity (movement history, not just totals), and operational clarity (KOT/KDS with honest connectivity states).</p>
            <p>Platform admin and restaurant roles are separate. Tenant isolation is enforced server-side and tested via cross-tenant probes.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-bold text-white">Principles</div>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-white/60">
            <li>One menu, one truth</li>
            <li>Money in minor units</li>
            <li>Tenant ID never trusted from client</li>
            <li>Audit everything sensitive</li>
            <li>Honest integration states</li>
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#3D954F]/15 border border-[#3D954F]/20 p-3 text-center"><div className="text-lg font-black text-[#3D954F]">2,400+</div><div className="text-xs text-white/60">Restaurants</div></div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center"><div className="text-lg font-black text-white">500+</div><div className="text-xs text-white/60">Orders/day avg</div></div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
