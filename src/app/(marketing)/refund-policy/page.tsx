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
      <div className="max-w-4xl mx-auto space-y-6 text-sm leading-relaxed text-[#718078]">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-[#16845B]" /> 1. Subscription Cancellation
          </h2>
          <p>
            You may cancel your RestroNex subscription at any time directly through your restaurant dashboard under{" "}
            <Link href="/app/subscription" className="text-[#16845B] font-semibold underline">
              App ➔ Subscription Settings
            </Link>{" "}
            or by emailing our support team at{" "}
            <a href={brand.contact.mailtoUrl} className="text-[#16845B] font-semibold hover:underline">
              {brand.contact.supportEmail}
            </a>
            .
          </p>
          <p>
            Upon cancellation, your subscription will remain active until the end of your current paid billing period
            (monthly or annual), after which no further renewals or charges will occur.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#16845B]" /> 2. 7-Day Refund Guarantee (New Subscriptions)
          </h2>
          <p>
            If you are not satisfied with RestroNex for any reason within the first <b>7 days</b> of your initial paid
            subscription activation, you are entitled to a full 100% refund of your subscription fee.
          </p>
          <p>
            To initiate a refund request, contact{" "}
            <a href={brand.contact.mailtoUrl} className="text-[#16845B] font-semibold hover:underline">
              {brand.contact.supportEmail}
            </a>{" "}
            with your registered business email and payment reference ID. Refunds are credited back to the original payment
            method (UPI, Netbanking, or Card) within <b>5 to 7 business days</b> as processed by our payment partner Razorpay.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" /> 3. Renewal Charges & Non-Refundable Situations
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

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25]">4. Contacting Billing Support</h2>
          <p>
            For any billing inquiries, invoice reconciliations, or refund assistance:
          </p>
          <div className="text-[#718078] text-xs space-y-1.5 pt-1">
            <div>
              Email:{" "}
              <a href={brand.contact.mailtoUrl} className="text-[#16845B] font-semibold hover:underline">
                {brand.contact.supportEmail}
              </a>
            </div>
            <div>
              Mobile:{" "}
              <a href={brand.contact.telUrl} className="text-[#172B25] font-semibold hover:text-[#16845B] hover:underline">
                {brand.contact.phone}
              </a>
            </div>
            <div>
              WhatsApp:{" "}
              <a href={brand.contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-[#16845B] font-semibold hover:underline">
                {brand.contact.whatsapp} (Chat on WhatsApp →)
              </a>
            </div>
            <div>Registered Address: <span className="text-[#172B25]">{brand.contact.address}</span></div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
