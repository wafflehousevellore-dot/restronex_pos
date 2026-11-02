import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";

const cats = [
  { name: "Delivery & Ordering", items: ["Swiggy","Zomato","DOTPE","Talabat","UrbanPiper","Thrive","QR Ordering"] },
  { name: "Payments", items: ["Razorpay","Paytm","PhonePe","UPI","Worldline","Pinelabs","Sodexo","LazyPay","MobiKwik"] },
  { name: "Accounting & Tax", items: ["Tally","BUSY Accounting","Zoho Books","Masters India E-Invoice","E-way Bill","SAP","AWS Billing"] },
  { name: "Marketing & CRM", items: ["Reelo","Xeno","Dotdigital","SMS Gupshup","WhatsApp","Google Review Push","Loyalty Wallet"] },
  { name: "Hardware", items: ["Sunmi","Epson Printers","Cash Drawer","Customer Display","Barcode Scanner","Weigh Scale"] },
];

export default function IntegrationsPage(){
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white border-b border-[#E5EBE7] text-[#172B25]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <h1 className="text-3xl sm:text-4xl font-black text-[#172B25]">150+ integrations — one POS dashboard</h1>
            <p className="mt-3 text-sm text-[#718078] max-w-3xl leading-relaxed">
              Manage delivery, payments, accounting, CRM, and hardware from your RestroNex POS. Tenant-bound adapters; status is honest — not fake-connected.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/poss">
                <button className="rounded-full bg-[#16845B] hover:bg-[#116B49] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition">
                  Explore POS →
                </button>
              </Link>
              <Link href="/pricing">
                <button className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs transition">
                  View Pricing
                </button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cats.map(c=> (
              <div key={c.name} className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-6 shadow-xs">
                <div className="text-sm font-bold text-[#172B25]">{c.name}</div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {c.items.map(i=> (
                    <span key={i} className="rounded-full bg-white border border-[#E5EBE7] px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-xs">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-6 shadow-xs">
              <div className="text-sm font-bold text-[#172B25]">Builds & Compatibility</div>
              <div className="mt-3.5 space-y-2 text-xs">
                <div className="rounded-xl bg-[#E8F5EE] border border-[#E5EBE7] px-3 py-2 text-[#16845B]">
                  <b>Electron / Local</b> — Full integrations, 150+
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
                  <b>Android</b> — Via connector, limited
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[#718078]">
                  <b>Lite</b> — Billing only, no inventory integrations
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F8FAF9] py-12">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h3 className="text-lg font-black text-[#172B25]">Unified POS Core Architecture</h3>
            <p className="mt-2 text-sm text-[#718078] leading-relaxed max-w-3xl">
              Every integration feeds into the central order book and inventory ledger, ensuring total auditability without third-party discrepancies.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
