import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Zap, Monitor, Smartphone, CheckCircle2 } from "lucide-react";

export default function QsrSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <Zap className="h-3.5 w-3.5" /> QUICK SERVICE RESTAURANTS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  High-Speed 3-Second <br />
                  <span className="text-[#3D954F]">Billing for QSRs</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Clear long counter lines in seconds with rapid keyboard shortcuts, barcode scanner support, dual-screen customer displays, automated token number calling, and combo meal upsells.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule QSR Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="text-xs font-bold text-white/60 uppercase">Token Queue Display</div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <div className="text-[11px] font-bold text-amber-300">PREPARING</div>
                      <div className="text-2xl font-black text-white mt-1">#142, #144</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <div className="text-[11px] font-bold text-emerald-300">NOW READY</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">#140, #141</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Engineered for extreme volume during peak lunch & dinner rush</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Rapid 3-Click Checkout</h3>
                <p className="mt-2 text-sm text-slate-600">Preset cash denominations and dynamic UPI QR code generation on the counter screen eliminate change delays.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Token Pickup Management</h3>
                <p className="mt-2 text-sm text-slate-600">Auto-increment token numbers printed on receipts and broadcast to overhead TV displays when bumped on KDS.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Combo & Meal Deals</h3>
                <p className="mt-2 text-sm text-slate-600">Burger + Fries + Drink bundles with automatic ingredient inventory deduction for each combo choice.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
