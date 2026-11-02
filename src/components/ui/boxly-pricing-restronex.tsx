"use client";

import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricingPlans } from "@/lib/brand";
import { formatINR } from "@/lib/money";
import Link from "next/link";

/**
 * RestroNex-adapted Boxly pricing
 * Re-uses Boxly's corner-bracket + featured border layout
 * in the clean, modern light theme (#16845B, #FFFFFF, #E8F5EE, #172B25).
 */
export default function BoxlyPricingRestroNex() {
  return (
    <div className="bg-[#F8FAF9] px-4 py-16 text-[#172B25]">
      <div className="mx-auto max-w-6xl border border-[#E5EBE7] bg-white rounded-3xl overflow-hidden shadow-xs py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10 grid grid-cols-1 items-center gap-6 px-6 md:grid-cols-12 md:px-10">
          <div className="md:col-span-8">
            <p className="mb-4 w-fit rounded-full border border-[#16845B]/20 bg-[#E8F5EE] px-3.5 py-1 text-xs font-semibold tracking-wide text-[#16845B]">
              SIMPLE, SCALABLE PRICING
            </p>
            <h2 className="text-3xl font-black tracking-tight text-[#172B25] md:text-5xl">
              Plans that fit your{" "}
              <span className="text-[#718078]">restaurant</span>
            </h2>
            <p className="mt-3 text-sm text-[#718078] max-w-xl">
              Monthly or annual. Trials, outlet limits, Razorpay verified. Start on Starter, scale to Enterprise without migration.
            </p>
          </div>
          <div className="md:col-span-4 md:mt-auto">
            <p className="text-[#718078] text-sm">
              <span className="text-[#172B25] font-semibold">Simple pricing</span> with POS, inventory, KOT/KDS and multi-outlet growth baked in.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#718078]">
              <Sparkles className="h-3.5 w-3.5 text-[#16845B]" /> Trusted by 2,400+ restaurants across India
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border-t border-[#E5EBE7]">
          {pricingPlans.map((plan) => {
            const featured = plan.highlighted;
            return (
              <div key={plan.slug} className="relative flex flex-col">
                <div
                  className={`relative flex h-full flex-col ${
                    featured
                      ? "border-2 border-[#16845B] bg-[#E8F5EE]/40 z-10 sm:-my-2 rounded-2xl shadow-md"
                      : "border border-[#E5EBE7] bg-white md:border-x-0 md:border-y"
                  }`}
                >
                  {/* Title block */}
                  <div className="relative mb-6 border-b border-[#E5EBE7] p-6">
                    <h3 className={`mb-2 text-xl font-black tracking-tight ${featured ? "text-[#16845B]" : "text-[#172B25]"}`}>
                      {plan.name.toUpperCase()}
                    </h3>
                    <p className="text-sm text-[#718078]">{plan.tagline}</p>
                    {featured && (
                      <div className="absolute top-4 right-4 rounded-full bg-[#16845B] px-3 py-1 text-[10px] font-bold text-white tracking-wide">
                        MOST POPULAR
                      </div>
                    )}
                  </div>

                  <div className="mb-6 px-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black tracking-tight text-[#172B25]">{formatINR(plan.priceMonthly * 100)}</span>
                      <span className="text-sm text-[#718078]">/month</span>
                    </div>
                    <div className="mt-1 text-xs text-[#718078]">
                      {formatINR(plan.priceAnnual * 100)}/year • Save 16% • {plan.maxOutlets} outlets • {plan.maxUsers} staff
                    </div>
                  </div>

                  <div className="mb-8 flex-1 px-6">
                    <p className="mb-4 text-xs font-bold tracking-wide text-[#172B25]">WHAT&apos;S INCLUDED:</p>
                    <ul className="mb-6 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check className={`mt-0.5 h-5 w-5 shrink-0 ${featured ? "text-[#16845B]" : "text-[#718078]"}`} />
                          <span className="text-sm text-[#718078]">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.cta === "Contact Sales" ? "/contact" : "/sign-up"}>
                      <Button
                        className={`w-full gap-2 rounded-full py-6 text-sm font-bold shadow-xs transition ${
                          featured
                            ? "bg-[#16845B] text-white hover:bg-[#116B49]"
                            : "bg-[#172B25] text-white hover:bg-black"
                        }`}
                      >
                        {plan.cta.toUpperCase()} <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <p className="mt-3 text-center text-[11px] text-[#718078]">Server-enforced limits • Razorpay verified</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
