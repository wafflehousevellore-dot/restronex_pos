import { PageShell } from "@/components/marketing/PageShell";

export default function Privacy(){
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: Oct 2025 — Your data, your control." badge="Legal • Privacy">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur max-w-3xl">
        <div className="space-y-4 text-sm leading-7 text-white/70">
          <p>RestroNex respects your privacy. We collect only data needed to provide restaurant management services: business info, user accounts, orders, inventory, and support enquiries.</p>
          <p>Tenant data is isolated. We do not sell personal data. Customer CRM data is access-controlled and requires consent for marketing. You can request export or deletion via support@restronex.app.</p>
          <p>Payments are processed via Razorpay; we store only references and entitlement state, never card numbers. Webhook signatures are verified.</p>
          <p>Logs retain action, entity, and metadata for audit. Backups and retention are documented in ops runbook.</p>
        </div>
      </div>
    </PageShell>
  );
}
