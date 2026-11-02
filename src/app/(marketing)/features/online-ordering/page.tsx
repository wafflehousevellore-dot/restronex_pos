import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Globe, Truck, DollarSign, Store } from "lucide-react";

export default function OnlineOrderingFeaturePage() {
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
                  <Globe className="h-3.5 w-3.5" /> 0% COMMISSION DIRECT ORDERING
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Your Own Branded <br />
                  <span className="text-[#16845B]">Online Food Ordering</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Stop losing 25-30% commissions on repeat orders. Launch a branded direct ordering website with your custom domain, live delivery fleet integration, and instant POS sync.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition-all shadow-xs">
                      Schedule Direct Ordering Demo →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition-colors shadow-xs">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>

              {/* Order Flow Showcase */}
              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#16845B]" />
                    <span className="text-xs font-bold text-[#172B25]">orders.yourrestaurant.in</span>
                  </div>
                  <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] px-2.5 py-1 rounded-full">Zero Commission</span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-4 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-[#172B25]">Direct Order #4092 • Delivery</div>
                      <div className="text-[#718078] text-[11px] mt-0.5">2x Butter Chicken Meal • 1x Garlic Naan</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#16845B] text-sm">₹850</div>
                      <div className="text-[10px] text-[#16845B] font-medium">Prepaid via UPI</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5 flex items-center justify-between text-xs text-[#172B25]">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#16845B]" />
                      <span className="font-medium">Rider Assigned • Dunzo / Shadowfax</span>
                    </div>
                    <span className="text-[#16845B] font-bold">In Transit (14m)</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 p-3 text-xs text-[#16845B] flex items-center gap-2 font-medium">
                  <DollarSign className="h-4 w-4 text-[#16845B] shrink-0" />
                  <span>You saved ₹255 in aggregator commissions on this order</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#16845B]">OWN YOUR CUSTOMER RELATIONSHIP</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#172B25]">Direct delivery storefront that synchronizes with your POS</h2>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Store className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Custom Domain Storefront</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Connect your own domain or subdomain with your restaurant&apos;s branding, color scheme, banner promotions, and discount coupon codes.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Fleet Dispatch Integrations</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Automatic rider dispatch through integrated logistics partners (Dunzo, Shadowfax, Porter) or manage your in-house delivery staff effortlessly.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <DollarSign className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Direct Bank Settlements</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Payments settle directly to your restaurant bank account via Razorpay without waiting for weekly aggregator payout cycles.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#E8F5EE]/40 border-t border-[#E5EBE7] text-[#172B25] py-16">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-[#172B25]">Take control of your online delivery business</h2>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/sign-up" className="rounded-full bg-[#16845B] px-7 py-3 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
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
