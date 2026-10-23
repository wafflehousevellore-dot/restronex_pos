import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Globe, Truck, DollarSign, Store, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function OnlineOrderingFeaturePage() {
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
                  <Globe className="h-3.5 w-3.5" /> 0% COMMISSION DIRECT ORDERING
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Your Own Branded <br />
                  <span className="text-[#3D954F]">Online Food Ordering</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Stop losing 25-30% commissions on repeat orders. Launch a branded direct ordering website with your custom domain, live delivery fleet integration, and instant POS sync.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] transition-all shadow-lg">
                      Schedule Direct Ordering Demo →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* Order Flow Showcase */}
              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-white">orders.yourrestaurant.in</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#3D954F]">Zero Commission</span>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">Direct Order #4092 • Delivery</div>
                      <div className="text-white/50 text-[11px]">2x Butter Chicken Meal • 1x Garlic Naan</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#3D954F]">₹850</div>
                      <div className="text-[10px] text-emerald-400">Prepaid via UPI</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between text-xs text-white/80">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-400" />
                      <span>Rider Assigned • Dunzo / Shadowfax</span>
                    </div>
                    <span className="text-blue-400 font-bold">In Transit (14m)</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>You saved ₹255 in aggregator commissions on this order</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3D954F]">OWN YOUR CUSTOMER RELATIONSHIP</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">Direct delivery storefront that synchronizes with your POS</h2>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center text-[#3D954F]">
                  <Store className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Custom Domain Storefront</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Connect your own domain or subdomain with your restaurant's branding, color scheme, banner promotions, and discount coupon codes.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-600">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Fleet Dispatch Integrations</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Automatic rider dispatch through integrated logistics partners (Dunzo, Shadowfax, Porter) or manage your in-house delivery staff effortlessly.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 grid place-items-center text-purple-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Direct Bank Settlements</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Payments settle directly to your restaurant bank account via Razorpay without waiting for weekly aggregator payout cycles.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#070B07] text-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black">Take control of your online delivery business</h2>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/sign-up" className="rounded-full bg-[#3D954F] px-7 py-3 text-sm font-bold text-white hover:bg-[#338a44]">
                Launch Your Ordering Site →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
