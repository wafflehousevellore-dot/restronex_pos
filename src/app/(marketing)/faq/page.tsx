import { PageShell } from "@/components/marketing/PageShell";

const faqs=[
  {q:"Is RestroNex GST compliant?",a:"Tax configs are configurable (CGST/SGST/VAT) with basis-point rates and paise rounding. For legal compliance, consult your CA. We don't make unverified regulatory claims."},
  {q:"Can I run multiple outlets?",a:"Yes — one Tenant has many Outlets. Central menu, outlet overrides, consolidated reports, outlet-scoped RBAC, subscription limits enforced server-side."},
  {q:"How is data isolated?",a:"Every tenant-owned row carries tenantId. Middleware + server checks verify membership. RLS-ready. Cross-tenant probes are tested."},
  {q:"What payment methods are supported?",a:"Cash, card, UPI, split. Razorpay integration with signature verification and idempotent webhooks."},
  {q:"Do you support printers/KDS hardware?",a:"Adapter interface with honest status: Connected / Configured / Planned. No fake sync."},
  {q:"Is offline POS supported?",a:"Not yet — connectivity status is explicit with retry. Full offline (IndexedDB + sync queue) is on the roadmap with conflict resolution."},
];

export default function FAQ(){ return (
  <PageShell title="Frequently Asked Questions" subtitle="Everything you need to know about RestroNex — honest answers, no fluff." badge="FAQs • Help Center">
    <div className="grid gap-4 max-w-3xl mx-auto">
      {faqs.map((f, i)=> (
        <div key={f.q} className={`rounded-2xl border p-5 ${i===0 ? "bg-[#3D954F] border-[#3D954F] text-white" : "bg-white/5 border-white/10 text-white backdrop-blur"}`}>
          <div className="flex justify-between items-start gap-4">
            <div className="text-sm font-bold">{f.q}</div>
            <div className={`h-6 w-6 rounded-full grid place-items-center text-xs shrink-0 ${i===0 ? "bg-white text-[#3D954F]" : "bg-white/10 text-white/60"}`}>⌄</div>
          </div>
          <div className={`mt-2 text-sm leading-6 ${i===0 ? "text-white/90" : "text-white/60"}`}>{f.a}</div>
        </div>
      ))}
    </div>
  </PageShell>
);}
