import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Cake, Scale, Calendar, CheckCircle2 } from "lucide-react";

export default function BakeriesSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <Cake className="h-3.5 w-3.5" /> BAKERIES & CONFECTIONERIES
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Custom Cake Orders & <br />
                  <span className="text-[#3D954F]">Weighing Scale Integration</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Take advance custom cake bookings with photo references, track delivery dates with calendar reminders, auto-calculate weight-based pricing, and track short-shelf-life batch expiry.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule Bakery Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="text-xs font-bold text-[#3D954F] uppercase tracking-wider">Custom Cake Booking Card</div>
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-white">
                    <span>Order #BK-302 (Birthday Cake)</span>
                    <span className="text-amber-400">Advance Paid: ₹500</span>
                  </div>
                  <div className="text-white/60">Flavor: Belgian Chocolate Mousse (1.5 kg)</div>
                  <div className="text-white/60">Message: "Happy 10th Birthday Aarav!"</div>
                  <div className="flex justify-between pt-2 border-t border-white/10 text-emerald-400 font-bold">
                    <span>Delivery: 24 Oct, 4:00 PM</span>
                    <span>Balance Due: ₹1,150</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Custom bakery POS tools</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Weighing Scale Barcodes</h3>
                <p className="mt-2 text-sm text-slate-600">Direct RS232 / USB digital scale hookup to auto-calculate price per gram for cookies, sweets, and savouries.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Batch & Expiry Tracking</h3>
                <p className="mt-2 text-sm text-slate-600">Track production batches with expiry dates to sell oldest batches first (FIFO) and prevent food waste.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Advance Payment Bookings</h3>
                <p className="mt-2 text-sm text-slate-600">Collect 50% advance for customized festival hampers with automatic SMS pickup reminders to the customer.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
