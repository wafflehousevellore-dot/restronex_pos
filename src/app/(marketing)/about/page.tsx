import type { Metadata } from "next";
import Image from "next/image";
import { PageShell } from "@/components/marketing/PageShell";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About Us — Architecture, Principles & Mission",
  description:
    "Learn about RestroNex: our mission, server-side multi-tenant architecture, paise-accurate billing math, and engineering principles designed for Indian restaurants.",
  alternates: {
    canonical: "https://www.restronexpos.com/about",
  },
  openGraph: {
    title: "About RestroNex — Architecture & Engineering Principles",
    description:
      "Original restaurant POS SaaS built for India: paise-precision billing, real-time KOT/KDS routing, and cryptographic multi-tenant isolation.",
    url: "https://www.restronexpos.com/about",
  },
};

export default function About() {
  return (
    <PageShell
      title="About RestroNex"
      subtitle="Modern restaurant technology crafted for India — secure, fast, paise-accurate, and operator-obsessed."
      badge="Engineering & Architecture • Made for India"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="space-y-4 text-sm leading-relaxed text-[#718078]">
            <p>
              <strong className="text-[#172B25] font-semibold">RestroNex</strong> is a modern restaurant operating system — multi-tenant, outlet-aware, and tenant-isolated by design. We provide comprehensive operational tooling spanning touch billing, kitchen display systems, recipe-level inventory tracking, table QR ordering, and automated WhatsApp invoices.
            </p>
            <p>
              We prioritize billing accuracy (strict minor-unit paise integer arithmetic), inventory integrity (movement history with raw-ingredient depletion, not just end-of-day guesses), and operational clarity (honest KOT/KDS status updates).
            </p>
            <p>
              Platform administration, restaurant owner, and station staff roles are segregated by strict server-side authorization. Tenant isolation is enforced at the database query level and continuously verified with security tests.
            </p>
            <div className="pt-3 border-t border-[#E5EBE7] text-xs space-y-1">
              <div className="font-bold text-[#172B25]">Registered Location</div>
              <div>{brand.contact.address}</div>
              <div className="text-[#16845B] font-medium pt-1">
                Direct Contact: {brand.contact.phone} • {brand.contact.supportEmail}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="text-base font-bold text-[#172B25]">Core Engineering Principles</div>
          <ul className="mt-4 space-y-2.5 text-sm text-[#718078]">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>One menu: single source of truth across counter, tables, and online channels</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Financial transactions computed in minor units (paise) with zero rounding error</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Tenant ID never trusted from client input; resolved server-side from auth token</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Cryptographic audit trail for critical financial and administrative operations</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Honest hardware status (LAN, USB, and Bluetooth ESC/POS printers)</span>
            </li>
          </ul>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 p-4 text-center">
              <div className="text-2xl font-black text-[#16845B]">100%</div>
              <div className="text-xs font-medium text-[#718078] mt-1">Tenant Isolated</div>
            </div>
            <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-4 text-center">
              <div className="text-2xl font-black text-[#172B25]">Paise-Exact</div>
              <div className="text-xs font-medium text-[#718078] mt-1">GST & Tax Arithmetic</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white overflow-hidden shadow-xs">
          <div className="relative aspect-[16/10] w-full bg-[#F8FAF9] border-b border-[#E5EBE7]">
            <Image
              src="/images/pos-billing-terminal.jpg"
              alt="RestroNex POS touch counter terminal and thermal receipt printer"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="p-4 text-xs">
            <div className="font-bold text-[#172B25]">Touch Counter Billing &amp; Thermal Printing</div>
            <div className="text-[#718078] mt-1">Built for speed, 80mm/58mm ESC/POS hardware, and instant WhatsApp receipts.</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5EBE7] bg-white overflow-hidden shadow-xs">
          <div className="relative aspect-[16/10] w-full bg-[#F8FAF9] border-b border-[#E5EBE7]">
            <Image
              src="/images/analytics-inventory-dashboard.jpg"
              alt="RestroNex Multi-Outlet Analytics and Inventory Dashboard"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="p-4 text-xs">
            <div className="font-bold text-[#172B25]">Real-Time Multi-Outlet Visibility</div>
            <div className="text-[#718078] mt-1">Live sales telemetry, low-stock recipe alerts, and consolidated owner reporting.</div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
