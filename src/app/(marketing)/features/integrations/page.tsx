import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seamless Integrations With The Food Tech Ecosystem",
  description: "Connect your POS to India's leading delivery channels, payment gateways, accounting systems, and rider fleets without manual reconciliation.... Built for Indian restaurants.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/integrations",
  },
  openGraph: {
    title: "Seamless Integrations With The Food Tech Ecosystem | RestroNex",
    description: "Connect your POS to India's leading delivery channels, payment gateways, accounting systems, and rider fleets without manual reconciliation.... Built for Indian restaurants.",
    url: "https://www.restronexpos.com/features/integrations",
  },
};

import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Plug } from "lucide-react";

export default function IntegrationsFeaturePage() {
  const integrations = [
    { name: "Swiggy", category: "Online Food Delivery", desc: "Auto-sync online orders directly into your kitchen KDS. Central menu catalog push.", status: "Supported" },
    { name: "Zomato", category: "Online Food Delivery", desc: "Two-way integration for real-time order acceptance, rider status, and rider OTP verification.", status: "Supported" },
    { name: "DotPe", category: "QR & Direct Ordering", desc: "Contactless table QR ordering and WhatsApp marketing campaigns synchronized with billing.", status: "Supported" },
    { name: "Razorpay", category: "Payments & Invoicing", desc: "Instant UPI dynamic QR codes, swipe machines, and automatic payment reconciliation.", status: "Supported" },
    { name: "Tally / SAP", category: "Accounting & GST", desc: "Automated day-end financial journal entries, ledger mapping, and GST report exports.", status: "Supported" },
    { name: "Dunzo / Shadowfax", category: "Third-Party Logistics", desc: "Automatic delivery rider dispatch for website orders with real-time GPS tracking.", status: "Supported" },
  ];

  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
              <Plug className="h-3.5 w-3.5" /> 70+ THIRD-PARTY CONNECTORS
            </div>
            <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
              Seamless Integrations <br />
              <span className="text-[#16845B]">With The Food Tech Ecosystem</span>
            </h1>
            <p className="mt-4 text-base leading-7 text-[#718078] max-w-2xl mx-auto">
              Connect your POS to India&apos;s leading delivery channels, payment gateways, accounting systems, and rider fleets without manual reconciliation.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((item) => (
                <div key={item.name} className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs hover:border-[#16845B]/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-black text-[#172B25]">{item.name}</div>
                    <span className="rounded-full bg-[#E8F5EE] text-[#16845B] text-[11px] font-bold px-2.5 py-0.5 border border-[#16845B]/20">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#16845B] mt-1">{item.category}</div>
                  <p className="mt-3 text-sm text-[#718078] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#E8F5EE]/40 border-t border-[#E5EBE7] text-[#172B25] py-16">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-[#172B25]">Need a custom ERP or hardware integration?</h2>
            <p className="mt-2 text-sm text-[#718078]">Our open developer APIs and webhook connectors let you integrate any internal system.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                Contact Integrations Team →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
