import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Coffee, Zap, Award, Sparkles, CheckCircle2 } from "lucide-react";

export default function CafesSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <Coffee className="h-3.5 w-3.5" /> CAFE & COFFEE SHOP POS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Designed for Fast-Paced <br />
                  <span className="text-[#3D954F]">Cafes & Roasteries</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Speed through the morning coffee rush with 3-second billing, barista KDS screen routing, milk & syrup modifier tracking, and repeat customer loyalty rewards.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule Cafe Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="text-xs font-bold text-[#3D954F] uppercase tracking-wider">Barista Station KOT</div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">Oat Milk Cortado (Large)</div>
                      <div className="text-white/50 text-[11px]">+ Extra Shot • Sugar-Free Vanilla</div>
                    </div>
                    <span className="text-emerald-400 font-bold">Brewing</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">Avocado Sourdough Toast</div>
                      <div className="text-white/50 text-[11px]">Poached Egg • Microgreens</div>
                    </div>
                    <span className="text-amber-400 font-bold">Kitchen (4m)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Why top roasteries and specialty cafes choose RestroNex</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Custom Modifiers Matrix</h3>
                <p className="mt-2 text-sm text-slate-600">Almond milk, soy, oat, decaf, syrups, temperatures — seamless custom drink builder with ingredient auto-deduct.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Coffee Card Loyalty</h3>
                <p className="mt-2 text-sm text-slate-600">Digital "Buy 9 Get 10th Free" coffee stamp card stored directly on customer phone numbers.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Quick-Touch Takeaway Counter</h3>
                <p className="mt-2 text-sm text-slate-600">Rapid touchscreen keypad designed for high-throughput takeaway cash & UPI queues.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
