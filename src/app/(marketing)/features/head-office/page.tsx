import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Building2, Layers, BarChart3, ShieldCheck, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

export default function HeadOfficeFeaturePage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        {/* Hero */}
        <section className="bg-[#070B07] text-white overflow-hidden py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <Building2 className="h-3.5 w-3.5" /> ENTERPRISE CHAIN MANAGEMENT
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Central Head Office <br />
                  <span className="text-[#3D954F]">Command & Control</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Manage 5 to 500 outlets from a single master dashboard. Push central recipes, standardize menu pricing with outlet overrides, track chain-wide food costs, and prevent shrinkage.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] transition-all shadow-lg">
                      Schedule Enterprise Demo →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* Head Office Dashboard Preview */}
              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#3D954F]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Chain Consolidated View • 12 Outlets</span>
                  </div>
                  <span className="rounded-full bg-[#3D954F]/20 text-[#3D954F] border border-[#3D954F]/40 px-2.5 py-0.5 text-[11px] font-bold">Live Synced</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] text-white/50">Total Chain Revenue (Today)</div>
                    <div className="text-xl font-black text-white mt-1">₹4,82,900</div>
                    <div className="text-[10px] text-emerald-400 mt-1">↑ 14.2% vs yesterday</div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] text-white/50">Central Kitchen Stock</div>
                    <div className="text-xl font-black text-white mt-1">94% Optimum</div>
                    <div className="text-[10px] text-white/60 mt-1">4 transfers dispatched</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="flex justify-between text-xs text-white/70 font-semibold mb-2">
                    <span>Outlet Performance</span>
                    <span>Sales</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-white/90">
                      <span>1. Koramangala Flagship</span>
                      <span className="font-bold">₹84,200</span>
                    </div>
                    <div className="flex justify-between text-white/90">
                      <span>2. Indiranagar Bistro</span>
                      <span className="font-bold">₹72,400</span>
                    </div>
                    <div className="flex justify-between text-white/90">
                      <span>3. Whitefield Cloud Kitchen</span>
                      <span className="font-bold">₹58,100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3D954F]">CENTRALIZED GOVERNANCE</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">Standardize your restaurant chain operations</h2>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center text-[#3D954F]">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">1-Click Menu Distribution</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Update item descriptions, add seasonal dishes, or adjust prices centrally and push updates to all outlets in seconds with preview and rollback audits.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Chain-Wide Analytics</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Compare outlet sales side-by-side, benchmark food costs, monitor cashier discount frequencies, and identify your most profitable franchise partners.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 grid place-items-center text-purple-600">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Central Kitchen & Transfers</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Generate bulk Goods Issue Notes (GIN) and track inter-outlet raw material transfers with automatic transit inventory valuation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#070B07] text-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black">Scale your restaurant brand effortlessly</h2>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3 text-sm font-bold text-white hover:bg-[#338a44]">
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
