import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import ContactForm from "@/components/marketing/ContactForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact Us — Sales, Onboarding & Support",
  description:
    "Get in touch with the RestroNex team. Direct phone, email, and WhatsApp support for restaurant onboarding, POS billing setups, and technical assistance.",
  alternates: {
    canonical: "https://www.restronexpos.com/contact",
  },
  openGraph: {
    title: "Contact RestroNex | Restaurant Onboarding & Support",
    description: "Reach our onboarding team via phone, email, or WhatsApp. Fast assistance for restaurants across India.",
    url: "https://www.restronexpos.com/contact",
  },
};

export default function ContactPage() {
  return (
    <PageShell
      title="Contact Us"
      subtitle="Sales inquiries, hardware onboarding, and 24x7 restaurant operations support."
      badge="Contact • Direct Support"
    >
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="text-base font-bold text-[#172B25] mb-4">Send a message</div>
          <ContactForm />
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-base font-bold text-[#172B25]">Reach us directly</div>
            <p className="mt-1 text-sm text-[#718078]">Connect with our restaurant onboarding team anytime.</p>

            <div className="mt-6 space-y-4 text-sm text-[#172B25]">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center text-sm font-bold shrink-0">
                  ✉
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#718078] uppercase tracking-wider">Email</div>
                  <a
                    href={brand.contact.mailtoUrl}
                    className="font-semibold text-[#16845B] hover:underline break-all"
                  >
                    {brand.contact.supportEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center text-sm font-bold shrink-0">
                  ☎
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#718078] uppercase tracking-wider">Direct Phone</div>
                  <a
                    href={brand.contact.telUrl}
                    className="font-semibold text-[#172B25] hover:text-[#16845B] hover:underline"
                  >
                    {brand.contact.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center text-sm font-bold shrink-0">
                  💬
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#718078] uppercase tracking-wider">WhatsApp Support</div>
                  <a
                    href={brand.contact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#16845B] hover:underline inline-flex items-center gap-1"
                  >
                    {brand.contact.whatsapp} • Chat on WhatsApp →
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center text-sm font-bold shrink-0">
                  📍
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#718078] uppercase tracking-wider">Office Location</div>
                  <div className="font-medium text-[#172B25]">{brand.contact.address}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#E5EBE7] text-xs text-[#718078] leading-relaxed">
            RestroNex operations and support engineers are based in Virupachipuram, Vellore, Tamil Nadu, serving restaurants, cafes, bakeries, and QSRs across India.
          </div>
        </div>
      </div>
    </PageShell>
  );
}
