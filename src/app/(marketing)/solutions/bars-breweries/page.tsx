import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Beer, CheckCircle2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "POS Software For Bars, Pubs & Microbreweries | RestroNex",
  description:
    "Speed up bar service with open bar tabs, keg volume depletion, ML-level bottle inventory, split drink checks, and separate kitchen & beverage bar KOT routing.",
  alternates: {
    canonical: "https://www.restronexpos.com/solutions/bars-breweries",
  },
  openGraph: {
    title: "POS Software For Bars, Pubs & Microbreweries | RestroNex",
    description: "Manage liquor inventory by the ML, open bar tabs, happy hour pricing, and lightning speed drink ticketing.",
    url: "https://www.restronexpos.com/solutions/bars-breweries",
  },
};

export default function BarsBreweriesPage() {
  const barFeatures = [
    {
      title: "Open Bar Tabs & Pre-Auth",
      desc: "Open customer tabs with a customer name or mobile number. Bartenders add drinks on the fly and settle when the guest leaves.",
    },
    {
      title: "ML-Level Liquor Stock Tracking",
      desc: "Track spirits down to 30ml and 60ml peg measures. Auto-deduct liquor inventory and receive alerts when high-value bottles run low.",
    },
    {
      title: "Automated Happy Hour Pricing",
      desc: "Configure 1+1 offers, timed discounts, and dynamic weekend pricing that trigger automatically without manual staff adjustments.",
    },
    {
      title: "Separate Bar & Kitchen KOT Routing",
      desc: "Cocktails and craft beers print instantly on the bar ticket printer, while food orders route seamlessly to the kitchen KDS.",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <Beer className="h-3.5 w-3.5" /> BARS, PUBS & BREWERIES
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  High-Speed Bar POS <br />
                  <span className="text-[#16845B]">& Liquor Inventory Control</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Handle crowded bar counters with ease. Manage open tabs, automate happy hours, track liquor down to the milliliter, and route drinks in milliseconds.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/book-demo"
                    className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs"
                  >
                    Schedule Bar Demo →
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="flex justify-between items-center text-xs font-bold text-[#16845B]">
                  <span>ACTIVE BAR TAB • VIP LOUNGE</span>
                  <span className="bg-[#E8F5EE] border border-[#16845B]/20 px-2.5 py-0.5 rounded-full text-[#16845B]">
                    Tab #42 (Arjun K.)
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#172B25]">Craft IPA Pint (500ml) × 3</div>
                      <div className="text-[#718078] text-[11px] mt-0.5">Keg #2 • Fresh Pour</div>
                    </div>
                    <span className="font-mono font-bold text-[#172B25]">₹1,170</span>
                  </div>
                  <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#172B25]">Single Malt 12Y (60ml Peg) × 2</div>
                      <div className="text-[#718078] text-[11px] mt-0.5">120ml deducted from Bottle #8</div>
                    </div>
                    <span className="font-mono font-bold text-[#172B25]">₹1,500</span>
                  </div>
                  <div className="p-3 bg-[#E8F5EE]/50 rounded-xl border border-[#16845B]/20 flex justify-between items-center font-bold text-[#16845B]">
                    <span>Happy Hour Discount (15%)</span>
                    <span>-₹400.50</span>
                  </div>
                  <div className="pt-3 border-t border-[#E5EBE7] flex justify-between items-center font-extrabold text-sm text-[#172B25]">
                    <span>Total Payable (incl. GST)</span>
                    <span className="text-[#16845B] font-mono">₹2,677.87</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">BAR WORKFLOW</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Engineered for High-Volume Nightlife & Pubs
              </h2>
            </div>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {barFeatures.map((f, i) => (
                <div key={i} className="p-5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center font-bold text-xs">
                    0{i + 1}
                  </div>
                  <h3 className="text-sm font-bold text-[#172B25]">{f.title}</h3>
                  <p className="text-xs text-[#718078] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
