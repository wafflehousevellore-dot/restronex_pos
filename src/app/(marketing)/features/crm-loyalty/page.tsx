import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Award, Gift, TrendingUp, HeartHandshake } from "lucide-react";

export default function CrmLoyaltyFeaturePage() {
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
                  <Award className="h-3.5 w-3.5" /> RESTAURANT CRM & REWARDS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Turn First-Time Guests <br />
                  <span className="text-[#16845B]">Into Regular Customers</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Build brand loyalty with automated guest profiling, points-per-rupee rewards, tiered cashback programs, and SMS/WhatsApp win-back campaigns directly tied to billing history.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition-all shadow-xs">
                      Schedule CRM Walkthrough →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition-colors shadow-xs">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* Customer Profile Card Preview */}
              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#16845B] grid place-items-center text-white font-black text-sm">
                      AP
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#172B25]">Ananya Patel</div>
                      <div className="text-xs text-[#718078]">+91 98201 44321 • Platinum VIP</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20 px-3 py-1 text-xs font-bold">
                    840 Points
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3">
                    <div className="text-[11px] font-semibold text-[#718078]">Visits</div>
                    <div className="text-base font-black text-[#172B25] mt-0.5">14</div>
                  </div>
                  <div className="rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 p-3">
                    <div className="text-[11px] font-semibold text-[#16845B]">Total Spent</div>
                    <div className="text-base font-black text-[#16845B] mt-0.5">₹28,450</div>
                  </div>
                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3">
                    <div className="text-[11px] font-semibold text-[#718078]">Avg Ticket</div>
                    <div className="text-base font-black text-[#172B25] mt-0.5">₹2,032</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5">
                  <div className="text-xs font-bold text-[#172B25]">Favorites & Dietary Notes</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-md bg-white border border-[#E5EBE7] px-2.5 py-1 text-[11px] font-medium text-[#172B25]">Truffle Pizza</span>
                    <span className="rounded-md bg-white border border-[#E5EBE7] px-2.5 py-1 text-[11px] font-medium text-[#172B25]">Iced Americano</span>
                    <span className="rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-[11px] font-medium">Nut Allergy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#16845B]">REPEAT SALES ENGINE</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#172B25]">Zero-friction customer capture right at billing</h2>
              <p className="mt-3 text-sm sm:text-base text-[#718078]">
                Phone-number unique CRM per tenant prevents duplicate records and tracks guest preferences across all your outlets.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Gift className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Custom Loyalty Rules</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Earn points on total bill amount or specific categories. Set point redemption limits, expiration rules, and tier upgrades (Silver, Gold, Platinum).
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">RFM Customer Segmentation</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Automatically categorize guests by Recency, Frequency, and Monetary spend. Target &quot;Dormant VIPs&quot; who haven&apos;t visited in 30 days with special offers.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Central Chain CRM</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Points earned at your Indiranagar outlet can be redeemed at your Koramangala outlet. True multi-outlet loyalty synchronization with fraud safeguards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#E8F5EE]/40 border-t border-[#E5EBE7] text-[#172B25] py-16">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-[#172B25]">Build a loyal community around your food</h2>
            <p className="mt-2 text-sm text-[#718078] max-w-xl mx-auto">Start capturing customer profiles and rewarding loyalty on every bill.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/sign-up" className="rounded-full bg-[#16845B] px-7 py-3 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
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
