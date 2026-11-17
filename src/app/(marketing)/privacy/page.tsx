import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { brand } from "@/lib/brand";
import { ShieldCheck, Lock, Database, UserCheck, FileCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Data Protection & Privacy Practices",
  description:
    "RestroNex Privacy Policy: Learn how we collect, protect, and manage restaurant and transaction data with strict multi-tenant isolation and Indian DPDP compliance.",
  alternates: {
    canonical: "https://www.restronexpos.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy | RestroNex",
    description: "Learn how RestroNex protects restaurant operational and transaction data.",
    url: "https://www.restronexpos.com/privacy",
  },
};

export default function Privacy() {
  return (
    <PageShell
      title="Privacy Policy"
      subtitle="Last updated: November 2026 — Transparent data protection, tenant isolation, and your data rights."
      badge="Legal & Privacy • DPDPA & IT Act Compliant"
    >
      <div className="max-w-4xl mx-auto space-y-6 text-sm leading-relaxed text-[#718078]">
        {/* Section 1 */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#16845B]" /> 1. Commitment to Privacy
          </h2>
          <p>
            <b>RestroNex</b> respects the privacy of restaurant operators, their staff, and their dining customers. This Privacy Policy outlines our data handling practices for our cloud restaurant operating system accessible via <b>https://www.restronexpos.com</b>.
          </p>
          <p>
            We adhere to the provisions of the <b>Information Technology Act, 2000</b>, the <b>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</b>, and the principles of the <b>Digital Personal Data Protection Act, 2023 (DPDPA)</b>.
          </p>
        </div>

        {/* Section 2 */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <Database className="h-5 w-5 text-[#16845B]" /> 2. Information We Collect
          </h2>
          <p>We collect only information necessary to deliver and operate restaurant SaaS services:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-[#4A5D55]">
            <li><b>Account &amp; Restaurant Details:</b> Restaurant business name, owner name, email address, mobile number, outlet locations, and GST identification number (GSTIN).</li>
            <li><b>Operational Data:</b> Menu categories, dishes, variants, modifiers, recipe Bill-of-Materials (BOM), raw ingredients, purchase orders, and supplier directory.</li>
            <li><b>Transaction &amp; Order Ledgers:</b> Dine-in, takeaway, and delivery orders, itemized pricing, tax breakdowns (CGST/SGST), payment modes, and order timestamps.</li>
            <li><b>Customer CRM Data:</b> Guest phone numbers and names entered for billing or table QR orders with customer consent for receipt delivery.</li>
            <li><b>Technical &amp; Hardware Telemetry:</b> Printer connection statuses (ESC/POS LAN/Bluetooth), KDS device logs, and system error events for diagnostic troubleshooting.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#16845B]" /> 3. Payment Information &amp; PCI-DSS Security
          </h2>
          <p>
            Subscription payments for RestroNex are processed through <b>Razorpay</b>, a PCI-DSS Level 1 certified payment aggregator.
          </p>
          <p>
            RestroNex <b>never stores or handles raw credit/debit card numbers, CVVs, or net banking passwords</b> on our servers. We store only anonymized transaction reference IDs, subscription activation tokens, and payment timestamps required for GST invoice generation and audit reconciliation.
          </p>
        </div>

        {/* Section 4 */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-[#16845B]" /> 4. Data Usage &amp; Multi-Tenant Isolation
          </h2>
          <p>
            <b>Strict Multi-Tenant Separation:</b> Each restaurant operates in an isolated tenant scope. Our database architecture enforces tenant-level access control on every query. Staff or owners of one restaurant can never view or query another restaurant&apos;s data.
          </p>
          <p>
            <b>No Data Monetization:</b> We do not sell, rent, or trade your restaurant data, customer contacts, or sales histories to third-party advertisers or data brokers.
          </p>
          <p>
            <b>WhatsApp Invoicing:</b> If you enable automated WhatsApp receipts, customer phone numbers and itemized bill summaries are passed via encrypted TLS to the official Meta WhatsApp Business Cloud API exclusively for receipt delivery.
          </p>
        </div>

        {/* Section 5 */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25] flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#16845B]" /> 5. Your Data Rights
          </h2>
          <p>Under Indian data protection frameworks, you and your restaurant have the right to:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-[#4A5D55]">
            <li><b>Access:</b> Request a complete copy of your stored restaurant master data and sales logs.</li>
            <li><b>Correction:</b> Update or rectify incorrect menu, tax, outlet, or staff information directly via the dashboard or support.</li>
            <li><b>Data Export:</b> Export your full sales, menu, and inventory reports in CSV or Excel format at any time.</li>
            <li><b>Erasure:</b> Request permanent deletion of your restaurant organization and personal data upon subscription termination.</li>
          </ul>
        </div>

        {/* Section 6 */}
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#172B25]">6. Grievance Redressal &amp; Privacy Contact</h2>
          <p>
            In accordance with Information Technology Rules, for any privacy concerns, data subject requests, or security inquiries, please contact our designated Grievance Officer:
          </p>
          <div className="text-xs text-[#4A5D55] space-y-1 pt-1">
            <div><b>Designated Officer:</b> RestroNex Privacy &amp; Security Desk</div>
            <div><b>Email:</b> <a href={brand.contact.mailtoUrl} className="text-[#16845B] hover:underline">{brand.contact.supportEmail}</a></div>
            <div><b>Phone / WhatsApp:</b> <a href={brand.contact.telUrl} className="text-[#16845B] hover:underline">{brand.contact.phone}</a></div>
            <div><b>Postal Address:</b> {brand.contact.address}</div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
