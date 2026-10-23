import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Check, Store, Utensils, Timer, BarChart3, Truck, Layers, ShieldCheck, Zap, CreditCard, Smartphone, ChefHat, ArrowUpRight, Mail, CheckCircle2, Users, FileText, ClipboardList, Headphones, BadgeDollarSign, Sparkles, HelpCircle, ChevronRight } from "lucide-react";
import { pricingPlans } from "@/lib/brand";

export default function HomePage() {
  const faqs = [
    { q: "Can I manage multiple outlets from a single login?", a: "Yes. Our Growth and Business plans support multi-outlet operations with central menu distribution, cross-outlet inventory transfers, and consolidated sales reports." },
    { q: "Does RestroNex work if the internet goes down?", a: "Yes. RestroNex includes local offline caching for fast counter billing and KOT generation. Data auto-synchronizes securely once the connection is restored." },
    { q: "How are taxes and GST calculated?", a: "RestroNex uses strict minor-unit integer arithmetic (paise) to calculate 9% CGST + 9% SGST (18% GST total) or custom tax brackets, eliminating floating-point rounding errors." },
    { q: "Can I change my plan later?", a: "Yes. You can upgrade or downgrade your subscription plan at any time through your restaurant settings, and entitlements update automatically." },
    { q: "What payment methods are supported for customer bills?", a: "Cash, Dynamic UPI QR codes (GPay, PhonePe, Paytm), Credit/Debit cards, split payments, and customer loyalty wallet redemptions." },
  ];

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-white text-slate-900">
        {/* ===== HERO — POS-first ===== */}
        <section className="relative overflow-hidden bg-[#070B07] text-white">
          <div className="absolute -top-40 -right-40 h-[700px] w-[700px] rounded-full bg-[#3D954F]/20 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-white/5 blur-[120px]" />
          <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 pt-12 pb-10 lg:pt-16 lg:pb-14">
            <div className="grid lg:grid-cols-[1.05fr_1.2fr] gap-8 lg:gap-10 items-center">
              <div>
                <h1 className="text-[34px] sm:text-[42px] lg:text-[50px] font-black tracking-tight leading-[1.05]">
                  Restaurant POS Software
                  <br />
                  <span className="text-white">That Runs Your</span>
                  <br />
                  <span className="text-[#3D954F]">Entire Outlet</span>
                </h1>
                <p className="mt-4 max-w-[560px] text-[15px] leading-7 text-white/70">
                  RestroNex is a fast, reliable POS built for Indian restaurants. Billing, KOT/KDS, tables, inventory, CRM, and 94 reports — one POS, fully offline-ready.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/get-started">
                    <button className="rounded-full bg-[#3D954F] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] transition-all shadow-lg hover:shadow-emerald-950">
                      Get Started →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                      View Pricing
                    </button>
                  </Link>
                </div>
                <div className="mt-6 flex items-center gap-4 text-xs text-white/50">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#3D954F] animate-pulse" /> Multi-Tenant Architecture
                  </span>
                  <span>✓ 14-Day Free Trial</span>
                  <span>•</span>
                  <span>✓ No Credit Card Required</span>
                </div>
              </div>

              <div className="relative">
                <div className="flex gap-2 justify-center lg:justify-start">
                  {[
                    { id: "billing", label: "3-Click Billing", active: true },
                    { id: "kot", label: "KOT → KDS" },
                    { id: "inventory", label: "Inventory" },
                    { id: "reports", label: "94 Reports" },
                  ].map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-full px-4 py-2 text-xs font-bold border ${
                        t.active ? "bg-[#3D954F] border-[#3D954F] text-white shadow" : "bg-white/5 border-white/15 text-white/70"
                      }`}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[24px] border border-white/10 bg-gradient-to-br from-[#111a14] to-black p-3 sm:p-4 shadow-2xl">
                  <div className="rounded-2xl bg-white overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        <span className="ml-2 text-xs font-bold text-slate-900 hidden sm:inline">RestroNex POS • Floor Plan • Live KOT</span>
                        <span className="ml-2 text-xs font-bold text-slate-900 sm:hidden">POS • Live</span>
                      </div>
                      <span className="rounded-full bg-[#3D954F] px-2.5 py-1 text-[10px] font-bold text-white">KOT SENT • Table 12</span>
                    </div>
                    <div className="grid grid-cols-[1.15fr_1fr] gap-0">
                      <div className="border-r border-slate-100 p-3 space-y-2 bg-slate-50/60">
                        <div className="grid grid-cols-3 gap-2">
                          {["T01 Free", "T02 Billing", "T03 KOT", "T04 Reserved", "T05 Free", "T06 Busy"].map((t) => (
                            <div
                              key={t}
                              className={`rounded-xl px-2 py-2 text-center text-[11px] font-bold border ${
                                t.includes("Free")
                                  ? "bg-white border-slate-200 text-slate-700"
                                  : t.includes("KOT")
                                  ? "bg-amber-100 border-amber-200 text-amber-800"
                                  : "bg-[#3D954F] text-white border-[#3D954F]"
                              }`}
                            >
                              {t}
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>Order #4092</span>
                            <span className="text-[#3D954F]">Table 12</span>
                          </div>
                          <div className="mt-1 text-slate-500 text-[11px]">2x Paneer Tikka • 1x Dal Makhani • 4x Roti</div>
                          <div className="mt-2 flex justify-between border-t border-slate-100 pt-1 text-slate-900 font-bold">
                            <span>Total (incl. GST)</span>
                            <span>₹848.00</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-white">
                        <div className="text-[11px] font-bold uppercase text-slate-400">Quick Items</div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {["Butter Chicken", "Paneer Tikka", "Dal Makhani", "Garlic Naan"].map((item) => (
                            <div key={item} className="rounded-lg border border-slate-100 p-2 text-left bg-slate-50 hover:bg-emerald-50 transition-colors">
                              <div className="text-[11px] font-bold text-slate-800">{item}</div>
                              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">₹240+</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 rounded-lg bg-[#3D954F]/10 border border-[#3D954F]/20 p-2 text-center">
                          <span className="text-[11px] font-bold text-[#3D954F]">3-Click Fast Settle Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== HONEST RESTAURANT FORMATS ===== */}
        <section className="bg-white border-y border-slate-100 py-6">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">Engineered for all restaurant formats</div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {[
                  "Fine-Dining & Bistros",
                  "Cafes & Roasteries",
                  "Quick Service (QSR)",
                  "Bakeries & Confectioneries",
                  "Pizzerias",
                  "Dessert & Ice Cream Parlors",
                  "Food Courts & Hubs",
                  "Cloud & Ghost Kitchens",
                  "Multi-Outlet Chains",
                ].map((format) => (
                  <span
                    key={format}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-700"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== 3 CORE PILLARS ===== */}
        <section className="py-14 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-xs font-bold tracking-widest text-[#3D954F] uppercase">THE RESTAURANT OS</div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">Everything needed to run an outlet with speed</h2>
              <p className="mt-2 text-sm text-slate-600">Built for speed during peak rush hours, accurate to the paise, and isolated per business tenant.</p>
            </div>

            <div className="mt-10 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center text-[#3D954F]">
                  <Store className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Fast Counter & Tableside Billing</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Fire KOTs, split checks, apply permissioned discounts, and accept Cash, Cards, and Dynamic UPI QR codes without lag.
                </p>
                <Link href="/features/pos" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#3D954F]">
                  Explore POS Billing →
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-600">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Inventory & Recipe BOM</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Raw ingredients auto-deduct when dishes are fulfilled. Track purchase orders, supplier costs, wastage, and low-stock alerts.
                </p>
                <Link href="/features/inventory" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                  Explore Inventory →
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center text-amber-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">94 Real-Time Reports</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Day-end sales summary, GST tax breakdowns (CGST + SGST), cashier shifts, item profitability, and multi-outlet benchmarks.
                </p>
                <Link href="/features/reports" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                  Explore Reports →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== THREE SUBSCRIPTION PLANS SECTION ===== */}
        <section className="bg-[#070B07] text-white py-16 border-t border-white/10" id="plans">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3D954F]">TRANSPARENT SUBSCRIPTION PRICING</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black">Choose the plan that fits your restaurant</h2>
              <p className="mt-3 text-sm text-white/60">Configurable plans with no hidden costs. 14-day free trial on all plans.</p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-[24px] border p-6 flex flex-col justify-between backdrop-blur transition-all ${
                    plan.highlighted
                      ? "border-[#3D954F] bg-[#0F1F14] shadow-2xl relative"
                      : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#3D954F] px-4 py-0.5 text-[11px] font-black uppercase text-white tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-black text-white">{plan.name}</div>
                    <div className="text-xs text-white/60 mt-1">{plan.tagline}</div>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">₹{plan.priceMonthly}</span>
                      <span className="text-xs text-white/50">/ month + GST</span>
                    </div>

                    <div className="mt-6 space-y-2.5 border-t border-white/10 pt-6">
                      {plan.features.map((feat) => (
                        <div key={feat} className="flex items-start gap-2.5 text-xs text-white/80">
                          <Check className="h-4 w-4 text-[#3D954F] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <Link href={`/get-started?plan=${plan.slug}`}>
                      <button
                        className={`w-full rounded-full py-3 text-xs font-bold transition-all shadow-md ${
                          plan.highlighted
                            ? "bg-[#3D954F] text-white hover:bg-[#338a44]"
                            : "bg-white text-slate-900 hover:bg-white/90"
                        }`}
                      >
                        Get Started with {plan.name} →
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FREQUENTLY ASKED QUESTIONS ===== */}
        <section className="py-16 bg-white border-t border-slate-100">
          <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3D954F]">QUESTIONS & ANSWERS</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
            </div>

            <div className="mt-10 space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[#3D954F] shrink-0" />
                    <span>{faq.q}</span>
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CONVERSION SECTION ===== */}
        <section className="bg-[#070B07] text-white py-14 border-t border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black">Ready to streamline your restaurant operations?</h2>
            <p className="mt-2 text-sm text-white/60 max-w-xl mx-auto">
              Start your 14-day free trial on any plan. Complete billing, KOT, and inventory in minutes.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/get-started">
                <button className="rounded-full bg-[#3D954F] px-8 py-3 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                  Get Started Now →
                </button>
              </Link>
              <Link href="/pricing">
                <button className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Compare All Features
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
