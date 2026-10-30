import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Users, Award, Gift, MessageSquare, TrendingUp, CheckCircle2, ShieldCheck, HeartHandshake } from "lucide-react";

export default function CrmLoyaltyFeaturePage() {
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
                  <Award className="h-3.5 w-3.5" /> RESTAURANT CRM & REWARDS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Turn First-Time Guests <br />
                  <span className="text-[#3D954F]">Into Regular Customers</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Build brand loyalty with automated guest profiling, points-per-rupee rewards, tiered cashback programs, and SMS/WhatsApp win-back campaigns directly tied to billing history.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] transition-all shadow-lg">
                      Schedule CRM Walkthrough →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* Customer Profile Card Preview */}
              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#3D954F] grid place-items-center text-white font-black text-sm">
                      AP
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Ananya Patel</div>
                      <div className="text-xs text-white/50">+91 98201 44321 • Platinum VIP</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 text-xs font-bold">
                    840 Points
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                    <div className="text-[11px] text-white/50">Visits</div>
                    <div className="text-base font-black text-white mt-0.5">14</div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                    <div className="text-[11px] text-white/50">Total Spent</div>
                    <div className="text-base font-black text-[#3D954F] mt-0.5">₹28,450</div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                    <div className="text-[11px] text-white/50">Avg Ticket</div>
                    <div className="text-base font-black text-white mt-0.5">₹2,032</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs font-bold text-white/70">Favorites & Dietary Notes</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white">Truffle Pizza</span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white">Iced Americano</span>
                    <span className="rounded-md bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 text-[11px]">Nut Allergy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3D954F]">REPEAT SALES ENGINE</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">Zero-friction customer capture right at billing</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">Phone-number unique CRM per tenant prevents duplicate records and tracks guest preferences across all your outlets.</p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center text-[#3D954F]">
                  <Gift className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Custom Loyalty Rules</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Earn points on total bill amount or specific categories. Set point redemption limits, expiration rules, and tier upgrades (Silver, Gold, Platinum).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">RFM Customer Segmentation</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Automatically categorize guests by Recency, Frequency, and Monetary spend. Target &quot;Dormant VIPs&quot; who haven&apos;t visited in 30 days with special offers.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 grid place-items-center text-purple-600">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Central Chain CRM</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Points earned at your Indiranagar outlet can be redeemed at your Koramangala outlet. True multi-outlet loyalty synchronization with fraud safeguards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#070B07] text-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black">Build a loyal community around your food</h2>
            <p className="mt-2 text-sm text-white/60 max-w-xl mx-auto">Start capturing customer profiles and rewarding loyalty on every bill.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/sign-up" className="rounded-full bg-[#3D954F] px-7 py-3 text-sm font-bold text-white hover:bg-[#338a44]">
                Get Started Today →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
