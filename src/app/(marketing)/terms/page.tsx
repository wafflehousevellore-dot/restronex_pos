import { PageShell } from "@/components/marketing/PageShell";

export default function Terms(){
  return (
    <PageShell title="Terms of Service" subtitle="Please read carefully — fair, transparent, operator-friendly." badge="Legal • Terms">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur max-w-3xl">
        <div className="space-y-4 text-sm leading-7 text-white/70">
          <p>By using RestroNex you agree to our subscription, billing, and fair-use terms. Trials convert per plan rules. Failed payments may restrict features; entitlements are gated server-side.</p>
          <p>You are responsible for accurate tax configuration and menu pricing. RestroNex provides tooling, not legal tax advice.</p>
          <p>Service is provided as-is with best-effort uptime. Audit logs and data isolation are enforced. Abuse, scraping, or cross-tenant probing is prohibited.</p>
        </div>
      </div>
    </PageShell>
  );
}
