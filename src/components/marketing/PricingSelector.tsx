"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { pricingPlans as fallbackPlans } from "@/lib/brand";

type BillingCycle = "MONTHLY" | "ANNUAL";

export default function PricingSelector() {
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [plans, setPlans] = useState<any[]>(fallbackPlans as any);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // load persisted selection
    try {
      const c = document.cookie.split("; ").find(s => s.startsWith("restronex_plan="));
      if (c) setSelected(decodeURIComponent(c.split("=")[1] || ""));
      const ls = localStorage.getItem("restronex_plan");
      if (ls && !selected) setSelected(ls);
    } catch {}
    // fetch live plans from DB for configurability
    fetch("/api/subscription-plans").then(r => r.json()).then(dbPlans => {
      if (Array.isArray(dbPlans) && dbPlans.length) {
        // map DB to UI shape preserving brand copy but using DB pricing/limits
        const mapped = fallbackPlans.map(brand => {
          const db = dbPlans.find((p: any) => p.slug === brand.slug);
          if (!db) return brand;
          return {
            ...brand,
            priceMonthly: Math.round(db.priceMonthlyPaise / 100),
            priceAnnual: Math.round(db.priceAnnualPaise / 100),
            maxOutlets: db.maxOutlets,
            maxUsers: db.maxUsers,
          };
        });
        setPlans(mapped);
      }
    }).catch(()=>{});
  }, []);

  function selectPlan(slug: string) {
    setLoading(true);
    setSelected(slug);
    const payload = JSON.stringify({ planSlug: slug, billingCycle: cycle });
    try {
      localStorage.setItem("restronex_plan", slug);
      localStorage.setItem("restronex_checkout", payload);
      document.cookie = `restronex_plan=${encodeURIComponent(slug)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
      document.cookie = `restronex_checkout=${encodeURIComponent(payload)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
      document.cookie = `restronex_cycle=${cycle}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
    } catch {}
    // preserve through auth: go to get-started with plan params
    window.location.href = `/get-started?plan=${slug}&cycle=${cycle}`;
  }

  return (
    <div className="bg-[#070B07] px-4 py-10 text-white border-y border-white/10 mt-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1">
            <button onClick={()=>setCycle("MONTHLY")} className={`rounded-full px-5 py-2 text-xs font-bold ${cycle==="MONTHLY" ? "bg-[#3D954F] text-white shadow" : "text-white/60 hover:text-white"}`}>Monthly — billed monthly</button>
            <button onClick={()=>setCycle("ANNUAL")} className={`rounded-full px-5 py-2 text-xs font-bold ${cycle==="ANNUAL" ? "bg-[#3D954F] text-white shadow" : "text-white/60 hover:text-white"}`}>Annually — save 16% ✨</button>
          </div>
          <div className="text-xs text-white/40">14-day free trial on Starter & Growth • No card for trial • Enterprise contact sales • +18% GST on checkout</div>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-0 border-t border-white/10">
          {plans.map((plan) => {
            const isSelected = selected === plan.slug;
            const featured = plan.highlighted;
            const price = cycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
            const per = cycle === "ANNUAL" ? "/year" : "/month";
            const saveNote = cycle === "ANNUAL" ? `₹${(plan.priceMonthly*12 - plan.priceAnnual).toLocaleString("en-IN")} saved vs monthly` : `₹${plan.priceMonthly.toLocaleString("en-IN")}/mo • ${plan.maxOutlets} outlets • ${plan.maxUsers} staff`;
            return (
              <div key={plan.slug} className={`relative flex flex-col ${isSelected ? "ring-2 ring-[#3D954F] ring-offset-2 ring-offset-[#070B07]" : ""}`}>
                <div className={`relative flex h-full flex-col ${featured ? "border-2 border-[#3D954F] bg-[#0F1F14] z-10 sm:-my-2 shadow-2xl" : "border border-white/10 bg-[#070B07] md:border-x-0"}`}>
                  <div className="relative border-b border-white/10 p-6">
                    <h3 className={`mb-1 text-xl font-black tracking-tight ${featured ? "text-[#3D954F]" : "text-white"}`}>{plan.name.toUpperCase()}</h3>
                    <p className="text-sm text-white/50">{plan.tagline}</p>
                    {featured && <div className="absolute top-4 right-4 rounded-full bg-[#3D954F] px-2.5 py-1 text-[10px] font-black text-white">POPULAR</div>}
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-white">{formatINR(price*100)}</span>
                        <span className="text-sm text-white/40">{per}</span>
                      </div>
                      <div className="mt-1 text-xs text-white/40">{saveNote} • {cycle==="ANNUAL" ? `${formatINR(price*100)}/yr` : `${formatINR(plan.priceMonthly*100)}/mo`} • +18% GST on checkout</div>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs">
                      <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-white/60">{plan.maxOutlets} outlet{plan.maxOutlets>1?'s':''}</span>
                      <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-white/60">{plan.maxUsers} staff</span>
                      <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-white/60">{plan.id}</span>
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    <p className="mb-3 text-xs font-bold tracking-wide text-white/60">WHAT&apos;S INCLUDED:</p>
                    <ul className="mb-6 space-y-2.5">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-[#3D954F]" : "text-white/30"}`} />
                          <span className="text-sm text-white/70">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button onClick={()=>selectPlan(plan.slug)} className={`w-full gap-2 rounded-full py-3.5 text-sm font-black flex items-center justify-center ${featured ? "bg-[#3D954F] text-white hover:bg-[#2e7a3e] shadow-lg" : "bg-white text-[#070B07] hover:bg-white/90"} ${isSelected ? "opacity-70" : ""}`}>
                      {isSelected ? "Selected ✓" : plan.cta} <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-white/30"><ShieldCheck className="h-3 w-3" /> Server-enforced limits • Razorpay test mode</div>
                    <div className="mt-2 text-center text-xs"><Link href={`/checkout?plan=${plan.slug}&cycle=${cycle}`} className="text-[#3D954F] hover:text-white underline">View checkout preview →</Link></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="text-xs text-white/30 text-center">Preserved across signup → checkout → onboarding. Change anytime in <Link href="/checkout" className="text-[#3D954F] underline">Checkout</Link> • GST 18% calculated server-side • Entitlements enforced by subscription status</div>
          <div className="flex gap-3 text-xs">
            <Link href="/sign-up?plan=growth&cycle=MONTHLY" className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-semibold text-white hover:bg-white/10">Get Started — Growth Trial →</Link>
            <Link href="/contact" className="rounded-full bg-white text-[#070B07] px-5 py-2.5 font-bold hover:bg-white/90">Talk to Sales</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
