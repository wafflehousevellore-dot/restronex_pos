"use client";

import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricingPlans } from "@/lib/brand";
import { formatINR } from "@/lib/money";
import Link from "next/link";

/**
 * RestroNex-adapted Boxly pricing
 * Re-uses Boxly's corner-bracket + featured border layout
 * but injects RestroNex brand green (#3D954F), pricingPlans from lib/brand,
 * and RestroNex CTAs. Demonstrates how to wire real data/props.
 */
export default function BoxlyPricingRestroNex() {
  return (
    <div className="bg-[#070B07] px-4 py-16 text-white">
      <div className="mx-auto max-w-6xl border border-white/10 border-x-0 sm:border-x py-16 sm:py-20">
        {/* Header - Boxly style with RestroNex copy */}
        <div className="mb-10 grid grid-cols-1 items-center gap-6 px-4 md:grid-cols-12 md:px-10">
          <div className="md:col-span-8">
            <p className="mb-4 w-fit rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-[#3D954F]">
              SIMPLE, SCALABLE PRICING
            </p>
            <h2 className="text-3xl font-black tracking-tight md:text-5xl">
              Plans that fit your{" "}
              <span className="text-white/40">restaurant</span>
            </h2>
            <p className="mt-3 text-sm text-white/60 max-w-xl">
              Monthly or annual. Trials, outlet limits, Razorpay verified. Start on Starter, scale to Enterprise without migration.
            </p>
          </div>
          <div className="md:col-span-4 md:mt-auto">
            <p className="text-white/50 text-sm">
              <span className="text-white font-semibold">Simple pricing</span> with POS, inventory, KOT/KDS and multi-outlet growth baked in.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
              <Sparkles className="h-3.5 w-3.5 text-[#3D954F]" /> Trusted by 2,400+ restaurants
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border-t border-white/10">
          {pricingPlans.map((plan) => {
            const featured = plan.highlighted;
            return (
              <div key={plan.slug} className="relative flex flex-col">
                <div className={`relative flex h-full flex-col ${featured ? "border-2 border-[#3D954F] bg-[#0F1F14] z-10 sm:-my-2 shadow-xl" : "border border-white/10 bg-[#070B07] md:border-x-0 md:border-y"}`}>
                  {/* Title block with corner brackets (Boxly signature) */}
                  <div className="relative mb-6 border-b border-white/10 p-6">
                    <h3 className={`mb-2 text-xl font-black tracking-tight ${featured ? "text-[#3D954F]" : "text-white"}`}>{plan.name.toUpperCase()}</h3>
                    <p className="text-sm text-white/50">{plan.tagline}</p>
                    {!featured && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-[1px] -left-[1px] h-1.5 w-1.5 border-t-2 border-l-2 border-white/20" />
                        <div className="absolute -top-[1px] -right-[1px] h-1.5 w-1.5 border-t-2 border-r-2 border-white/20" />
                        <div className="absolute -bottom-[1px] -right-[1px] h-1.5 w-1.5 border-b-2 border-r-2 border-white/20" />
                        <div className="absolute -bottom-[1px] -left-[1px] h-1.5 w-1.5 border-b-2 border-l-2 border-white/20" />
                      </div>
                    )}
                    {featured && <div className="absolute top-4 right-4 rounded-full bg-[#3D954F] px-2.5 py-1 text-[10px] font-bold text-white">POPULAR</div>}
                  </div>

                  <div className="mb-6 px-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black tracking-tight text-white">{formatINR(plan.priceMonthly * 100)}</span>
                      <span className="text-sm text-white/40">/month</span>
                    </div>
                    <div className="mt-1 text-xs text-white/40">{formatINR(plan.priceAnnual * 100)}/year • Save 16% • {plan.maxOutlets} outlets • {plan.maxUsers} staff</div>
                  </div>

                  <div className="mb-8 flex-1 px-6">
                    <p className="mb-4 text-xs font-bold tracking-wide text-white/60">WHAT&apos;S INCLUDED:</p>
                    <ul className="mb-6 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check className={`mt-0.5 h-5 w-5 shrink-0 ${featured ? "text-[#3D954F]" : "text-white/30"}`} />
                          <span className="text-sm text-white/70">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.cta === "Contact Sales" ? "/contact" : "/sign-up"}>
                      <Button className={`w-full gap-2 rounded-full py-6 text-sm font-bold ${featured ? "bg-[#3D954F] text-white hover:bg-[#2e7a3e]" : "bg-white text-[#070B07] hover:bg-white/90"}`}>
                        {plan.cta.toUpperCase()} <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <p className="mt-3 text-center text-[11px] text-white/30">Server-enforced limits • Razorpay verified</p>
                  </div>
                  {!featured && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                      <div className="absolute -bottom-[1px] -right-[1px] h-1.5 w-1.5 border-b-2 border-r-2 border-white/20" />
                      <div className="absolute -bottom-[1px] -left-[1px] h-1.5 w-1.5 border-b-2 border-l-2 border-white/20" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-white/30 px-4">Entitlements from DB (not browser). Webhooks idempotent with signature verification. All prices in INR.</p>
      </div>
    </div>
  );
}
