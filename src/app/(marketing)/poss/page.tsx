import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import TrustMetricsSection from "@/components/marketing/TrustMetricsSection";
import MarketplaceAddonsSection from "@/components/marketing/MarketplaceAddonsSection";
import OutletTypesSection from "@/components/marketing/OutletTypesSection";
import IndustryRatingsSection from "@/components/marketing/IndustryRatingsSection";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Receipt, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant POS Software — Touch Billing, Thermal Receipts & KOT | RestroNex",
  description:
    "Explore the RestroNex POS platform: 3-click counter billing, thermal printer integration (LAN, BT, USB), live table management, and recipe inventory tracking.",
  alternates: {
    canonical: "https://www.restronexpos.com/poss",
  },
  openGraph: {
    title: "Restaurant POS Software Made Simple | RestroNex",
    description: "Cloud-native, offline-ready restaurant billing software built for speed, accuracy, and reliability.",
    url: "https://www.restronexpos.com/poss",
  },
};

export default function PossPage() {
  const smartFeatures = [
    {
      title: "A quick 3-click restaurant billing software",
      desc: "Take orders, punch bills and fire KOT in seconds. Split bills by item or person, merge tables, apply discounts and coupons, and accept UPI, Card, and Cash without leaving the checkout screen.",
      bullets: [
        "Split bill by item or guest",
        "Merge & transfer active tables",
        "Configurable discount codes & coupons",
        "Paise-accurate integer GST math",
      ],
      link: "/features/pos",
      image: "/images/pos-billing-terminal.jpg",
      alt: "RestroNex touch POS billing terminal and thermal receipt printer",
    },
    {
      title: "Restaurant inventory management made easier",
      desc: "Smart recipe-level Bill-of-Materials (BOM) auto-deduction, low-stock alerts, and vendor purchase order management. Know your exact food cost percentage before the day ends.",
      bullets: [
        "Recipe-linked ingredient auto-deduction",
        "Vendor purchase orders with invoice tracking",
        "Automated low-stock threshold notifications",
        "Central commissary & kitchen transfers",
      ],
      link: "/features/inventory",
      image: "/images/analytics-inventory-dashboard.jpg",
      alt: "RestroNex inventory and recipe analytics dashboard",
    },
    {
      title: "Get real-time restaurant reports",
      desc: "Automate your restaurant reporting and eliminate paper guesswork. RestroNex tracks every transaction to generate 80+ audit-ready reports on day-end sales, hourly rushes, voids, and staff performance.",
      bullets: [
        "80+ downloadable Excel, CSV, PDF reports",
        "Day-End settlement in under 5 minutes",
        "Hourly sales velocity & peak rush analytics",
        "Immutable void & discount audit logs",
      ],
      link: "/features/reports",
      image: "/images/kitchen-kds-display.jpg",
      alt: "RestroNex live Kitchen Display System monitoring active tickets",
    },
    {
      title: "One online ordering system for all channels",
      desc: "Accept aggregator orders, dine-in QR orders, and direct brand website orders in one central screen. Auto-route to kitchen stations and track revenues without shuffling tablets.",
      bullets: [
        "Unified online aggregator pipeline",
        "Station-specific digital KDS routing",
        "Contactless table QR & mobile menu",
        "Centralized menu dispatch & item toggles",
      ],
      link: "/solutions",
      image: "/images/qr-whatsapp-billing.jpg",
      alt: "RestroNex contactless table QR ordering menu and WhatsApp PDF invoice delivery",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        {/* ========================================================= */}
        {/* HERO SECTION                                              */}
        {/* ========================================================= */}
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white border-b border-[#E5EBE7] text-[#172B25] overflow-hidden">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>RESTAURANT POS • BILLING • KOT</span>
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] lg:text-[56px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Restaurant POS <br />
                  <span className="text-[#16845B]">software made simple!</span>
                </h1>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#718078] max-w-xl">
                  Manage all your restaurant operations efficiently so that you can focus on growing your brand. Fast counter billing, live KOT routing, table management, recipe inventory, and 80+ audit-ready reports in one fast POS.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#16845B] hover:bg-[#116B49] px-7 py-3.5 text-sm font-bold text-white shadow-xs transition flex items-center gap-2 cursor-pointer">
                      <span>Take a free demo</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs transition cursor-pointer">
                      View Pricing
                    </button>
                  </Link>
                </div>
                <div className="mt-6 flex items-center gap-4 text-xs font-semibold text-[#718078]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
                    <span>1,00,000+ Outlets</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
                    <span>0% Billing Errors</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
                    <span>Offline-Ready</span>
                  </div>
                </div>
              </div>

              {/* Interactive Floor Plan & Active Order Card */}
              <div className="rounded-[28px] border border-[#E5EBE7] bg-white p-5 shadow-xl">
                <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 text-[#172B25]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#16845B] animate-pulse" />
                      <span>RestroNex POS • Live Floor Plan</span>
                    </span>
                    <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B] px-3 py-1 text-[11px] font-bold">
                      KOT SENT • Table 12
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {[
                      { name: "T01 Free", status: "free" },
                      { name: "T02 Billing", status: "busy" },
                      { name: "T03 KOT", status: "kot" },
                      { name: "T04 Reserved", status: "free" },
                      { name: "T05 Free", status: "free" },
                      { name: "T06 Busy", status: "busy" },
                    ].map((t) => (
                      <div
                        key={t.name}
                        className={`rounded-xl px-2 py-3 text-center text-xs font-bold border transition ${
                          t.status === "free"
                            ? "bg-white border-[#E5EBE7] text-[#718078]"
                            : t.status === "kot"
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-[#16845B] border-[#16845B] text-white"
                        }`}
                      >
                        {t.name}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl bg-white border border-[#E5EBE7] text-[#172B25] p-3.5 shadow-2xs">
                    <div className="text-xs font-bold flex justify-between">
                      <span>Active Dining Order • Table 02</span>
                      <span className="text-[#16845B] font-mono">Dine-In #104</span>
                    </div>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#718078]">Margherita Pizza ×2</span>
                        <span className="font-bold font-mono">₹598.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#718078]">Paneer Tikka Platter ×1</span>
                        <span className="font-bold font-mono">₹349.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#718078]">Fresh Lime Soda ×2</span>
                        <span className="font-bold font-mono">₹198.00</span>
                      </div>
                      <div className="flex justify-between border-t border-[#E5EBE7] pt-2 font-black text-[#16845B]">
                        <span>Total (incl. 5% GST)</span>
                        <span className="font-mono">₹1,202.25</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-xs font-bold text-center">
                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3 text-[#172B25]">
                    ⚡ 3-Click Bill
                    <div className="text-[11px] text-[#718078] font-normal mt-0.5">Split / Merge</div>
                  </div>
                  <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3 text-[#172B25]">
                    📦 Recipe Stock
                    <div className="text-[11px] text-[#718078] font-normal mt-0.5">Auto Deduction</div>
                  </div>
                  <div className="rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B] p-3 font-bold">
                    📊 80+ Reports
                    <div className="text-[11px] text-[#718078] font-normal mt-0.5">Day-End &lt;5min</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* TRUST METRICS SECTION                                     */}
        {/* ========================================================= */}
        <TrustMetricsSection />

        {/* ========================================================= */}
        {/* 4 SMART POS CAPABILITIES                                  */}
        {/* ========================================================= */}
        <section className="bg-white border-b border-[#E5EBE7] py-20">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-[0.16em] text-[#16845B] uppercase">SMART POS FEATURES</span>
              <h2 className="mt-2 text-2xl sm:text-4xl font-black text-[#172B25] tracking-tight">
                A Restaurant POS Made for All Your Needs
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#718078] leading-relaxed">
                A quick and easy-to-use restaurant billing software that makes managing high order volumes butter smooth.
              </p>
            </div>

            <div className="mt-14 space-y-8">
              {smartFeatures.map((f, i) => (
                <div
                  key={f.title}
                  className={`rounded-[28px] border border-[#E5EBE7] bg-[#F8FAF9] p-6 sm:p-8 flex flex-col ${
                    i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  } gap-8 items-center shadow-2xs hover:shadow-sm transition`}
                >
                  <div className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#16845B]">
                      0{i + 1} • CORE CAPABILITY
                    </span>
                    <h3 className="mt-1.5 text-xl sm:text-2xl font-black text-[#172B25] leading-snug">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#718078]">{f.desc}</p>
                    <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-xs">
                      {f.bullets.map((b) => (
                        <li
                          key={b}
                          className="rounded-xl bg-white border border-[#E5EBE7] px-3.5 py-2 font-medium text-[#172B25] flex items-center gap-2"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={f.link}
                      className="mt-6 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#16845B] hover:text-[#116B49] transition"
                    >
                      <span>Explore feature details</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="flex-1 relative rounded-2xl overflow-hidden border border-[#E5EBE7] bg-white w-full aspect-[16/10] shadow-xs">
                    <Image
                      src={f.image}
                      alt={f.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* APP MARKETPLACE & ADD-ONS                                 */}
        {/* ========================================================= */}
        <MarketplaceAddonsSection />

        {/* ========================================================= */}
        {/* OUTLET TYPES (ALL 10 FOOD FORMATS)                        */}
        {/* ========================================================= */}
        <OutletTypesSection />

        {/* ========================================================= */}
        {/* INDUSTRY RATINGS & TESTIMONIALS                           */}
        {/* ========================================================= */}
        <IndustryRatingsSection />

        {/* ========================================================= */}
        {/* INTEGRATIONS SHOWCASE                                     */}
        {/* ========================================================= */}
        <section className="bg-white text-[#172B25] py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <div className="text-xs font-bold tracking-[0.16em] text-[#16845B] uppercase">INTEGRATIONS HUB</div>
            <h2 className="mt-2 text-2xl sm:text-4xl font-black text-[#172B25] tracking-tight">
              One POS, Every Integration Connected
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#718078] max-w-2xl mx-auto leading-relaxed">
              Manage third-party delivery aggregators, payment gateways, accounting systems, and marketing tools directly from your central RestroNex workspace.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto">
              {[
                "Swiggy",
                "Zomato",
                "Razorpay",
                "PhonePe",
                "Paytm",
                "Google Pay UPI",
                "Meta WhatsApp",
                "Tally Prime",
                "Zoho Books",
                "SAP Business One",
                "BUSY Accounting",
                "DOTPE",
                "UrbanPiper",
              ].map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-[#F8FAF9] text-[#172B25] px-4 py-2 text-xs font-bold border border-[#E5EBE7] shadow-2xs hover:border-[#16845B]/40 transition"
                >
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/integrations">
                <button className="rounded-full bg-[#16845B] hover:bg-[#116B49] px-7 py-3.5 text-sm font-bold text-white shadow-xs transition cursor-pointer">
                  See all integrations →
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* CTA BANNER                                                */}
        {/* ========================================================= */}
        <section className="py-16 bg-[#16845B] text-white">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-black">
              Ready to Upgrade to RestroNex Restaurant POS?
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-white/85 leading-relaxed">
              Experience the fastest billing speed in the industry with 0% downtime and round-the-clock priority technical support.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link href="/get-started">
                <button className="rounded-full bg-white text-[#16845B] px-8 py-3 text-xs font-black hover:bg-[#F8FAF9] shadow-sm transition cursor-pointer">
                  Start Free Trial →
                </button>
              </Link>
              <Link href="/contact">
                <button className="rounded-full border border-white/30 bg-white/10 text-white px-7 py-3 text-xs font-bold hover:bg-white/20 transition cursor-pointer">
                  Talk to POS Specialist
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
