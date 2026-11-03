import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { MessageSquare, Check, ArrowRight, ShieldCheck, Send } from "lucide-react";

export default function WhatsAppInvoicesPage() {
  const capabilities = [
    { title: "Official Meta WhatsApp Cloud API", desc: "Built directly on the Meta WhatsApp Business Platform. No fragile web scrapers or unauthorized browser hacks that risk phone number banning." },
    { title: "Automated Send on Bill Settlement", desc: "The instant a cashier settles payment and closes an order, RestroNex automatically delivers the itemized invoice to the customer's phone." },
    { title: "Consent & Opt-In Compliance", desc: "Record customer digital consent during tableside or counter ordering with an audit trail, fully adhering to Meta's 2026 business messaging policies." },
    { title: "Direct PDF Download & Digital Receipt", desc: "Customers receive a beautifully formatted WhatsApp template message with their order summary, restaurant GSTIN, and one-tap PDF receipt link." },
    { title: "Live Delivery Tracking (Sent / Delivered / Read)", desc: "POS operators see real-time delivery status checkmarks right beside each order in the historical billing ledger." },
    { title: "Manual Resend & Fallback Options", desc: "If a guest entered an incorrect digit or requested an extra copy for business expense reimbursement, resend with a single click." },
  ];

  const workflow = [
    "Customer phone number entered at POS or captured during QR table checkout",
    "Customer opt-in consent recorded automatically in customer profile",
    "Cashier generates final bill & records payment (Cash, Card, UPI, Split)",
    "Bill-closed event triggers official Meta WhatsApp Cloud API webhook",
    "Customer receives instant branded invoice notification with full itemized breakdown",
  ];

  return (
    <PageShell
      title="Automated WhatsApp Bill Delivery"
      subtitle="Deliver paperless digital receipts and GST invoices directly to customers on WhatsApp."
      badge="Customer Experience • RestroNex"
    >
      <div className="space-y-10">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-[#16845B] font-bold text-sm mb-3">
              <MessageSquare className="h-5 w-5" />
              <span>Modern, Green & Zero Paper Waste</span>
            </div>
            <h2 className="text-xl font-bold text-[#172B25]">Cut Thermal Paper Costs & Collect Repeat Customers</h2>
            <p className="mt-2 text-sm text-[#718078] leading-relaxed">
              Thermal receipt paper is expensive, fades over time, and creates physical clutter. With RestroNex automated WhatsApp delivery, your restaurant cuts consumables cost while establishing a verified customer CRM communication channel.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {capabilities.map((c) => (
                <div key={c.title} className="p-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#172B25]">
                    <Check className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>{c.title}</span>
                  </div>
                  <p className="text-xs text-[#718078] leading-relaxed pl-6">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#16845B] font-bold text-xs uppercase tracking-wider mb-2">
                <Send className="h-4 w-4" /> Message Delivery Flow
              </div>
              <h3 className="text-lg font-bold text-[#172B25]">Official Meta Cloud API Architecture</h3>
              <ol className="mt-5 space-y-3 pl-2">
                {workflow.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-[#718078]">
                    <span className="h-6 w-6 rounded-full bg-[#E8F5EE] text-[#16845B] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E5EBE7] space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#16845B] font-semibold">
                <ShieldCheck className="h-4 w-4" /> Secure Token Storage & Encrypted Webhook Signature Verification
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs inline-flex items-center gap-1.5"
                >
                  Enable WhatsApp Invoices <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
