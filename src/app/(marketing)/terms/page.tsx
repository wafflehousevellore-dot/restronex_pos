import { PageShell } from "@/components/marketing/PageShell";

export default function Terms() {
  return (
    <PageShell
      title="Terms of Service"
      subtitle="Please read carefully — fair, transparent, operator-friendly."
      badge="Legal • Terms"
    >
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
        <div className="space-y-4 text-sm leading-relaxed text-[#718078]">
          <p>
            By using RestroNex you agree to our subscription, billing, and fair-use terms. Trials convert per plan rules. Failed payments may restrict features; entitlements are gated server-side.
          </p>
          <p>
            You are responsible for accurate tax configuration and menu pricing. RestroNex provides tooling, not legal tax advice.
          </p>
          <p>
            Service is provided with high availability SLA. Audit logs and tenant isolation are cryptographically enforced. Abuse, scraping, or cross-tenant probing is strictly prohibited.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
