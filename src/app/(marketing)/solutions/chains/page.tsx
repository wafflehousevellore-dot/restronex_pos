import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Run 5 to 50+ branches with central menu distribution, consolidated analytics, and commissary transfers.",
  description: "Run 5 to 50+ branches with central menu distribution, consolidated analytics, and commissary transfers. Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/solutions/chains",
  },
  openGraph: {
    title: "Run 5 to 50+ branches with central menu distribution, consolidated analytics, and commissary transfers. | RestroNex",
    description: "Run 5 to 50+ branches with central menu distribution, consolidated analytics, and commissary transfers. Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/solutions/chains",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import { Building2, Check, BarChart3, Network } from "lucide-react";

export default function ChainsSolutionPage() {
  const highlights = [
    { title: "Centralized Menu & Category Push", desc: "Create new seasonal dishes, combo deals, and tax brackets at Head Office and push them across 5, 20, or 50 outlets in seconds." },
    { title: "Cross-Outlet Sales & P&L Benchmarking", desc: "Compare gross revenue, average ticket sizes, table occupancy rates, and discounts across branches in a unified executive dashboard." },
    { title: "Inter-Branch Stock Transfers & Indents", desc: "Transfer raw ingredients between central commissary kitchens and branch outlets with digital dispatch and receipt tracking." },
    { title: "Centralized Vendor Procurement", desc: "Negotiate bulk commodity rates across all branches and lock in standardized supplier pricing per region." },
    { title: "Role-Isolated Outlet Management", desc: "Branch managers and cashiers only see data for their specific outlet, while CXOs and auditors access consolidated multi-branch views." },
    { title: "Multi-GST & Region-Specific Taxation", desc: "Configure different state GSTINs, local municipal levies, and outlet receipt headers for outlets operating across multiple states." },
  ];

  return (
    <PageShell
      title="POS & Operations For Multi-Outlet Restaurant Chains"
      subtitle="Run 5 to 50+ branches with central menu distribution, consolidated analytics, and commissary transfers."
      badge="Enterprise Chain Architecture • RestroNex"
    >
      <div className="space-y-10">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 text-[#16845B] font-bold text-sm mb-3">
            <Building2 className="h-5 w-5" />
            <span>Scale Without Operational Chaos</span>
          </div>
          <h2 className="text-xl font-bold text-[#172B25]">Designed for Multi-Branch Franchises & Growing Restaurant Groups</h2>
          <p className="mt-2 text-sm text-[#718078] leading-relaxed max-w-3xl">
            Opening your 2nd, 5th, or 20th outlet should not mean managing disconnected spreadsheets and fragmented billing tools. RestroNex provides a single tenant architecture with outlet-level partitioning.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {highlights.map((h) => (
              <div key={h.title} className="p-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-[#172B25]">
                  <Check className="h-4 w-4 text-[#16845B] shrink-0" />
                  <span>{h.title}</span>
                </div>
                <p className="text-xs text-[#718078] leading-relaxed pl-6">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#E8F5EE] text-[#16845B] shrink-0">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#172B25]">Consolidated P&L Reporting</h3>
              <p className="text-xs text-[#718078] mt-1">
                View group-level GMV, total GST liability, and outlet-by-outlet sales performance in a single consolidated report.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#E8F5EE] text-[#16845B] shrink-0">
              <Network className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#172B25]">Commissary & Central Kitchen</h3>
              <p className="text-xs text-[#718078] mt-1">
                Produce semi-finished sauces, gravies, and bakery bases centrally and track stock indents dispatched to retail outlets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
