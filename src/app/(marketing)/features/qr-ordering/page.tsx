import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { QrCode, Smartphone, Zap, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";

export default function QrOrderingFeaturePage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        {/* Hero */}
        <section className="bg-[#070B07] text-white overflow-hidden py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <QrCode className="h-3.5 w-3.5" /> CONTACTLESS DINING
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Scan, Order & Pay <br />
                  <span className="text-[#3D954F]">Right at the Table</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Allow diners to scan table QR codes, browse visual digital menus with modifiers, fire orders directly to the kitchen, and pay via UPI or card without waiting for a captain.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] transition-all shadow-lg">
                      Request QR Demo Kit →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* QR Mobile Screen Preview */}
              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-white rounded-2xl shadow-inner inline-block">
                  <div className="h-44 w-44 border-4 border-slate-900 rounded-lg p-2 flex flex-col justify-between items-center bg-slate-50">
                    <div className="text-[10px] font-black uppercase text-slate-900">RestroNex QR • Table 12</div>
                    <QrCode className="h-28 w-28 text-slate-900" />
                    <div className="text-[9px] text-slate-500 font-bold">Scan with Camera or Google Pay</div>
                  </div>
                </div>
                <div className="mt-4 text-sm font-bold text-white">No app download required</div>
                <div className="text-xs text-white/60 mt-1">Works instantly on Chrome, Safari, WhatsApp & UPI apps</div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3D954F]">SPEED & LABOUR EFFICIENCY</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">Handle 40% more tables with existing staff</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">Guests order refills and desserts on their own schedule without server bottlenecks.</p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center text-[#3D954F]">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Instant Kitchen Routing</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Orders placed from the phone QR immediately print on the bar or kitchen KDS, auto-tagged with Table Number and Guest Session.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Pay-at-Table via UPI</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Guests settle bills using GPay, PhonePe, Paytm, or Credit Cards directly on their browser. POS status updates to "Settled" automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center text-amber-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Visual Upsells & Modifiers</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  High-res photos, chef recommendations, and add-on prompts increase Average Order Value (AOV) by 18-22%.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#070B07] text-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black">Ready to launch contactless ordering?</h2>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3 text-sm font-bold text-white hover:bg-[#338a44]">
                Book Live Demonstration →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
