"use client";

import { useState, useEffect, Suspense } from "react";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import { pricingPlans as fallbackPlans } from "@/lib/brand";
import { Check, ArrowRight, Store, User, Mail, Phone, Sparkles, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GetStartedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center text-[#16845B] font-bold">Loading RestroNex setup...</div>}>
      <GetStartedContent />
    </Suspense>
  );
}

function GetStartedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [plans, setPlans] = useState<any[]>(fallbackPlans as any);
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    restaurantType: "Fine Dining",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam && ["starter", "growth", "business"].includes(planParam.toLowerCase())) {
      setSelectedPlan(planParam.toLowerCase());
    }
    const cycleParam = searchParams.get("cycle");
    if (cycleParam && ["MONTHLY", "ANNUAL"].includes(cycleParam.toUpperCase())) {
      setBillingCycle(cycleParam.toUpperCase() as "MONTHLY" | "ANNUAL");
    }

    fetch("/api/subscription-plans")
      .then((r) => r.json())
      .then((dbPlans) => {
        if (Array.isArray(dbPlans) && dbPlans.length) {
          const mapped = fallbackPlans.map((brandPlan) => {
            const db = dbPlans.find((p: any) => p.slug === brandPlan.slug);
            if (!db) return brandPlan;
            return {
              ...brandPlan,
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
  }, [searchParams]);

  const activePlan = plans.find((p) => p.slug === selectedPlan) || plans[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/pending-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          planSlug: selectedPlan,
          billingCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate registration");
      }

      router.push(data.next);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9] text-[#172B25]">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-3.5 py-1 text-xs font-bold text-[#16845B]">
              <Sparkles className="h-3.5 w-3.5 text-[#16845B]" /> INSTANT RESTAURANT ACTIVATION
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-[#172B25]">
              {step === 1 ? "Step 1: Choose Your Plan" : "Step 2: Enter Restaurant Details"}
            </h1>
            <p className="mt-2 text-sm text-[#718078]">
              {step === 1
                ? "Select the package that fits your outlet operations. Change or cancel anytime."
                : `Configuring for ${activePlan.name} Plan (₹${activePlan.priceMonthly}/mo + GST)`}
            </p>
          </div>

          {/* Step 1: Plan Selection */}
          {step === 1 && (
            <div className="mt-10">
              {/* Billing Cycle Switcher */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex rounded-full bg-white border border-[#E5EBE7] p-1.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("MONTHLY")}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                      billingCycle === "MONTHLY" ? "bg-[#16845B] text-white shadow-xs" : "text-[#718078] hover:text-[#172B25]"
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("ANNUAL")}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                      billingCycle === "ANNUAL" ? "bg-[#16845B] text-white shadow-xs" : "text-[#718078] hover:text-[#172B25]"
                    }`}
                  >
                    Annual (Save 16%)
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.slug;
                  const price = billingCycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
                  const unit = billingCycle === "ANNUAL" ? "/ yr" : "/ mo";

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.slug)}
                      className={`cursor-pointer rounded-2xl border p-6 flex flex-col justify-between transition-all bg-white ${
                        isSelected
                          ? "border-2 border-[#16845B] shadow-md ring-4 ring-[#16845B]/10 scale-[1.02]"
                          : "border-[#E5EBE7] shadow-xs hover:border-[#16845B]/50 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-black text-[#172B25]">{plan.name}</span>
                          {isSelected && (
                            <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] text-[#16845B] text-[10px] font-bold px-2.5 py-0.5">
                              Selected ✓
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#718078] mt-1">{plan.tagline}</div>

                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-[#172B25]">₹{price}</span>
                          <span className="text-xs text-[#718078]">{unit} + 18% GST</span>
                        </div>

                        <div className="mt-5 space-y-2.5 border-t border-[#E5EBE7] pt-4">
                          {plan.features.map((f: string) => (
                            <div key={f} className="flex items-start gap-2 text-xs text-[#172B25]">
                              <Check className="h-3.5 w-3.5 text-[#16845B] shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan.slug);
                          setStep(2);
                        }}
                        className={`mt-6 w-full rounded-full py-2.5 text-xs font-bold transition-all shadow-xs ${
                          isSelected
                            ? "bg-[#16845B] text-white hover:bg-[#116B49]"
                            : "border border-[#E5EBE7] bg-[#F8FAF9] text-[#172B25] hover:bg-white"
                        }`}
                      >
                        Continue with {plan.name} →
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full bg-[#16845B] px-8 py-3 text-sm font-bold text-white hover:bg-[#116B49] shadow-sm inline-flex items-center gap-2 transition"
                >
                  <span>Proceed to Restaurant Details</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Essential Business Details Form */}
          {step === 2 && (
            <div className="mt-10 max-w-xl mx-auto">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-sm">
                {/* Plan Summary Badge */}
                <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-4 mb-6">
                  <div>
                    <span className="text-xs text-[#718078]">Selected Package</span>
                    <div className="text-base font-black text-[#172B25]">{activePlan.name} Plan</div>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-[#16845B] underline font-semibold"
                    >
                      Change Plan
                    </button>
                    <div className="text-xs font-bold text-[#172B25]">₹{activePlan.priceMonthly}/mo</div>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#172B25] mb-1.5 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-[#16845B]" /> Restaurant / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spice Route Bistro"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full rounded-xl border border-[#E5EBE7] bg-white px-4 py-2.5 text-sm text-[#172B25] placeholder:text-[#718078] focus:border-[#16845B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#172B25] mb-1.5 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#16845B]" /> Owner / Manager Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full rounded-xl border border-[#E5EBE7] bg-white px-4 py-2.5 text-sm text-[#172B25] placeholder:text-[#718078] focus:border-[#16845B] focus:outline-none"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#172B25] mb-1.5 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#16845B]" /> Business Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="owner@restaurant.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-xl border border-[#E5EBE7] bg-white px-4 py-2.5 text-sm text-[#172B25] placeholder:text-[#718078] focus:border-[#16845B] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#172B25] mb-1.5 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#16845B]" /> Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-xl border border-[#E5EBE7] bg-white px-4 py-2.5 text-sm text-[#172B25] placeholder:text-[#718078] focus:border-[#16845B] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#172B25] mb-1.5">Restaurant Format</label>
                    <select
                      value={formData.restaurantType}
                      onChange={(e) => setFormData({ ...formData, restaurantType: e.target.value })}
                      className="w-full rounded-xl border border-[#E5EBE7] bg-white px-4 py-2.5 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
                    >
                      <option value="Fine Dining">Fine Dining / Casual Dine-in</option>
                      <option value="Cafe">Cafe & Roastery</option>
                      <option value="QSR">Quick Service Restaurant (QSR)</option>
                      <option value="Bakery">Bakery & Confectionery</option>
                      <option value="Pizzeria">Pizzeria & Italian</option>
                      <option value="Cloud Kitchen">Cloud & Ghost Kitchen</option>
                      <option value="Food Court">Food Court Stall</option>
                    </select>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-full bg-[#16845B] py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span>Validating Details...</span>
                      ) : (
                        <>
                          <span>Continue to Secure Checkout</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#718078] text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
                  <span>Secure 256-bit encrypted pending registration</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
