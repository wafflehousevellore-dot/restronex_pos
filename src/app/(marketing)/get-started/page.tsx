"use client";

import { useState, useEffect, Suspense } from "react";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import { pricingPlans } from "@/lib/brand";
import { Check, ArrowRight, Store, User, Mail, Phone, Sparkles, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GetStartedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070B07] flex items-center justify-center text-emerald-400">Loading RestroNex setup...</div>}>
      <GetStartedContent />
    </Suspense>
  );
}

function GetStartedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
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
  }, [searchParams]);

  const activePlan = pricingPlans.find((p) => p.slug === selectedPlan) || pricingPlans[0];

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
    <>
      <Navbar />
      <main className="min-h-screen bg-[#070B07] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
              <Sparkles className="h-3.5 w-3.5" /> 14-DAY RISK-FREE TRIAL
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black">
              {step === 1 ? "Step 1: Choose Your Plan" : "Step 2: Enter Restaurant Details"}
            </h1>
            <p className="mt-2 text-sm text-white/60">
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
                <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("MONTHLY")}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                      billingCycle === "MONTHLY" ? "bg-[#3D954F] text-white shadow" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("ANNUAL")}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                      billingCycle === "ANNUAL" ? "bg-[#3D954F] text-white shadow" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Annual (Save 16%)
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {pricingPlans.map((plan) => {
                  const isSelected = selectedPlan === plan.slug;
                  const price = billingCycle === "ANNUAL" ? Math.round(plan.priceAnnual / 12) : plan.priceMonthly;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.slug)}
                      className={`cursor-pointer rounded-[24px] border p-6 flex flex-col justify-between transition-all ${
                        isSelected
                          ? "border-[#3D954F] bg-[#0F1F14] shadow-2xl ring-2 ring-[#3D954F]/50 scale-[1.02]"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-black text-white">{plan.name}</span>
                          {isSelected && (
                            <span className="rounded-full bg-[#3D954F] text-white text-[10px] font-bold px-2.5 py-0.5">
                              Selected ✓
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/50 mt-1">{plan.tagline}</div>

                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white">₹{price}</span>
                          <span className="text-xs text-white/50">/ mo + GST</span>
                        </div>

                        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                          {plan.features.map((f) => (
                            <div key={f} className="flex items-start gap-2 text-xs text-white/80">
                              <Check className="h-3.5 w-3.5 text-[#3D954F] shrink-0 mt-0.5" />
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
                        className={`mt-6 w-full rounded-full py-2.5 text-xs font-bold transition-all shadow-md ${
                          isSelected
                            ? "bg-[#3D954F] text-white hover:bg-[#338a44]"
                            : "bg-white/10 text-white hover:bg-white/20"
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
                  className="rounded-full bg-[#3D954F] px-8 py-3 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg inline-flex items-center gap-2"
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
              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 sm:p-8 shadow-2xl">
                {/* Plan Summary Badge */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                  <div>
                    <span className="text-xs text-white/50">Selected Package</span>
                    <div className="text-base font-black text-white">{activePlan.name} Plan</div>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-emerald-400 underline font-semibold"
                    >
                      Change Plan
                    </button>
                    <div className="text-xs font-bold text-white">₹{activePlan.priceMonthly}/mo</div>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1.5 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-[#3D954F]" /> Restaurant / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spice Route Bistro"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#3D954F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1.5 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#3D954F]" /> Owner / Manager Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#3D954F] focus:outline-none"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-1.5 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#3D954F]" /> Business Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="owner@restaurant.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#3D954F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-white/80 mb-1.5 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#3D954F]" /> Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#3D954F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1.5">Restaurant Format</label>
                    <select
                      value={formData.restaurantType}
                      onChange={(e) => setFormData({ ...formData, restaurantType: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-[#0F1F14] px-4 py-3 text-sm text-white focus:border-[#3D954F] focus:outline-none"
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

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-full bg-[#3D954F] py-3.5 text-sm font-bold text-white hover:bg-[#338a44] transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span>Validating Details...</span>
                      ) : (
                        <>
                          <span>Create Account & Start Trial</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/40 text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Secure 256-bit encrypted pending registration</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
