import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import TrustMetricsSection from "@/components/marketing/TrustMetricsSection";
import IndustryRatingsSection from "@/components/marketing/IndustryRatingsSection";
import Link from "next/link";
import {
  Receipt,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Store,
  Layers,
  Calculator,
  Barcode,
  Truck,
  HelpCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "GST Billing & Invoicing Software for Food & Retail | RestroNex",
  description:
    "Generate 100% compliant GST tax invoices, track raw & packaged inventory, export Tally/Zoho reports, and automate WhatsApp receipts with RestroNex.",
  alternates: {
    canonical: "https://www.restronexpos.com/invoice",
  },
  openGraph: {
    title: "GST Billing & Invoicing Software for Food & Retail | RestroNex",
    description: "Streamline counter billing, minor-unit GST tax calculations, and real-time inventory management.",
    url: "https://www.restronexpos.com/invoice",
  },
};

export default function InvoicePage() {
  const strengths = [
    {
      icon: Calculator,
      tag: "GST Compliance",
      title: "Automated GST Invoicing",
      desc: "Accurate, automated tax calculations on every receipt. Strict minor-unit paise arithmetic prevents rounding discrepancies across 5%, 12%, and 18% tax slabs.",
      points: [
        "CGST + SGST or IGST bifurcation",
        "B2B GSTIN capture with buyer state code validation",
        "E-Way bill & digital tax receipt export",
      ],
    },
    {
      icon: Barcode,
      tag: "Stock Control",
      title: "Centralized Live Inventory Management",
      desc: "Monitor raw materials, commissary batches, and packaged retail items in real time. Barcode scanner support speeds up counter sales.",
      points: [
        "Item-level barcode & SKU scanning",
        "Automated low-stock threshold alerts",
        "Wastage and return tracking with audit log",
      ],
    },
    {
      icon: FileSpreadsheet,
      tag: "Actionable Insights",
      title: "Business Intelligence & P&L Reports",
      desc: "Turn transactional data into clear business insights. Review gross margins, fast and slow-moving dishes, and day-end cash ledgers in seconds.",
      points: [
        "Exportable Excel, CSV & PDF tax reports for your CA",
        "Product & category sales margin analysis",
        "Day-end cashier cash drawer reconciliation",
      ],
    },
    {
      icon: Layers,
      tag: "Accounting Integration",
      title: "Accounting & Ledger Sync",
      desc: "Seamlessly export data to industry-standard accounting suites like Tally Prime, Zoho Books, and SAP to save hours of manual bookkeeping.",
      points: [
        "One-click Tally XML & Excel sync",
        "Petty cash and vendor payable ledgers",
        "Multi-outlet consolidated tax summaries",
      ],
    },
  ];

  const businessTypes = [
    { name: "Restaurant Counters", desc: "High-speed dine-in and parcel billing with modifier support." },
    { name: "Bakeries & Confectionery", desc: "Batch expiry tracking, pre-orders, and custom cake bills." },
    { name: "Cafes & Roasteries", desc: "Fast coffee counter checkout with loyalty and digital payments." },
    { name: "Gourmet Food Stores", desc: "Barcode scanning, packaged SKU inventory, and MRP pricing." },
    { name: "Sweet Shops & Mithai", desc: "Weight-scale integration, kg/gram minor-unit calculations." },
    { name: "Commissaries & Hubs", desc: "Inter-branch stock transfer notes and central supplier purchase orders." },
  ];

  const faqs = [
    {
      q: "Does RestroNex support B2B invoices with customer GSTIN?",
      a: "Yes. RestroNex allows cashiers to enter customer GSTIN, legal business name, and billing address. The system automatically computes CGST/SGST for intra-state or IGST for inter-state billing.",
    },
    {
      q: "Can I print invoices on thermal printers as well as A4 sheets?",
      a: "Yes. Invoices can be printed on standard 80mm and 58mm thermal receipt rolls or exported as full-page A4 PDF tax invoices suitable for commercial clients.",
    },
    {
      q: "Can I send digital GST invoices via WhatsApp?",
      a: "Yes. RestroNex connects to the official Meta WhatsApp Cloud API to deliver itemized digital tax receipts with PDF download links directly to customer mobile numbers upon settlement.",
    },
    {
      q: "How does Tally Prime and accounting export work?",
      a: "RestroNex provides one-click export files formatted specifically for Tally Prime, Zoho Books, and Excel ledgers, eliminating double-entry bookkeeping.",
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
                  <span>GST INVOICING • INVENTORY • RETAIL POS</span>
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] lg:text-[56px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Lightning-Fast <br />
                  <span className="text-[#16845B]">GST Billing Software</span>
                </h1>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#718078] max-w-xl">
                  Streamline your counter billing process, automate GST tax calculations, and keep track of live inventory. RestroNex Invoice OS delivers error-free transactions every service hour.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#16845B] hover:bg-[#116B49] px-7 py-3.5 text-sm font-bold text-white shadow-xs transition flex items-center gap-2 cursor-pointer">
                      <span>Take a Free Demo</span>
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
                    <span>Minor-Unit Paise Math</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
                    <span>B2B & B2C Ready</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
                    <span>Tally Export</span>
                  </div>
                </div>
              </div>

              {/* Realistic GST Invoice Preview Card */}
              <div className="rounded-[28px] border border-[#E5EBE7] bg-white p-6 shadow-xl">
                <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3 text-xs">
                  <div>
                    <span className="font-extrabold text-[#172B25]">TAX INVOICE</span>
                    <span className="text-[#718078] ml-2">#INV-2026-8941</span>
                  </div>
                  <span className="bg-[#E8F5EE] text-[#16845B] px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    PAID • UPI QR
                  </span>
                </div>

                <div className="mt-3 text-[11px] text-[#718078] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Seller: <strong>RestroNex Hospitality Ltd.</strong></span>
                    <span>Date: 22 Nov 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GSTIN: 27AABCU9603R1ZM</span>
                    <span>State: Maharashtra (27)</span>
                  </div>
                  <div className="text-[10px] text-[#16845B] pt-1">
                    Buyer: Blue Horizon Gourmet LLC (GSTIN: 27AAACB2211D1Z8)
                  </div>
                </div>

                <div className="mt-3 border-t border-b border-[#E5EBE7] py-2 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-[#718078] text-[10px] uppercase">
                    <span>Item & HSN</span>
                    <span>Qty</span>
                    <span>Rate</span>
                    <span>Tax (18%)</span>
                    <span>Total</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#172B25]">Artisanal Sourdough Loaf</div>
                      <div className="text-[10px] text-[#718078]">HSN: 1905 • Batch #B42</div>
                    </div>
                    <span className="font-mono">4</span>
                    <span className="font-mono">₹250</span>
                    <span className="font-mono text-[#718078]">₹180</span>
                    <span className="font-mono font-bold text-[#172B25]">₹1,180.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#172B25]">Roasted Arabica Coffee (250g)</div>
                      <div className="text-[10px] text-[#718078]">HSN: 0901 • Fresh Roast</div>
                    </div>
                    <span className="font-mono">2</span>
                    <span className="font-mono">₹450</span>
                    <span className="font-mono text-[#718078]">₹162</span>
                    <span className="font-mono font-bold text-[#172B25]">₹1,062.00</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-[#718078]">
                    <span>Taxable Value</span>
                    <span className="font-mono font-semibold">₹1,900.00</span>
                  </div>
                  <div className="flex justify-between text-[#718078]">
                    <span>CGST (9%)</span>
                    <span className="font-mono font-semibold">₹171.00</span>
                  </div>
                  <div className="flex justify-between text-[#718078]">
                    <span>SGST (9%)</span>
                    <span className="font-mono font-semibold">₹171.00</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E5EBE7] pt-2 font-black text-sm text-[#16845B]">
                    <span>Total Invoice Amount</span>
                    <span className="font-mono">₹2,242.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* TRUST METRICS                                             */}
        {/* ========================================================= */}
        <TrustMetricsSection />

        {/* ========================================================= */}
        {/* 4 CORE CAPABILITIES                                       */}
        {/* ========================================================= */}
        <section className="py-20 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
                PROVEN STRENGTHS
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#172B25] tracking-tight">
                Simplify Your Finances, Amplify Your Business
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#718078] leading-relaxed">
                Easy, efficient, and audit-ready retail POS billing software built to keep your compliance 100% stress-free.
              </p>
            </div>

            <div className="mt-14 grid md:grid-cols-2 gap-8">
              {strengths.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-8 rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-12 w-12 rounded-2xl bg-[#E8F5EE] text-[#16845B] flex items-center justify-center mb-5">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#16845B]">
                        {item.tag}
                      </span>
                      <h3 className="text-xl font-bold text-[#172B25] mt-1.5">{item.title}</h3>
                      <p className="text-sm text-[#718078] mt-3 leading-relaxed">{item.desc}</p>
                      <div className="mt-5 space-y-2 pt-4 border-t border-[#E5EBE7]">
                        {item.points.map((pt, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2.5 text-xs font-medium text-[#172B25]">
                            <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* FORMATS SUPPORTED                                         */}
        {/* ========================================================= */}
        <section className="py-20 bg-[#F8FAF9] border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">VERSATILE COMMERCE</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Built for Food Service, Bakeries & Retail Outlets
              </h2>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessTypes.map((b, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-white border border-[#E5EBE7] shadow-2xs space-y-2">
                  <Store className="h-6 w-6 text-[#16845B]" />
                  <h3 className="text-base font-bold text-[#172B25]">{b.name}</h3>
                  <p className="text-xs text-[#718078] leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* INDUSTRY RATINGS                                          */}
        {/* ========================================================= */}
        <IndustryRatingsSection />

        {/* ========================================================= */}
        {/* FAQS                                                      */}
        {/* ========================================================= */}
        <section className="py-16 bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">INVOICE & GST FAQS</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="mt-10 max-w-3xl mx-auto space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="p-5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-2">
                  <h4 className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>{f.q}</span>
                  </h4>
                  <p className="text-xs text-[#718078] leading-relaxed pl-6">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[#16845B] text-white text-center">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 space-y-5">
            <h2 className="text-2xl sm:text-3xl font-black">
              Ready to Simplify Your GST Billing and Invoicing?
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-white/85 leading-relaxed">
              Join thousands of Indian businesses generating compliant GST tax invoices in 3 clicks.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link href="/get-started">
                <button className="rounded-full bg-white text-[#16845B] px-8 py-3 text-xs font-black hover:bg-[#F8FAF9] shadow-sm transition cursor-pointer">
                  Start Free Trial →
                </button>
              </Link>
              <Link href="/contact">
                <button className="rounded-full border border-white/30 bg-white/10 text-white px-7 py-3 text-xs font-bold hover:bg-white/20 transition cursor-pointer">
                  Contact Sales Team
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
