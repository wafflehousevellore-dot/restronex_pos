import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) — Hardware, Billing & GST",
  description:
    "Find answers to common questions about RestroNex: GST calculation, thermal printers, multi-outlet management, KOT/KDS routing, and data security.",
  alternates: {
    canonical: "https://www.restronexpos.com/faq",
  },
  openGraph: {
    title: "Frequently Asked Questions | RestroNex",
    description: "Clear, factual answers regarding RestroNex restaurant POS software, hardware, and subscriptions.",
    url: "https://www.restronexpos.com/faq",
  },
};

const faqs = [
  {
    q: "Is RestroNex GST compliant?",
    a: "Tax configs are configurable (CGST/SGST/VAT) with basis-point rates and paise rounding. For legal compliance, consult your CA. We don't make unverified regulatory claims.",
  },
  {
    q: "Can I run multiple outlets?",
    a: "Yes — one Tenant has many Outlets. Central menu, outlet overrides, consolidated reports, outlet-scoped RBAC, subscription limits enforced server-side.",
  },
  {
    q: "How is data isolated?",
    a: "Every tenant-owned row carries tenantId. Middleware + server checks verify membership. RLS-ready. Cross-tenant probes are tested.",
  },
  {
    q: "What payment methods are supported?",
    a: "Cash, card, UPI, split payments. Razorpay integration with signature verification and idempotent webhooks.",
  },
  {
    q: "Do you support printers and KDS hardware?",
    a: "Adapter interface with honest status: Connected / Configured / Planned. Full integration with standard thermal receipt printers.",
  },
  {
    q: "Is offline POS supported?",
    a: "Network loss recovery is built in with retry queues. Local caching ensures orders are queued and preserved during intermittent drops.",
  },
];

export default function FAQ() {
  return (
    <PageShell
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about RestroNex — clear, honest answers."
      badge="FAQs • Help Center"
    >
      <div className="grid gap-4 max-w-3xl mx-auto">
        {faqs.map((f, i) => (
          <div
            key={f.q}
            className={`rounded-2xl border p-6 transition-all shadow-xs ${
              i === 0
                ? "bg-[#E8F5EE] border-[#16845B]/30"
                : "bg-white border-[#E5EBE7] hover:border-[#16845B]/30"
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="text-base font-bold text-[#172B25]">{f.q}</div>
              <div
                className={`h-6 w-6 rounded-full grid place-items-center text-xs shrink-0 font-bold ${
                  i === 0 ? "bg-[#16845B] text-white" : "bg-[#F8FAF9] border border-[#E5EBE7] text-[#718078]"
                }`}
              >
                ⌄
              </div>
            </div>
            <div className="mt-3 text-sm leading-relaxed text-[#718078]">{f.a}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
