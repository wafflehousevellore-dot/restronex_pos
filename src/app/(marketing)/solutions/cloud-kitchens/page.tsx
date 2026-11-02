import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Cloud } from "lucide-react";

export default function CloudKitchensSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <Cloud className="h-3.5 w-3.5" /> CLOUD & GHOST KITCHENS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Multi-Brand Virtual Kitchen <br />
                  <span className="text-[#16845B]">Consolidation POS</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Run 8 brands from a single kitchen space. Receive Swiggy, Zomato, and Direct orders on one screen, route tickets to dedicated prep lines, and share central bulk raw ingredients.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                    Schedule Cloud Kitchen Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold text-[#16845B] uppercase tracking-wider">Unified Multi-Brand Screen</div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] flex justify-between items-center">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px]">Brand: Biryani Central</span>
                      <div className="font-bold text-[#172B25] mt-1 text-sm">2x Murgh Dum Biryani</div>
                    </div>
                    <span className="text-[#718078] text-[11px] font-medium">Swiggy (Rider in 8m)</span>
                  </div>
                  <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] flex justify-between items-center">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">Brand: Burger Co.</span>
                      <div className="font-bold text-[#172B25] mt-1 text-sm">1x Double Smash Cheeseburger</div>
                    </div>
                    <span className="text-[#718078] text-[11px] font-medium">Zomato (Prep line 2)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-[#172B25]">Virtual kitchen command tools</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Single KDS for All Brands</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Chefs prep food without jumping between different tablets or printer rolls for each virtual restaurant.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Shared Raw Stock BOM</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Onions, cooking oil, and chicken inventory deduct from one shared pantry regardless of which brand was ordered.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Auto Food Item 86 (Sold-Out)</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">When an ingredient runs out, auto-mark items across all aggregators simultaneously in one click.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
