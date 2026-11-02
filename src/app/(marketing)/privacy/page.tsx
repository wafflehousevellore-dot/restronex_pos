import { PageShell } from "@/components/marketing/PageShell";

export default function Privacy() {
  return (
    <PageShell
      title="Privacy Policy"
      subtitle="Last updated: Oct 2025 — Your data, your control."
      badge="Legal • Privacy"
    >
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
        <div className="space-y-4 text-sm leading-relaxed text-[#718078]">
          <p>
            RestroNex respects your privacy. We collect only data needed to provide restaurant management services: business info, user accounts, orders, inventory, and support enquiries.
          </p>
          <p>
            Tenant data is isolated. We do not sell personal data. Customer CRM data is access-controlled and requires consent for marketing. You can request export or deletion via support@restronex.app.
          </p>
          <p>
            Payments are processed via Razorpay; we store only references and entitlement state, never card numbers. Webhook signatures are verified.
          </p>
          <p>
            Logs retain action, entity, and metadata for audit. Backups and retention are documented in our security and operations runbook.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
