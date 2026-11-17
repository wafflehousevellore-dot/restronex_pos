import React from "react";
import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import POSInteractivePreview from "@/components/marketing/POSInteractivePreview";
import SoftwareShowcaseSection from "@/components/marketing/SoftwareShowcaseSection";
import Link from "next/link";
import {
  Check,
  Store,
  Truck,
  HelpCircle,
  Printer,
  MessageSquare,
  ChefHat,
  ShieldCheck,
  Layers,
  ArrowRight,
  Sparkles,
  Clock,
  CreditCard,
  Receipt,
  CheckCircle2,
  Phone,
  Mail,
} from "lucide-react";
import { brand, pricingPlans, pricingComparison } from "@/lib/brand";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "RestroNex — Cloud Restaurant POS, KOT/KDS & Billing Software",
  description:
    "All-in-one restaurant POS operating system for India. Fast counter billing, real-time KOT/KDS kitchen automation, contactless QR ordering, recipe inventory tracking, and automated WhatsApp bills.",
  alternates: {
    canonical: "https://www.restronexpos.com",
  },
  openGraph: {
    title: "RestroNex — Cloud Restaurant POS, KOT/KDS & Billing Software",
    description:
      "All-in-one restaurant POS operating system for India. Fast counter billing, real-time KOT/KDS kitchen automation, contactless QR ordering, and recipe inventory.",
    url: "https://www.restronexpos.com",
    siteName: "RestroNex",
    images: [
      {
        url: "/images/pos-billing-terminal.jpg",
        width: 1200,
        height: 630,
        alt: "RestroNex Restaurant POS Billing Terminal",
      },
    ],
  },
};

