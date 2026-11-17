import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan, Order & Pay Right at the Table",
  description: "Allow diners to scan table QR codes, browse visual digital menus with modifiers, fire orders directly to the kitchen, and pay via UPI or card without waiti... Built for Indian restaurants.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/qr-ordering",
  },
  openGraph: {
    title: "Scan, Order & Pay Right at the Table | RestroNex",
    description: "Allow diners to scan table QR codes, browse visual digital menus with modifiers, fire orders directly to the kitchen, and pay via UPI or card without waiti... Built for Indian restaurants.",
    url: "https://www.restronexpos.com/features/qr-ordering",
  },
};

import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { QrCode, Zap, CreditCard, Sparkles } from "lucide-react";

export default function QrOrderingFeaturePage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] overflow-hidden py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <QrCode className="h-3.5 w-3.5" /> CONTACTLESS DINING
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Scan, Order & Pay <br />
                  <span className="text-[#16845B]">Right at the Table</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Allow diners to scan table QR codes, browse visual digital menus with modifiers, fire orders directly to the kitchen, and pay via UPI or card without waiting for a captain.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition-all shadow-xs">
                      Request QR Demo Kit →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition-colors shadow-xs">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* QR Mobile Screen Preview */}
              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-[#F8FAF9] border border-[#E5EBE7] rounded-2xl shadow-xs inline-block">
                  <div className="h-44 w-44 border-4 border-[#16845B] rounded-lg p-2 flex flex-col justify-between items-center bg-white">
                    <div className="text-[10px] font-black uppercase text-[#16845B]">RestroNex QR • Table 12</div>
                    <QrCode className="h-28 w-28 text-[#172B25]" />
                    <div className="text-[9px] text-[#718078] font-bold">Scan with Camera or Google Pay</div>
                  </div>
                </div>
                <div className="mt-5 text-sm font-bold text-[#172B25]">No app download required</div>
                <div className="text-xs text-[#718078] mt-1">Works instantly on Chrome, Safari, WhatsApp & UPI apps</div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#16845B]">SPEED & LABOUR EFFICIENCY</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#172B25]">Handle 40% more tables with existing staff</h2>
              <p className="mt-3 text-sm sm:text-base text-[#718078]">
                Guests order refills and desserts on their own schedule without server bottlenecks.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Instant Kitchen Routing</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Orders placed from the phone QR immediately print on the bar or kitchen KDS, auto-tagged with Table Number and Guest Session.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Pay-at-Table via UPI</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Guests settle bills using GPay, PhonePe, Paytm, or Credit Cards directly on their browser. POS status updates to &quot;Settled&quot; automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Visual Upsells & Modifiers</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  High-res photos, chef recommendations, and add-on prompts increase Average Order Value (AOV) by 18-22%.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#E8F5EE]/40 border-t border-[#E5EBE7] text-[#172B25] py-16">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-[#172B25]">Ready to launch contactless ordering?</h2>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
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
