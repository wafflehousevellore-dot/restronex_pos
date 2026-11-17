import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protect your restaurant revenue with strict server-enforced role-based access control.",
  description: "Protect your restaurant revenue with strict server-enforced role-based access control. Built for restaurants, cafes, and food businesses across India.",
  alternates: {
    canonical: "https://www.restronexpos.com/features/staff-management",
  },
  openGraph: {
    title: "Protect your restaurant revenue with strict server-enforced role-based access control. | RestroNex",
    description: "Protect your restaurant revenue with strict server-enforced role-based access control. Built for restaurants, cafes, and food businesses across India.",
    url: "https://www.restronexpos.com/features/staff-management",
  },
};

import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { Users, Check, ArrowRight, Lock } from "lucide-react";

export default function StaffManagementPage() {
  const roles = [
    { name: "Restaurant Owner", rights: "Complete access across all outlets, P&L reports, pricing plans, billing settings, and platform integrations." },
    { name: "Head Office Director", rights: "Central menu synchronization, cross-outlet sales audits, consolidated chain analytics, and supplier price negotiation." },
    { name: "Outlet General Manager", rights: "Assigned outlet operations: staff shifts, floor tables, daily day-end register closure, and local inventory stock-in." },
    { name: "Cashier / Counter Operator", rights: "Counter order punching, payment settlement, split bills, receipt printing, and individual cashier register reconciliation." },
    { name: "Head Chef / Kitchen Staff", rights: "Kitchen Display (KDS) stations, KOT bump management, preparation times, and recipe ingredient 86ing." },
    { name: "Floor Waiter / Steward", rights: "Handheld tableside ordering, table status inspection, and KOT dispatch to kitchen without discount authority." },
  ];

  return (
    <PageShell
      title="Staff Roles & Granular Permissions"
      subtitle="Protect your restaurant revenue with strict server-enforced role-based access control."
      badge="Security & Governance • RestroNex"
    >
      <div className="space-y-10">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 text-[#16845B] font-bold text-sm mb-3">
            <Users className="h-5 w-5" />
            <span>Role-Based Access Control (RBAC)</span>
          </div>
          <h2 className="text-xl font-bold text-[#172B25]">No Unauthorized Voids, Discounts, or Metric Leaks</h2>
          <p className="mt-2 text-sm text-[#718078] leading-relaxed max-w-3xl">
            Restaurants lose thousands every month to unauthorized discounts, unrecorded item voids, and cash register shrinkage. RestroNex enforces strict server-side permissions for every action.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => (
              <div key={r.name} className="p-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#172B25]">{r.name}</span>
                  <span className="p-1 rounded-full bg-[#E8F5EE] text-[#16845B]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="text-xs text-[#718078] leading-relaxed">{r.rights}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#E8F5EE] text-[#16845B] shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#172B25]">Cashier Shift Register Auditing</h3>
              <p className="text-xs text-[#718078] mt-1">
                Cashiers must open a shift with starting float amount and close with physical cash counts. Any discrepancy is instantly flagged in the owner dashboard.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-[#172B25]">Secure Multi-Outlet Team Scaling</h3>
              <p className="text-xs text-[#718078] mt-1">
                Add stewards and cashiers to specific outlets without risking cross-branch data access.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="rounded-full bg-[#16845B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#116B49] transition shadow-xs whitespace-nowrap inline-flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
