import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Control food costs with vendor price comparisons, structured POs, and digital goods receipt.",
  description: "Control food costs with vendor price comparisons, structured POs, and digital goods receipt. Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/purchase-management",
  },
  openGraph: {
    title: "Control food costs with vendor price comparisons, structured POs, and digital goods receipt. | RestroNex",
    description: "Control food costs with vendor price comparisons, structured POs, and digital goods receipt. Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/features/purchase-management",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { ShoppingCart, Check, ArrowRight, ShieldCheck, TrendingDown } from "lucide-react";

export default function PurchaseManagementPage() {
  const capabilities = [
    { title: "Supplier Price Comparison Ledger", desc: "Compare unit prices across vendor quotes to lock in the lowest ingredient costs across vegetables, dairy, poultry, and dry staples." },
    { title: "Digital Purchase Order (PO) Lifecycle", desc: "Generate official POs in Draft, Approved, Sent, and Received states with supplier contact details and expected fulfillment dates." },
    { title: "Goods Received Note (GRN) Verification", desc: "Verify deliveries against PO specifications upon delivery. Automatically flag discrepancies in quantity, weight, or damaged stock." },
    { title: "Automated Stock Level Top-Up", desc: "Stock movements automatically increment current inventory levels upon GRN confirmation without manual double entry." },
    { title: "Direct Expense Ledger Recording", desc: "Approved purchase invoices immediately feed into the outlet's daily expense log and day-end net profitability calculations." },
    { title: "Vendor Payment Status Tracking", desc: "Track paid vs outstanding vendor balances with reference IDs to keep supplier relationships healthy and credit terms intact." },
  ];

  const workflow = [
    "Identify low stock items via automated reorder threshold alerts",
    "Compare active supplier prices for key items in the procurement ledger",
    "Issue Purchase Order (PO) to chosen supplier with quantities & locked unit prices",
    "Inspect shipment upon arrival & generate digital Goods Received Note (GRN)",
    "Inventory counts automatically increment & bill amounts post to daily expense report",
  ];

  return (
    <PageShell
      title="Purchase & Supplier Management"
      subtitle="Control food costs with vendor price comparisons, structured POs, and digital goods receipt."
      badge="Procurement • RestroNex"
    >
      <div className="space-y-10">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-[#16845B] font-bold text-sm mb-3">
              <ShoppingCart className="h-5 w-5" />
              <span>Procurement & Food Cost Control</span>
            </div>
            <h2 className="text-xl font-bold text-[#172B25]">Stop Ingredient Overspending Before It Reaches Your Kitchen</h2>
            <p className="mt-2 text-sm text-[#718078] leading-relaxed">
              Ingredient price fluctuations can erode restaurant margins quickly. RestroNex gives chefs and purchase managers a clear historical price comparison tool and traceable PO verification system.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {capabilities.map((c) => (
                <div key={c.title} className="p-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#172B25]">
                    <Check className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>{c.title}</span>
                  </div>
                  <p className="text-xs text-[#718078] leading-relaxed pl-6">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#16845B] font-bold text-xs uppercase tracking-wider mb-2">
                <TrendingDown className="h-4 w-4" /> Traceable Flow
              </div>
              <h3 className="text-lg font-bold text-[#172B25]">From Reorder Alert to Stock Entry</h3>
              <ol className="mt-5 space-y-3 pl-2">
                {workflow.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-[#718078]">
                    <span className="h-6 w-6 rounded-full bg-[#E8F5EE] text-[#16845B] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E5EBE7] space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#16845B] font-semibold">
                <ShieldCheck className="h-4 w-4" /> Minor-Unit Paise Arithmetic Eliminates Rounding Discrepancies
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs inline-flex items-center gap-1.5"
                >
                  Start Free Setup <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
