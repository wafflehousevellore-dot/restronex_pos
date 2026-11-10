import Image from "next/image";
import { PageShell } from "@/components/marketing/PageShell";
import { brand } from "@/lib/brand";

export default function About() {
  return (
    <PageShell
      title="About RestroNex"
      subtitle="Restaurant technology crafted for India's scale — secure, fast, and operator-obsessed."
      badge="Our Story • Since 2020"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="space-y-4 text-sm leading-relaxed text-[#718078]">
            <p>
              <strong className="text-[#172B25] font-semibold">RestroNex</strong> is an original restaurant POS SaaS — multi-tenant, outlet-aware, and tenant-isolated by design. We benchmark feature coverage against leading platforms but ship original branding, UI, and content.
            </p>
            <p>
              We prioritize billing accuracy (paise integer math), inventory integrity (movement history, not just totals), and operational clarity (KOT/KDS with honest connectivity states).
            </p>
            <p>
              Platform admin and restaurant roles are separate. Tenant isolation is enforced server-side and verified via cross-tenant security probes.
            </p>
            <div className="pt-3 border-t border-[#E5EBE7] text-xs space-y-1">
              <div className="font-bold text-[#172B25]">Headquarters</div>
              <div>{brand.contact.address}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="text-base font-bold text-[#172B25]">Core Principles</div>
          <ul className="mt-4 space-y-2.5 text-sm text-[#718078]">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>One menu, single source of truth across aggregators</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Financial transactions computed in minor units (paise)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Tenant ID never trusted from client input</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Full cryptographic audit trail for sensitive operations</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <span>Honest integration and sync state visibility</span>
            </li>
          </ul>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 p-4 text-center">
              <div className="text-2xl font-black text-[#16845B]">2,400+</div>
              <div className="text-xs font-medium text-[#718078] mt-1">Active Outlets</div>
            </div>
            <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-4 text-center">
              <div className="text-2xl font-black text-[#172B25]">500k+</div>
              <div className="text-xs font-medium text-[#718078] mt-1">Orders / month</div>
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
