import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Cloud, Layers, Truck, CheckCircle2 } from "lucide-react";

export default function CloudKitchensSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <Cloud className="h-3.5 w-3.5" /> CLOUD & GHOST KITCHENS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Multi-Brand Virtual Kitchen <br />
                  <span className="text-[#3D954F]">Consolidation POS</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Run 8 brands from a single kitchen space. Receive Swiggy, Zomato, and Direct orders on one screen, route tickets to dedicated prep lines, and share central bulk raw ingredients.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule Cloud Kitchen Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="text-xs font-bold text-[#3D954F] uppercase tracking-wider">Unified Multi-Brand Screen</div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold text-[10px]">Brand: Biryani Central</span>
                      <div className="font-bold text-white mt-1">2x Murgh Dum Biryani</div>
                    </div>
                    <span className="text-white/60">Swiggy (Rider in 8m)</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">Brand: Burger Co.</span>
                      <div className="font-bold text-white mt-1">1x Double Smash Cheeseburger</div>
                    </div>
                    <span className="text-white/60">Zomato (Prep line 2)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Virtual kitchen command tools</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Single KDS for All Brands</h3>
                <p className="mt-2 text-sm text-slate-600">Chefs prep food without jumping between different tablets or printer rolls for each virtual restaurant.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Shared Raw Stock BOM</h3>
                <p className="mt-2 text-sm text-slate-600">Onions, cooking oil, and chicken inventory deduct from one shared pantry regardless of which brand was ordered.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Auto Food Item 86 (Sold-Out)</h3>
                <p className="mt-2 text-sm text-slate-600">When an ingredient runs out, auto-mark items across all aggregators simultaneously in one click.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
