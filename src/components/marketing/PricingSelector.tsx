"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { pricingPlans as fallbackPlans } from "@/lib/brand";

type BillingCycle = "MONTHLY" | "ANNUAL";

export default function PricingSelector() {
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [plans, setPlans] = useState<any[]>(fallbackPlans as any);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    try {
      const c = document.cookie.split("; ").find((s) => s.startsWith("restronex_plan="));
      if (c) setSelected(decodeURIComponent(c.split("=")[1] || ""));
      const ls = localStorage.getItem("restronex_plan");
      if (ls && !selected) setSelected(ls);
    } catch {}

    fetch("/api/subscription-plans")
      .then((r) => r.json())
      .then((dbPlans) => {
        if (Array.isArray(dbPlans) && dbPlans.length) {
          const mapped = fallbackPlans.map((brand) => {
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
      })
      .catch(() => {});
  }, [selected]);

  function selectPlan(slug: string) {
    setSelected(slug);
    const payload = JSON.stringify({ planSlug: slug, billingCycle: cycle });
    try {
      localStorage.setItem("restronex_plan", slug);
      localStorage.setItem("restronex_checkout", payload);
      document.cookie = `restronex_plan=${encodeURIComponent(slug)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      document.cookie = `restronex_checkout=${encodeURIComponent(payload)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      document.cookie = `restronex_cycle=${cycle}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } catch {}
    router.push(`/get-started?plan=${slug}&cycle=${cycle}`);
  }

  return (
    <div className="bg-[#F8FAF9] px-4 py-12 text-[#172B25] border-y border-[#E5EBE7] mt-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex rounded-full bg-white border border-[#E5EBE7] p-1.5 shadow-xs">
            <button
              onClick={() => setCycle("MONTHLY")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                cycle === "MONTHLY"
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              Monthly — billed monthly
            </button>
            <button
              onClick={() => setCycle("ANNUAL")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                cycle === "ANNUAL"
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              Annually — save 16% ✨
            </button>
          </div>
          <div className="text-xs text-[#718078] font-medium text-center">
            Instant activation on Starter, Growth & Business • +18% GST on checkout • Official Razorpay Gateway
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isSelected = selected === plan.slug;
            const featured = plan.highlighted;
            const price = cycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
            const per = cycle === "ANNUAL" ? "/year" : "/month";
            const saveNote =
              cycle === "ANNUAL"
                ? `₹${(plan.priceMonthly * 12 - plan.priceAnnual).toLocaleString("en-IN")} saved vs monthly`
                : `₹${plan.priceMonthly.toLocaleString("en-IN")}/mo • ${plan.maxOutlets} outlets • ${plan.maxUsers} staff`;

            return (
              <div
                key={plan.slug}
                className={`relative flex flex-col rounded-2xl bg-white border transition-all ${
                  featured
                    ? "border-2 border-[#16845B] shadow-lg ring-4 ring-[#16845B]/10 md:-my-2"
                    : "border-[#E5EBE7] shadow-xs hover:shadow-md"
                } ${isSelected ? "ring-2 ring-[#16845B]" : ""}`}
              >
                {featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#16845B] px-3.5 py-0.5 text-[11px] font-black tracking-wide text-white shadow-xs">
                    MOST POPULAR
                  </div>
                )}
                <div className="relative border-b border-[#E5EBE7] p-6">
                  <h3 className={`text-xl font-black tracking-tight ${featured ? "text-[#16845B]" : "text-[#172B25]"}`}>
                    {plan.name.toUpperCase()}
                  </h3>
                  <p className="mt-1 text-sm text-[#718078]">{plan.tagline}</p>
                  <div className="mt-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black tracking-tight text-[#172B25]">{formatINR(price * 100)}</span>
                      <span className="text-sm font-medium text-[#718078]">{per}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#718078]">{saveNote} • +18% GST on checkout</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2.5 py-1 text-[#16845B] font-semibold">
                      {plan.maxOutlets} outlet{plan.maxOutlets > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2.5 py-1 text-[#16845B] font-semibold">
                      {plan.maxUsers} staff
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between p-6">
                  <div>
                    <p className="mb-3 text-xs font-bold tracking-wider text-[#718078] uppercase">WHAT&apos;S INCLUDED:</p>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16845B]" />
                          <span className="text-sm text-[#172B25]">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <button
                      onClick={() => selectPlan(plan.slug)}
                      className={`w-full gap-2 rounded-full py-3.5 text-sm font-black flex items-center justify-center transition-all cursor-pointer ${
                        featured
                          ? "bg-[#16845B] text-white hover:bg-[#116B49] shadow-sm"
                          : "border border-[#E5EBE7] bg-[#F8FAF9] text-[#172B25] hover:bg-[#E8F5EE] hover:text-[#16845B]"
                      } ${isSelected ? "opacity-75" : ""}`}
                    >
                      {isSelected ? "Selected ✓" : plan.cta} <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-[#718078]">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" /> Server-enforced limits • Razorpay verified
                    </div>
                    <div className="mt-2 text-center text-xs">
                      <Link
                        href={`/checkout?plan=${plan.slug}&cycle=${cycle}`}
                        className="text-[#16845B] hover:underline font-medium"
                      >
                        View checkout preview →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="text-xs text-[#718078] text-center">
            Preserved across signup → checkout → onboarding. Change anytime in{" "}
            <Link href="/checkout" className="text-[#16845B] underline font-medium">
              Checkout
            </Link>{" "}
            • GST 18% calculated server-side
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            <Link
              href="/sign-up?plan=growth&cycle=MONTHLY"
              className="rounded-full bg-[#16845B] text-white px-5 py-2.5 font-bold hover:bg-[#116B49] shadow-xs"
            >
              Get Started with Growth →
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-[#E5EBE7] bg-white text-[#172B25] px-5 py-2.5 font-bold hover:bg-[#F8FAF9] shadow-xs"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
