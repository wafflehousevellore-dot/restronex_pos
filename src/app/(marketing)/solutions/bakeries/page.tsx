import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Cake Orders & Weighing Scale Integration",
  description: "Take advance custom cake bookings with photo references, track delivery dates with calendar reminders, auto-calculate weight-based pricing, and track short... Built for Indian restaurants.",
  alternates: {
    canonical: "https://www.restronexpos.com/solutions/bakeries",
  },
  openGraph: {
    title: "Custom Cake Orders & Weighing Scale Integration | RestroNex",
    description: "Take advance custom cake bookings with photo references, track delivery dates with calendar reminders, auto-calculate weight-based pricing, and track short... Built for Indian restaurants.",
    url: "https://www.restronexpos.com/solutions/bakeries",
  },
};

import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Cake } from "lucide-react";

export default function BakeriesSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <Cake className="h-3.5 w-3.5" /> BAKERIES & CONFECTIONERIES
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Custom Cake Orders & <br />
                  <span className="text-[#16845B]">Weighing Scale Integration</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Take advance custom cake bookings with photo references, track delivery dates with calendar reminders, auto-calculate weight-based pricing, and track short-shelf-life batch expiry.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                    Schedule Bakery Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold text-[#16845B] uppercase tracking-wider">Custom Cake Booking Card</div>
                <div className="mt-4 p-5 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl space-y-2.5 text-xs">
                  <div className="flex justify-between font-bold text-[#172B25]">
                    <span>Order #BK-302 (Birthday Cake)</span>
                    <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">Advance Paid: ₹500</span>
                  </div>
                  <div className="text-[#718078]">Flavor: Belgian Chocolate Mousse (1.5 kg)</div>
                  <div className="text-[#718078]">Message: &quot;Happy 10th Birthday Aarav!&quot;</div>
                  <div className="flex justify-between items-center pt-3 border-t border-[#E5EBE7] text-[#16845B] font-bold">
                    <span>Delivery: 24 Oct, 4:00 PM</span>
                    <span className="text-sm">Balance Due: ₹1,150</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-[#172B25]">Custom bakery POS tools</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Weighing Scale Barcodes</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Direct RS232 / USB digital scale hookup to auto-calculate price per gram for cookies, sweets, and savouries.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Batch & Expiry Tracking</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Track production batches with expiry dates to sell oldest batches first (FIFO) and prevent food waste.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Advance Payment Bookings</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Collect 50% advance for customized festival hampers with automatic SMS pickup reminders to the customer.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
