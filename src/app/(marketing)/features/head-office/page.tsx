import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Central Head Office Command & Control",
  description: "Manage 5 to 500 outlets from a single master dashboard. Push central recipes, standardize menu pricing with outlet overrides, track chain-wide food costs, ... Built for Indian restaurants.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/head-office",
  },
  openGraph: {
    title: "Central Head Office Command & Control | RestroNex",
    description: "Manage 5 to 500 outlets from a single master dashboard. Push central recipes, standardize menu pricing with outlet overrides, track chain-wide food costs, ... Built for Indian restaurants.",
    url: "https://www.restronexpos.com/features/head-office",
  },
};

import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Building2, Layers, BarChart3, RefreshCw } from "lucide-react";

export default function HeadOfficeFeaturePage() {
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
                  <Building2 className="h-3.5 w-3.5" /> ENTERPRISE CHAIN MANAGEMENT
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Central Head Office <br />
                  <span className="text-[#16845B]">Command & Control</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Manage 5 to 500 outlets from a single master dashboard. Push central recipes, standardize menu pricing with outlet overrides, track chain-wide food costs, and prevent shrinkage.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition-all shadow-xs">
                      Schedule Enterprise Demo →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition-colors shadow-xs">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* Head Office Dashboard Preview */}
              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#16845B]" />
                    <span className="text-xs font-bold text-[#172B25] uppercase tracking-wider">Chain Consolidated View • 12 Outlets</span>
                  </div>
                  <span className="rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20 px-2.5 py-0.5 text-[11px] font-bold">
                    Live Synced
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-4">
                    <div className="text-[11px] font-semibold text-[#718078]">Total Chain Revenue (Today)</div>
                    <div className="text-xl font-black text-[#172B25] mt-1">₹4,82,900</div>
                    <div className="text-[10px] text-[#16845B] font-medium mt-1">↑ 14.2% vs yesterday</div>
                  </div>
                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-4">
                    <div className="text-[11px] font-semibold text-[#718078]">Central Kitchen Stock</div>
                    <div className="text-xl font-black text-[#172B25] mt-1">94% Optimum</div>
                    <div className="text-[10px] text-[#718078] mt-1">4 transfers dispatched</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5">
                  <div className="flex justify-between text-xs text-[#718078] font-semibold mb-2">
                    <span>Outlet Performance</span>
                    <span>Sales</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#172B25]">
                      <span>1. Koramangala Flagship</span>
                      <span className="font-bold text-[#16845B]">₹84,200</span>
                    </div>
                    <div className="flex justify-between text-[#172B25]">
                      <span>2. Indiranagar Bistro</span>
                      <span className="font-bold text-[#16845B]">₹72,400</span>
                    </div>
                    <div className="flex justify-between text-[#172B25]">
                      <span>3. Whitefield Cloud Kitchen</span>
                      <span className="font-bold text-[#16845B]">₹58,100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#16845B]">CENTRALIZED GOVERNANCE</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#172B25]">Standardize your restaurant chain operations</h2>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">1-Click Menu Distribution</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Update item descriptions, add seasonal dishes, or adjust prices centrally and push updates to all outlets in seconds with preview and rollback audits.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Chain-Wide Analytics</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Compare outlet sales side-by-side, benchmark food costs, monitor cashier discount frequencies, and identify your most profitable franchise partners.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Central Kitchen & Transfers</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Generate bulk Goods Issue Notes (GIN) and track inter-outlet raw material transfers with automatic transit inventory valuation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#E8F5EE]/40 border-t border-[#E5EBE7] text-[#172B25] py-16">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-[#172B25]">Scale your restaurant brand effortlessly</h2>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                Talk to Enterprise Specialist →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