export default function HomePage() {
  const starterPlan = pricingPlans.find((p) => p.slug === "starter") || pricingPlans[0];
  const growthPlan = pricingPlans.find((p) => p.slug === "growth") || pricingPlans[1];
  const businessPlan = pricingPlans.find((p) => p.slug === "business") || pricingPlans[2];

  const faqs = [
    {
      q: "What hardware and printers does RestroNex support?",
      a: "RestroNex supports standard ESC/POS thermal receipt printers across Bluetooth SPP (mobile & tablets), Network Ethernet/Wi-Fi LAN (kitchen stations via port 9100), and USB direct desktop connections. Both 80mm full-width and 58mm compact rolls are supported.",
    },
    {
      q: "How does automated WhatsApp invoice delivery work?",
      a: "RestroNex connects directly to the official Meta WhatsApp Business Cloud API. As soon as a cashier or waiter settles an order with customer consent, an itemized digital receipt with a direct PDF invoice link is dispatched to the customer's phone number.",
    },
    {
      q: "Can customers order from their tables using QR codes?",
      a: "Yes. In Growth and Business plans, each table generates a unique QR code. Guests scan the code with their smartphone camera, browse the live menu with veg/non-veg tags, customize dishes, and place orders directly to the kitchen without downloading any app.",
    },
    {
      q: "How does recipe-level inventory deduction operate?",
      a: "You define Bill-of-Materials (BOM) recipes linking menu dishes to raw store ingredients (e.g. 200g paneer, 50g cream per Paneer Butter Masala). When an order is placed and accepted in the kitchen, ingredient stock counts auto-deduct in real time.",
    },
    {
      q: "How are GST and taxes calculated?",
      a: "RestroNex uses strict minor-unit integer arithmetic (paise) to calculate 9% CGST + 9% SGST (18% GST total) or custom tax brackets. This ensures zero rounding discrepancies on audit logs and financial ledgers.",
    },
    {
      q: "Can I manage multiple outlets from a single master dashboard?",
      a: "Yes. Our Growth and Business plans support multi-outlet operations with central menu catalogs, outlet-specific pricing, cross-outlet inventory transfers, and aggregated chain performance reports.",
    },
    {
      q: "What subscription plans are available?",
      a: `We offer three simple plans: Starter at ₹${starterPlan.priceMonthly}/month (1 outlet, 5 staff), Growth at ₹${growthPlan.priceMonthly}/month (up to 5 outlets, 25 staff, full inventory and QR ordering), and Business at ₹${businessPlan.priceMonthly}/month (up to 50 outlets, 200 staff, multi-chain features). Applicable 18% GST is displayed separately at checkout.`,
    },
  ];

  const operationalSteps = [
    {
      step: "01",
      title: "Order Placement",
      desc: "Fast counter billing with keyboard shortcuts, handheld waiter tablet ordering, or contactless table QR self-ordering by guests.",
      icon: Store,
    },
    {
      step: "02",
      title: "Instant Kitchen Routing",
      desc: "Digital KOT instantly fired to station-specific Kitchen Display Screens (KDS) and routed to hot-kitchen, bar, and bakery thermal printers.",
      icon: ChefHat,
    },
    {
      step: "03",
      title: "Recipe Inventory Depletion",
      desc: "Raw ingredients auto-deduct from stock based on Bill of Materials recipes with real-time low-stock threshold notifications.",
      icon: Truck,
    },
    {
      step: "04",
      title: "1-Click Bill Settlement",
      desc: "Split payments across Cash, Cards, and Dynamic UPI QR codes (GPay, PhonePe, Paytm) with exact paise integer math.",
      icon: CreditCard,
    },
    {
      step: "05",
      title: "Paperless WhatsApp Delivery",
      desc: "Official Meta WhatsApp Cloud API automatically sends an itemized tax invoice PDF link directly to the customer's smartphone.",
      icon: MessageSquare,
    },
  ];

  const solutions = [
    { name: "Fine-Dining & Bistros", desc: "Multi-course service, table reservation timelines, course firing, and split billing.", href: "/solutions/fine-dine" },
    { name: "Cafes & Roasteries", desc: "High-speed counter checkout, milk/bean inventory tracking, and loyalty rewards.", href: "/solutions/cafes" },
    { name: "Quick Service (QSR)", desc: "Lightning fast 3-click token billing, combo meals, and customer-facing order screens.", href: "/solutions/qsr" },
    { name: "Bakeries & Confectionery", desc: "Batch production tracking, expiry dates, custom celebration cake pre-orders.", href: "/solutions/bakeries" },
    { name: "Pizzerias & Italian", desc: "Crust, topping & size modifiers, combo pricing, and rapid delivery dispatch.", href: "/solutions/pizzerias" },
    { name: "Dessert & Ice Cream Parlors", desc: "Weight-based pricing, flavor modifiers, and rapid contactless payment queues.", href: "/solutions/dessert-shops" },
    { name: "Food Courts & Hubs", desc: "Prepaid cards, multi-brand tenant management, and centralized food court cashiers.", href: "/solutions/food-courts" },
    { name: "Cloud & Ghost Kitchens", desc: "Multi-brand virtual menus from a single kitchen, packaging stock control.", href: "/solutions/cloud-kitchens" },
    { name: "Restaurant Chains", desc: "Central recipe management, cross-outlet transfers, and consolidated chain reports.", href: "/solutions/chains" },
  ];

  return (
    <>
      <Navbar />

      <main className="flex-1 bg-[#F8FAF9] text-[#172B25]">
        {/* ========================================================= */}
        {/* SECTION 1 & 2: HERO & STRONG POSITIONING                  */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F5EE]/70 via-[#F8FAF9] to-white border-b border-[#E5EBE7]">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#16845B]/5 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#16845B]/5 blur-[120px] pointer-events-none" />

          <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-18 lg:pb-20">
            <div className="grid lg:grid-cols-[1.1fr_1.15fr] gap-10 lg:gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1.5 text-xs font-bold text-[#16845B]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>The Production-Ready Restaurant OS for India</span>
                </div>

                <h1 className="mt-4 text-[36px] sm:text-[46px] lg:text-[54px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Restaurant POS
                  <br />
                  <span>That Accelerates</span>
                  <br />
                  <span className="text-[#16845B]">Every Service Hour</span>
                </h1>

                <p className="mt-4 max-w-[560px] text-[15px] sm:text-[16px] leading-relaxed text-[#718078]">
                  Built for independent dining rooms, QSR counters, cafes, and multi-outlet chains.
                  Experience 3-click billing, contactless table QR ordering, multi-station KDS, ESC/POS thermal printing, and automated WhatsApp invoices.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/get-started">
                    <button className="rounded-full bg-[#16845B] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs flex items-center gap-2">
                      <span>Start Now from ₹{starterPlan.priceMonthly}/mo</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs transition">
                      Compare Plans
                    </button>
                  </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-[#E5EBE7] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-[#718078]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Minor-Unit Math</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>ESC/POS Thermal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>WhatsApp Cloud API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Razorpay Verified</span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* SECTION 3: REALISTIC RESTAURANT POS INTERACTIVE PREVIEW   */}
              {/* ========================================================= */}
              <POSInteractivePreview />
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: INTERACTIVE PRODUCT OVERVIEW                   */}
        {/* ========================================================= */}
        <section className="py-16 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">CORE CAPABILITIES</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Engineered for Peak Restaurant Rush Hours
              </h2>
              <p className="mt-2 text-sm text-[#718078]">
                Every component is designed to eliminate billing delays, prevent kitchen miscommunication, and safeguard your margins.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:shadow-xs transition space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <Store className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Lightning Counter & Dine-in Billing</h3>
                <p className="text-xs leading-relaxed text-[#718078]">
                  Complete orders in 3 taps. Supports modifier add-ons, split bills, customer discount codes, and integrated paise-level GST tax math.
                </p>
                <Link href="/features/pos" className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
                  Explore POS Billing <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:shadow-xs transition space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <ChefHat className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Smart Kitchen Display & KOT Routing</h3>
                <p className="text-xs leading-relaxed text-[#718078]">
                  Route food and beverage tickets to dedicated kitchen stations. Monitor preparation timers, ticket completion, and reduce food waste.
                </p>
                <Link href="/features/kitchen-display" className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
                  Explore KDS System <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:shadow-xs transition space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Recipe-Level BOM Inventory Control</h3>
                <p className="text-xs leading-relaxed text-[#718078]">
                  Link raw ingredients to menu dishes. Stock auto-depletes when dishes are prepared. Track purchase orders and wastage accurately.
                </p>
                <Link href="/features/inventory" className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
                  Explore Inventory <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:shadow-xs transition space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <Printer className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Thermal Printer Hardware Support</h3>
                <p className="text-xs leading-relaxed text-[#718078]">
                  Native ESC/POS support across Bluetooth SPP (mobile POS), Network LAN (kitchen stations port 9100), and USB counters in 80mm & 58mm.
                </p>
                <Link href="/features/printers" className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
                  Explore Thermal Printers <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:shadow-xs transition space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Meta WhatsApp Cloud Bill Delivery</h3>
                <p className="text-xs leading-relaxed text-[#718078]">
                  Auto-deliver itemized PDF tax receipts directly to customer mobile numbers upon bill settlement. Eliminate thermal paper costs.
                </p>
                <Link href="/features/whatsapp-invoices" className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
                  Explore WhatsApp Bills <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:shadow-xs transition space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Multi-Outlet Chain Architecture</h3>
                <p className="text-xs leading-relaxed text-[#718078]">
                  Centrally control menus, outlet pricing, staff roles, and cross-branch stock transfers. Aggregated owner analytics at your fingertips.
                </p>
                <Link href="/features/multi-outlet" className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
                  Explore Multi-Outlet <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SOFTWARE VISUAL GALLERY                                   */}
        {/* ========================================================= */}
        <SoftwareShowcaseSection />

        {/* ========================================================= */}
        {/* SECTION 5: RESTAURANT OPERATIONS WORKFLOW                 */}
        {/* ========================================================= */}
        <section className="py-16 bg-[#F8FAF9] border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">HOW IT WORKS</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                5-Step Restaurant Operational Flow
              </h2>
              <p className="mt-2 text-sm text-[#718078]">
                From the moment a customer enters to post-dining invoice delivery, RestroNex runs seamless end-to-end operations.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {operationalSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="p-5 rounded-2xl bg-white border border-[#E5EBE7] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#16845B] bg-[#E8F5EE] px-2.5 py-1 rounded-full">
                        {step.step}
                      </span>
                      <Icon className="h-4 w-4 text-[#718078]" />
                    </div>
                    <h4 className="text-sm font-bold text-[#172B25]">{step.title}</h4>
                    <p className="text-xs text-[#718078] leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6 & 7: TABLE MANAGEMENT & QR ORDERING DEMO        */}
        {/* ========================================================= */}
        <section className="py-16 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">TABLE & QR MANAGEMENT</span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                  Real-Time Floor Plan & Contactless Table QR Ordering
                </h2>
                <p className="mt-3 text-sm text-[#718078] leading-relaxed">
                  Organize dining zones (Indoor, AC Dining, Rooftop, Terrace, Bar). Waiters seat guests with one tap, relocate orders between tables, and check occupied or billed statuses in real-time.
                </p>
                <div className="mt-6 space-y-3 text-xs text-[#172B25] font-semibold">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Dynamic Table QR tokens generated instantly with printable SVG cards</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Guests browse mobile web menu without downloading any app</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Cooking notes and item modifiers passed directly to kitchen KOT</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Customer mobile number opt-in for automated WhatsApp invoice</span>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <Link href="/features/table-management">
                    <button className="rounded-full bg-[#16845B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                      Explore Tables →
                    </button>
                  </Link>
                  <Link href="/features/qr-ordering">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-5 py-2.5 text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9]">
                      QR Ordering Flow
                    </button>
                  </Link>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
                  <div className="text-xs font-bold text-[#172B25]">Main Dining Floor (8 Tables)</div>
                  <span className="text-[11px] font-bold text-[#16845B] bg-[#E8F5EE] px-2.5 py-0.5 rounded-full">
                    5 Occupied • 3 Available
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { num: "01", status: "Available", seats: "2 Seats", bg: "bg-white border-[#E5EBE7] text-[#718078]" },
                    { num: "02", status: "Occupied", seats: "4 Seats", bg: "bg-[#16845B] text-white border-[#16845B]" },
                    { num: "03", status: "KOT Sent", seats: "4 Seats", bg: "bg-amber-50 text-amber-900 border-amber-300" },
                    { num: "04", status: "Bill Out", seats: "6 Seats", bg: "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/30" },
                    { num: "05", status: "Occupied", seats: "2 Seats", bg: "bg-[#16845B] text-white border-[#16845B]" },
                    { num: "06", status: "Available", seats: "4 Seats", bg: "bg-white border-[#E5EBE7] text-[#718078]" },
                    { num: "07", status: "KOT Sent", seats: "6 Seats", bg: "bg-amber-50 text-amber-900 border-amber-300" },
                    { num: "08", status: "Available", seats: "8 Seats", bg: "bg-white border-[#E5EBE7] text-[#718078]" },
                  ].map((tb) => (
                    <div key={tb.num} className={`p-3 rounded-2xl border text-center ${tb.bg}`}>
                      <div className="text-sm font-extrabold">Table {tb.num}</div>
                      <div className="text-[10px] mt-0.5">{tb.seats}</div>
                      <div className="text-[10px] font-bold mt-1 uppercase">{tb.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 8: KOT & KITCHEN DISPLAY SYSTEM                   */}
        {/* ========================================================= */}
        <section className="py-16 bg-[#F8FAF9] border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="p-5 rounded-3xl bg-white border border-[#E5EBE7] space-y-4 shadow-sm order-2 lg:order-1">
                <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-4 w-4 text-[#16845B]" />
                    <span className="text-xs font-bold text-[#172B25]">Kitchen Station Display</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    3 Active Tickets
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border-2 border-[#16845B] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#172B25]">KOT #102 • Table 04</span>
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">PREPARING</span>
                    </div>
                    <div className="text-xs font-mono text-[#172B25] space-y-1">
                      <div>2x Tandoori Chicken Half (Extra crispy)</div>
                      <div>1x Garlic Butter Roti (No butter on 1)</div>
                    </div>
                    <div className="pt-2 border-t border-[#E5EBE7] flex justify-between items-center text-[11px]">
                      <span className="text-amber-700 font-bold">⏱ 04:32</span>
                      <span className="text-[#16845B] font-bold">Mark Ready →</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#172B25]">KOT #103 • Table 02</span>
                      <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">NEW TICKET</span>
                    </div>
                    <div className="text-xs font-mono text-[#172B25] space-y-1">
                      <div>1x Veg Hakka Noodles</div>
                      <div>1x Chilli Paneer Dry</div>
                    </div>
                    <div className="pt-2 border-t border-[#E5EBE7] flex justify-between items-center text-[11px]">
                      <span className="text-blue-700 font-bold">⏱ 00:45</span>
                      <span className="text-[#16845B] font-bold">Accept Ticket →</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">KITCHEN WORKFLOW</span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                  Zero Misplaced Tickets & Live Station Routing
                </h2>
                <p className="mt-3 text-sm text-[#718078] leading-relaxed">
                  Eliminate verbal confusion and paper delays. Orders automatically split by department: hot kitchen, Chinese wok, tandoor counter, beverage bar, and dessert bakery.
                </p>
                <div className="mt-6 space-y-3 text-xs text-[#172B25] font-semibold">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Color-coded urgency timers notify chefs before orders turn late</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Instant sound alerts when new KOT is dispatched from table or counter</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>Bump tickets with touch screen or Bluetooth keyboard</span>
                  </div>
                </div>
                <div className="mt-8">
                  <Link href="/features/kitchen-display">
                    <button className="rounded-full bg-[#16845B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                      Learn More About KDS →
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 9: INVENTORY & PURCHASE MANAGEMENT                */}
        {/* ========================================================= */}
        <section className="py-16 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">INVENTORY CONTROL</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Raw Ingredient Tracking & Recipe Costing
              </h2>
              <p className="mt-2 text-sm text-[#718078]">
                Stop guessing food costs. RestroNex dynamically depletes inventory as dishes are billed and alerts you before ingredients run out.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Recipe Bill-of-Materials (BOM)</h3>
                <p className="text-xs text-[#718078] leading-relaxed">
                  Map every menu item to exact ingredient portions (grams, ml, pieces). Calculates accurate plate food cost and margins automatically.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Low Stock Threshold Alerts</h3>
                <p className="text-xs text-[#718078] leading-relaxed">
                  Never 86 a signature dish midway through a Saturday dinner rush. Receive automated alerts when butter, milk, or paneer fall below reorder thresholds.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#172B25]">Supplier Purchase Orders (PO)</h3>
                <p className="text-xs text-[#718078] leading-relaxed">
                  Track vendor price variance across suppliers. Create, approve, and record stock receiving with supplier tax invoice tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 12 & 13: HARDWARE & WHATSAPP DELIVERY             */}
        {/* ========================================================= */}
        <section className="py-16 bg-[#F8FAF9] border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Card 1: Printers */}
              <div className="p-7 rounded-3xl bg-white border border-[#E5EBE7] space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#172B25]">ESC/POS Thermal Hardware</h3>
                    <p className="text-xs text-[#718078]">Bluetooth, Ethernet LAN & USB</p>
                  </div>
                </div>
                <p className="text-xs text-[#718078] leading-relaxed">
                  Print customer tax invoices and kitchen order tickets on standard ESC/POS thermal printers.
                  Pair Bluetooth thermal printers directly from Chrome via Web Bluetooth or configure Ethernet IP printers (port 9100) for hot kitchen grease-proof printing.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-bold text-[#172B25]">
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div>80mm & 58mm</div>
                    <div className="text-[10px] text-[#718078] font-normal">Paper Roll Support</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div>Port 9100</div>
                    <div className="text-[10px] text-[#718078] font-normal">LAN Direct Socket</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div>Web Bluetooth</div>
                    <div className="text-[10px] text-[#718078] font-normal">Mobile SPP Pairing</div>
                  </div>
                </div>
              </div>

              {/* Card 2: WhatsApp */}
              <div className="p-7 rounded-3xl bg-white border border-[#E5EBE7] space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] grid place-items-center">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#172B25]">Official Meta WhatsApp Cloud API</h3>
                    <p className="text-xs text-[#718078]">Instant Paperless Invoicing</p>
                  </div>
                </div>
                <p className="text-xs text-[#718078] leading-relaxed">
                  Send digital PDF tax invoices straight to customers on WhatsApp immediately after order settlement.
                  Compliant with customer consent requirements, official Meta utility message templates, and instant wa.me fallback links.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-bold text-[#172B25]">
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div>100% Paperless</div>
                    <div className="text-[10px] text-[#718078] font-normal">Eco & Cost Efficient</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div>Meta Verified</div>
                    <div className="text-[10px] text-[#718078] font-normal">Cloud API Gateway</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
                    <div>wa.me Fallback</div>
                    <div className="text-[10px] text-[#718078] font-normal">1-Click Direct Link</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 14: RESTAURANT SOLUTIONS                          */}
        {/* ========================================================= */}
        <section className="py-16 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">FITS EVERY FORMAT</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Tailored for Every Type of Dining Establishment
              </h2>
              <p className="mt-2 text-sm text-[#718078]">
                From single counter coffee bars to 50-branch fine dining franchises, RestroNex adapts to your service model.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {solutions.map((sol) => (
                <Link
                  key={sol.name}
                  href={sol.href}
                  className="p-5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:bg-white hover:shadow-2xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#172B25] group-hover:text-[#16845B] transition">
                      {sol.name}
                    </h4>
                    <ArrowRight className="h-4 w-4 text-[#718078] group-hover:text-[#16845B] group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-xs text-[#718078] mt-2 leading-relaxed">{sol.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 16: PRICING (₹99 / ₹199 / ₹299)                   */}
        {/* ========================================================= */}
        <section className="py-16 bg-[#F8FAF9] border-b border-[#E5EBE7]" id="pricing">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">SIMPLE PRICING</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Transparent Restaurant Subscription Plans
              </h2>
              <p className="mt-2 text-sm text-[#718078]">
                Clear limits, zero hidden fees, and instantaneous online onboarding via Razorpay checkout.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6 items-stretch">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between transition ${
                    plan.highlighted
                      ? "border-2 border-[#16845B] bg-white shadow-lg relative"
                      : "border-[#E5EBE7] bg-white shadow-2xs hover:shadow-xs"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#16845B] px-3.5 py-0.5 text-[10px] font-black uppercase text-white tracking-wider shadow-2xs">
                      Recommended
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#172B25]">{plan.name}</h3>
                      <p className="text-xs text-[#718078] mt-1">{plan.tagline}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-[#172B25]">₹{plan.priceMonthly}</span>
                      <span className="text-xs font-semibold text-[#718078]">/month</span>
                      <span className="text-[11px] text-[#718078] ml-1">{plan.gstNote}</span>
                    </div>

                    <div className="pt-4 border-t border-[#E5EBE7] space-y-2 text-xs text-[#172B25]">
                      {plan.features.map((feat) => (
                        <div key={feat} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-[#16845B] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E5EBE7]">
                    <Link href={`/checkout?plan=${plan.slug}`}>
                      <button
                        className={`w-full py-3 rounded-full text-xs font-bold transition shadow-2xs ${
                          plan.highlighted
                            ? "bg-[#16845B] hover:bg-[#116B49] text-white"
                            : "border border-[#E5EBE7] bg-[#F8FAF9] text-[#172B25] hover:bg-[#E8F5EE] hover:text-[#16845B]"
                        }`}
                      >
                        Subscribe to {plan.name} →
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Comparison Table */}
            <div className="mt-12 rounded-3xl border border-[#E5EBE7] bg-white overflow-hidden shadow-2xs">
              <div className="p-5 border-b border-[#E5EBE7] bg-[#F8FAF9]">
                <h3 className="font-extrabold text-sm text-[#172B25]">Detailed Feature Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9]/50">
                      <th className="p-3.5 font-bold text-[#718078]">Capability</th>
                      <th className="p-3.5 font-bold text-[#172B25] text-center">{starterPlan.name} (₹{starterPlan.priceMonthly})</th>
                      <th className="p-3.5 font-bold text-[#16845B] text-center">{growthPlan.name} (₹{growthPlan.priceMonthly})</th>
                      <th className="p-3.5 font-bold text-[#172B25] text-center">{businessPlan.name} (₹{businessPlan.priceMonthly})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EBE7]">
                    {pricingComparison.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-[#F8FAF9]/50">
                        <td className="p-3.5 font-semibold text-[#172B25]">{row.feature}</td>
                        {row.values.map((v, idx) => (
                          <td key={idx} className="p-3.5 text-center">
                            {typeof v === "boolean" ? (
                              v ? (
                                <Check className="h-4 w-4 text-[#16845B] mx-auto font-bold" />
                              ) : (
                                <span className="text-[#A0ACA5]">—</span>
                              )
                            ) : (
                              <span className="font-bold text-[#172B25]">{v}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 17: FREQUENTLY ASKED QUESTIONS                    */}
        {/* ========================================================= */}
        <section className="py-16 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">FREQUENT QUESTIONS</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Everything You Need to Know
              </h2>
              <p className="mt-2 text-sm text-[#718078]">
                Direct answers to common questions about hardware, GST compliance, and operations.
              </p>
            </div>

            <div className="mt-12 max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-2">
                  <h4 className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>{faq.q}</span>
                  </h4>
                  <p className="text-xs text-[#718078] leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 18: SECURITY & COMPLIANCE                         */}
        {/* ========================================================= */}
        <section className="py-12 bg-[#F8FAF9] border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="p-8 rounded-3xl bg-white border border-[#E5EBE7] grid sm:grid-cols-4 gap-6 text-center">
              <div>
                <ShieldCheck className="h-8 w-8 text-[#16845B] mx-auto mb-2" />
                <h4 className="text-xs font-bold text-[#172B25]">Tenant Isolation</h4>
                <p className="text-[11px] text-[#718078] mt-1">Strict database row isolation per restaurant entity.</p>
              </div>
              <div>
                <Receipt className="h-8 w-8 text-[#16845B] mx-auto mb-2" />
                <h4 className="text-xs font-bold text-[#172B25]">Paise Integer Math</h4>
                <p className="text-[11px] text-[#718078] mt-1">Zero floating point discrepancies on tax calculations.</p>
              </div>
              <div>
                <CreditCard className="h-8 w-8 text-[#16845B] mx-auto mb-2" />
                <h4 className="text-xs font-bold text-[#172B25]">HMAC Payment Security</h4>
                <p className="text-[11px] text-[#718078] mt-1">Cryptographically verified Razorpay webhooks.</p>
              </div>
              <div>
                <Layers className="h-8 w-8 text-[#16845B] mx-auto mb-2" />
                <h4 className="text-xs font-bold text-[#172B25]">Audit Logged</h4>
                <p className="text-[11px] text-[#718078] mt-1">Immutable ledger for all bill voiding & staff edits.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA & Public Contact Banner */}
        <section className="py-16 bg-[#16845B] text-white" id="contact">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-black">Ready to Modernize Your Restaurant Operations?</h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-white/85 leading-relaxed">
              Join modern restaurants, cafes, and QSRs running high-speed billing, tableside QR ordering, and paperless WhatsApp invoices.
            </p>
            <div className="pt-1 flex flex-wrap justify-center gap-3">
              <Link href="/get-started">
                <button className="rounded-full bg-white text-[#16845B] px-8 py-3 text-xs font-black hover:bg-[#F8FAF9] shadow-sm transition cursor-pointer">
                  Create Restaurant Workspace →
                </button>
              </Link>
              <Link href="/contact">
                <button className="rounded-full border border-white/30 bg-white/10 text-white px-7 py-3 text-xs font-bold hover:bg-white/20 transition cursor-pointer">
                  Contact Sales
                </button>
              </Link>
            </div>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-white/95">
              <a
                href={brand.contact.telUrl}
                className="inline-flex items-center gap-1.5 hover:underline font-semibold"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{brand.contact.phone}</span>
              </a>
              <span className="text-white/40">•</span>
              <a
                href={brand.contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:underline font-semibold"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp: {brand.contact.whatsapp}</span>
              </a>
              <span className="text-white/40">•</span>
              <a
                href={brand.contact.mailtoUrl}
                className="inline-flex items-center gap-1.5 hover:underline font-semibold"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{brand.contact.email}</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
