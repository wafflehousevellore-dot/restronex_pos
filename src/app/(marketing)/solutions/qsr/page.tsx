import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function QsrSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <Zap className="h-3.5 w-3.5" /> QUICK SERVICE RESTAURANTS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  High-Speed 3-Second <br />
                  <span className="text-[#16845B]">Billing for QSRs</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Clear long counter lines in seconds with rapid keyboard shortcuts, barcode scanner support, dual-screen customer displays, automated token number calling, and combo meal upsells.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                    Schedule QSR Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="text-center p-5 bg-[#F8FAF9] rounded-2xl border border-[#E5EBE7]">
                  <div className="text-xs font-bold text-[#718078] uppercase tracking-wider">Token Queue Display</div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="text-[11px] font-bold text-amber-800">PREPARING</div>
                      <div className="text-2xl font-black text-amber-950 mt-1">#142, #144</div>
                    </div>
                    <div className="p-4 bg-[#E8F5EE] border border-[#16845B]/20 rounded-xl">
                      <div className="text-[11px] font-bold text-[#16845B]">NOW READY</div>
                      <div className="text-2xl font-black text-[#16845B] mt-1">#140, #141</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-[#172B25]">Engineered for extreme volume during peak lunch & dinner rush</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Rapid 3-Click Checkout</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Preset cash denominations and dynamic UPI QR code generation on the counter screen eliminate change delays.
                </p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Token Pickup Management</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Auto-increment token numbers printed on receipts and broadcast to overhead TV displays when bumped on KDS.
                </p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Combo & Meal Deals</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Burger + Fries + Drink bundles with automatic ingredient inventory deduction for each combo choice.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
