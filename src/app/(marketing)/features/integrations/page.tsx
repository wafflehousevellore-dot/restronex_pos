import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Plug, CheckCircle2, ArrowRight } from "lucide-react";

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
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
              <Plug className="h-3.5 w-3.5" /> 70+ THIRD-PARTY CONNECTORS
            </div>
            <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
              Seamless Integrations <br />
              <span className="text-[#3D954F]">With The Food Tech Ecosystem</span>
            </h1>
            <p className="mt-4 text-base leading-7 text-white/70 max-w-2xl mx-auto">
              Connect your POS to India&apos;s leading delivery channels, payment gateways, accounting systems, and rider fleets without manual reconciliation.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((item) => (
                <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-black text-slate-900">{item.name}</div>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#3D954F] mt-1">{item.category}</div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#070B07] text-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black">Need a custom ERP or hardware integration?</h2>
            <p className="mt-2 text-sm text-white/60">Our open developer APIs and webhook connectors let you integrate any internal system.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3 text-sm font-bold text-white hover:bg-[#338a44]">
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
