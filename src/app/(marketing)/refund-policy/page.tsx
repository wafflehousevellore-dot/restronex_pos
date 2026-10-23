import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { ShieldAlert, RefreshCw, CheckCircle2 } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <PageShell
      title="Refund and Cancellation Policy"
      subtitle="Transparent subscription billing, cancellation rights, and refund terms for RestroNex SaaS."
      badge="Legal & Compliance"
    >
      <div className="max-w-4xl mx-auto space-y-8 text-white/80 text-sm leading-relaxed">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-[#3D954F]" /> 1. Subscription Cancellation
          </h2>
          <p>
            You may cancel your RestroNex subscription at any time directly through your restaurant dashboard under{" "}
            <Link href="/app/subscription" className="text-emerald-400 underline">
              App ➔ Subscription Settings
            </Link>{" "}
            or by emailing our support team at{" "}
            <span className="text-white font-semibold">{brand.contact.supportEmail}</span>.
          </p>
          <p>
            Upon cancellation, your subscription will remain active until the end of your current paid billing period
            (monthly or annual), after which no further renewals or charges will occur.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#3D954F]" /> 2. 7-Day Refund Guarantee (New Subscriptions)
          </h2>
          <p>
            If you are not satisfied with RestroNex for any reason within the first <b>7 days</b> of your initial paid
            subscription activation, you are entitled to a full 100% refund of your subscription fee.
          </p>
          <p>
            To initiate a refund request, contact <span className="text-white font-semibold">{brand.contact.supportEmail}</span>{" "}
            with your registered business email and payment reference ID. Refunds are credited back to the original payment
            method (UPI, Netbanking, or Card) within <b>5 to 7 business days</b> as processed by our payment partner Razorpay.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" /> 3. Renewal Charges & Non-Refundable Situations
          </h2>
          <p>
            Recurring monthly renewals and usage after the 7-day initial guarantee window are non-refundable. However, you
            can cancel anytime to prevent future billing cycles.
          </p>
          <p>
            Hardware peripherals, on-site installation visits (Scale tier), and third-party SMS/WhatsApp gateway charges are
            non-refundable once fulfilled.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-3">
          <h2 className="text-lg font-bold text-white">4. Contacting Billing Support</h2>
          <p>
            For any billing inquiries, invoice reconciliations, or refund assistance:
          </p>
          <div className="text-white/60 text-xs space-y-1">
            <div>Email: <span className="text-white font-semibold">{brand.contact.supportEmail}</span></div>
            <div>Phone: <span className="text-white font-semibold">{brand.contact.phone}</span></div>
            <div>Registered Address: <span className="text-white">{brand.contact.address}</span></div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
