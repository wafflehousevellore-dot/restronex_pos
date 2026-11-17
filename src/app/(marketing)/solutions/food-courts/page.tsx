import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multi-Vendor Food Court Central POS & Revenue Sharing",
  description: "Run complex food courts with unified prepaid card top-ups, single cashier counters that split KOTs to different brand kiosks, and automated daily tenant re... Built for Indian restaurants.",
  alternates: {
    canonical: "https://www.restronexpos.com/solutions/food-courts",
  },
  openGraph: {
    title: "Multi-Vendor Food Court Central POS & Revenue Sharing | RestroNex",
    description: "Run complex food courts with unified prepaid card top-ups, single cashier counters that split KOTs to different brand kiosks, and automated daily tenant re... Built for Indian restaurants.",
    url: "https://www.restronexpos.com/solutions/food-courts",
  },
};

import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Store } from "lucide-react";

export default function FoodCourtsSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <Store className="h-3.5 w-3.5" /> FOOD COURTS & MALL HUBS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Multi-Vendor Food Court <br />
                  <span className="text-[#16845B]">Central POS & Revenue Sharing</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Run complex food courts with unified prepaid card top-ups, single cashier counters that split KOTs to different brand kiosks, and automated daily tenant revenue settlement reports.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                    Schedule Food Court Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold text-[#16845B] uppercase tracking-wider">Multi-Stall KOT Split</div>
                <div className="mt-4 p-5 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl space-y-3 text-xs">
                  <div className="font-bold text-[#172B25] text-sm">Customer Order #FC-890</div>
                  <div className="p-3 bg-white rounded-lg border border-[#E5EBE7] flex justify-between items-center">
                    <span className="font-medium text-[#172B25]">Stall 1 (Dosa Express)</span>
                    <span className="text-[#16845B] font-bold bg-[#E8F5EE] px-2.5 py-0.5 rounded-full text-[11px]">KOT Fired (Token #41)</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#E5EBE7] flex justify-between items-center">
                    <span className="font-medium text-[#172B25]">Stall 4 (Burger Barn)</span>
                    <span className="text-[#16845B] font-bold bg-[#E8F5EE] px-2.5 py-0.5 rounded-full text-[11px]">KOT Fired (Token #18)</span>
                  </div>
                  <div className="pt-3 border-t border-[#E5EBE7] text-[#718078] flex justify-between items-center font-medium">
                    <span>Single Card / UPI Payment</span>
                    <span className="font-bold text-[#172B25] text-sm">₹580 Settled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-[#172B25]">Food court management capabilities</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Central Cash Counter</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Guests order from multiple food court brands on a single bill, with orders auto-routing to respective stall kitchens.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Revenue Sharing Audits</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Calculate CAM charges, utility deductions, and percentage revenue share for each stall vendor automatically.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Unified Overhead Token TV</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Single LED display across the dining hall shows ready tokens for all vendors simultaneously.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
