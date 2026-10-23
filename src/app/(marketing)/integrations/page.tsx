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
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-black">150+ integrations — one POS dashboard</h1>
            <p className="mt-2 text-sm text-white/60 max-w-3xl">Manage delivery, payments, accounting, CRM, and hardware from your RestroNex POS. Tenant-bound adapters; status is honest — not fake-connected.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/poss"><button className="rounded-full bg-[#3D954F] px-6 py-2.5 text-sm font-bold text-white">Explore POS →</button></Link>
              <Link href="/pricing"><button className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white">View Pricing</button></Link>
            </div>
          </div>
        </section>
        <section className="bg-[#F7F9F8]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cats.map(c=> (
              <div key={c.name} className="rounded-[20px] border border-slate-200 bg-white p-6">
                <div className="text-sm font-black">{c.name}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.items.map(i=> <span key={i} className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">{i}</span>)}
                </div>
              </div>
            ))}
            <div className="rounded-[20px] border border-slate-200 bg-white p-6">
              <div className="text-sm font-black">Builds & Compatibility</div>
              <div className="mt-3 space-y-2 text-xs text-slate-700">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2"><b>Electron / Local</b> — Full integrations, 150+</div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2"><b>Android</b> — Via connector, limited</div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2"><b>Lite</b> — Billing only, no inventory integrations</div>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-white border-y border-slate-100">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-8">
            <h3 className="text-lg font-black">Everything in one POS</h3>
            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-[#F7F9F8] p-5"><b>200+ tools across POS modules</b> — billing, KOT/KDS, inventory, CRM, reports. Start with Day-End Summary &lt;5 min.</div>
              <div className="rounded-2xl border border-slate-200 bg-[#F7F9F8] p-5"><b>94 reports</b> — orders, items, customers, discounts — plus 120 marketplace services, 70+ integrations.</div>
              <div className="rounded-2xl border border-slate-200 bg-[#F7F9F8] p-5"><b>Scale = every service included</b> + E-invoice credits. Growth = any 5. Starter = core POS. All priced per outlet/year + GST.</div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
